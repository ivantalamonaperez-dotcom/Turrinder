"use client";

/**
 * useWebRTC — CÁMARA PRIMERO, MATCH DESPUÉS (v2 — fixes asimétricos)
 *
 * BUGS CORREGIDOS:
 *
 * 1. Race condition asimétrica (el bug principal del reporte):
 *    El initiator esperaba 500 ms antes de enviar la offer, lo que daba tiempo
 *    para que cameraReady resolviera. El non-initiator, en cambio, recibía la
 *    signal (offer) ANTES de que llegara su match-found, y el handler de "signal"
 *    llamaba createPeer(from) sin await cameraReadyRef.current → peer sin tracks
 *    → video unidireccional.
 *    FIX: el handler de "signal" también hace `await cameraReadyRef.current`
 *    antes de crear el peer.
 *
 * 2. NotReadableError / Device in use:
 *    Si la cámara fallaba por "device in use" (otro contexto de browser),
 *    cameraInitiated quedaba en true y nunca se reintentaba.
 *    FIX: al recibir match-found, si localStream es null se reintenta initCamera
 *    una vez más (el dispositivo puede estar libre para entonces).
 *
 * 3. Cleanup del useEffect destruía peer activo en re-renders:
 *    El return del efecto llamaba closePeerConnection() incondicionalmente,
 *    matando conexiones válidas al re-montar por cambio de dependencias.
 *    FIX: el cleanup solo cancela los listeners del socket; la destrucción del
 *    peer queda en manos del efecto que observa currentRoomId → null.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

export const useWebRTC = (currentRoomId: string | null) => {
  const { socket } = useSocket();

  const localStream     = useRef<MediaStream | null>(null);
  const peer            = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef  = useRef<HTMLVideoElement | null>(null);
  const localVideoRef   = useRef<HTMLVideoElement | null>(null);

  /**
   * Promise que se resuelve cuando la cámara está lista (o ha fallado).
   * Siempre debe apuntar a la ÚLTIMA llamada a initCamera para que los
   * handlers de signal/match-found esperen la cámara real.
   */
  const cameraReadyRef  = useRef<Promise<void>>(Promise.resolve());
  const cameraInitiated = useRef(false);

  const [isConnected,    setIsConnected]    = useState(false);
  const [remoteStream,   setRemoteStream]   = useState<MediaStream | null>(null);
  const [cameraError,    setCameraError]    = useState(false);
  const [matchConfirmed, setMatchConfirmed] = useState(false);

  // ── initCamera ──────────────────────────────────────────────────────────────
  // Permite llamarse más de una vez: si ya hay stream, es no-op.
  // Si cameraInitiated es true pero localStream sigue null (fallo anterior),
  // resetea el flag y reintenta — esto cubre el caso "Device in use" temporal.
  const initCamera = useCallback(async () => {
    if (localStream.current) return; // ya funciona, salir rápido

    if (cameraInitiated.current) {
      // Esperar la promise en curso en vez de lanzar una segunda
      return cameraReadyRef.current;
    }

    cameraInitiated.current = true;

    const camPromise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraError(false);
        console.log("[WebRTC] 📷 Cámara lista.");
      } catch (e) {
        console.warn("[WebRTC] ⚠️ Sin cámara:", e);
        setCameraError(true);
        // Reseteamos para permitir reintentos futuros (p.ej. tras match-found)
        cameraInitiated.current = false;
      }
    })();

    cameraReadyRef.current = camPromise;
    return camPromise;
  }, []);

  // ── closePeerConnection ──────────────────────────────────────────────────────
  const closePeerConnection = useCallback(() => {
    if (!peer.current) return;
    peer.current.ontrack               = null;
    peer.current.onicecandidate        = null;
    peer.current.oniceconnectionstatechange = null;
    peer.current.close();
    peer.current = null;
    setRemoteStream(null);
    setIsConnected(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    console.log("[WebRTC] 🧹 PeerConnection destruida.");
  }, []);

  // ── Room → null: destruir peer y resetear matchConfirmed ────────────────────
  const prevRoomId = useRef<string | null>(currentRoomId);
  useEffect(() => {
    const prev = prevRoomId.current;
    prevRoomId.current = currentRoomId;
    if (prev !== null && currentRoomId === null) {
      closePeerConnection();
      setMatchConfirmed(false);
    }
  }, [currentRoomId, closePeerConnection]);

  // ── createPeer ───────────────────────────────────────────────────────────────
  const createPeer = useCallback((targetId: string) => {
    console.log("[WebRTC] 🔗 Creando PeerConnection para:", targetId);
    closePeerConnection();

    const newPeer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });
    peer.current = newPeer;

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) =>
        newPeer.addTrack(track, localStream.current!)
      );
      console.log("[WebRTC] ✅ Tracks locales añadidos al peer.");
    } else {
      console.warn("[WebRTC] ⚠️ Peer creado sin tracks (sin cámara).");
    }

    newPeer.ontrack = (event) => {
      console.log("[WebRTC] 🎥 Stream remoto recibido!");
      const incoming = event.streams[0];
      setRemoteStream(incoming);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = incoming;
    };

    newPeer.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("signal", {
          to: targetId,
          data: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    newPeer.oniceconnectionstatechange = () => {
      const state = newPeer.iceConnectionState;
      console.log("[WebRTC] Estado ICE:", state);
      if (state === "connected" || state === "completed") setIsConnected(true);
      if (["disconnected", "failed", "closed"].includes(state)) setIsConnected(false);
    };

    return newPeer;
  }, [socket, closePeerConnection]);

  // ── Efecto principal: cámara + listeners ─────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Iniciar la cámara lo antes posible, sin esperar el match
    initCamera();

    // ── match-found ─────────────────────────────────────────────────────────
    socket.off("match-found");
    socket.on("match-found", async ({ partnerId, isInitiator }) => {
      console.log(`[WebRTC] 🔗 Match con ${partnerId} | iniciador: ${isInitiator}`);
      setMatchConfirmed(true);

      // Si la cámara falló antes (Device in use), intentarlo de nuevo ahora
      if (!localStream.current) {
        cameraInitiated.current = false;
        await initCamera();
      } else {
        await cameraReadyRef.current;
      }
      console.log("[WebRTC] Cámara confirmada, procediendo con peer.");

      const activePeer = createPeer(partnerId);

      if (isInitiator) {
        // Pequeño delay para dar tiempo al non-initiator de registrar sus listeners
        await new Promise((r) => setTimeout(r, 500));

        if (peer.current !== activePeer) {
          console.warn("[WebRTC] Peer reemplazado, abortando offer.");
          return;
        }

        try {
          const offer = await activePeer.createOffer();
          await activePeer.setLocalDescription(offer);
          socket.emit("signal", { to: partnerId, data: offer });
          console.log("[WebRTC] 📤 Offer enviada.");
        } catch (e) {
          console.error("[WebRTC] Error creando offer:", e);
        }
      }
    });

    // ── signal ──────────────────────────────────────────────────────────────
    socket.off("signal");
    socket.on("signal", async ({ from, data }) => {
      // Si no hay peer todavía (el signal llegó antes que match-found)...
      if (!peer.current) {
        // FIX: esperar cámara ANTES de crear el peer, igual que en match-found
        if (!localStream.current) {
          cameraInitiated.current = false;
          await initCamera();
        } else {
          await cameraReadyRef.current;
        }
        createPeer(from);
        setMatchConfirmed(true);
      }
      if (!peer.current) return;

      const activePeer = peer.current;
      try {
        if (data.type === "offer") {
          await activePeer.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await activePeer.createAnswer();
          await activePeer.setLocalDescription(answer);
          socket.emit("signal", { to: from, data: answer });
          console.log("[WebRTC] 📤 Answer enviada.");
        } else if (data.type === "answer") {
          await activePeer.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.type === "candidate" && data.candidate) {
          await activePeer.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (e) {
        console.warn("[WebRTC] Señal ignorada:", e);
      }
    });

    // FIX: el cleanup solo desregistra listeners — NO destruye el peer.
    // La destrucción del peer queda en manos del efecto que observa
    // currentRoomId → null, evitando matar conexiones activas en re-renders.
    return () => {
      socket.off("match-found");
      socket.off("signal");
    };
  }, [socket, initCamera, createPeer, closePeerConnection]);

  return {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    remoteStream,
    cameraError,
    matchConfirmed,
  };
};