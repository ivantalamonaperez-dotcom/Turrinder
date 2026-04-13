"use client";

/**
 * useWebRTC — CÁMARA PRIMERO, MATCH DESPUÉS
 *
 * CAUSA RAÍZ DEL BUG "primer match sin video":
 *   match-found llegaba ANTES de que getUserMedia terminara.
 *   createPeer() se ejecutaba con localStream.current === null,
 *   así que no se añadían tracks → la offer iba vacía → sin video.
 *   En el segundo match (post-skip) la cámara ya estaba lista → funcionaba.
 *
 * SOLUCIÓN:
 *   1. Pedimos la cámara inmediatamente al montar el hook (no esperamos match).
 *   2. Guardamos una Promise `cameraReady` que se resuelve cuando la cámara
 *      esté disponible (o falle).
 *   3. El handler de match-found hace `await cameraReady` antes de createPeer,
 *      garantizando que los tracks siempre estén disponibles.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

export const useWebRTC = (currentRoomId: string | null) => {
  const { socket } = useSocket();

  const localStream      = useRef<MediaStream | null>(null);
  const peer             = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef   = useRef<HTMLVideoElement | null>(null);
  const localVideoRef    = useRef<HTMLVideoElement | null>(null);
  // Promise que se resuelve cuando la cámara esté lista (o haya fallado)
  const cameraReadyRef   = useRef<Promise<void>>(Promise.resolve());
  const cameraInitiated  = useRef(false);

  const [isConnected,    setIsConnected]    = useState(false);
  const [remoteStream,   setRemoteStream]   = useState<MediaStream | null>(null);
  const [cameraError,    setCameraError]    = useState(false);
  const [matchConfirmed, setMatchConfirmed] = useState(false);

  // ── Iniciar cámara — se llama lo antes posible, independiente del match ──
  const initCamera = useCallback(async () => {
    if (cameraInitiated.current || localStream.current) return;
    cameraInitiated.current = true;

    cameraReadyRef.current = (async () => {
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
        // Resolvemos igual para no bloquear el match si no hay cámara
      }
    })();

    await cameraReadyRef.current;
  }, []);

  // ── Destruir PeerConnection (NO toca matchConfirmed) ────────────────────
  const closePeerConnection = useCallback(() => {
    if (!peer.current) return;
    peer.current.ontrack = null;
    peer.current.onicecandidate = null;
    peer.current.oniceconnectionstatechange = null;
    peer.current.close();
    peer.current = null;
    setRemoteStream(null);
    setIsConnected(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    console.log("[WebRTC] 🧹 PeerConnection destruida.");
  }, []);

  // ── Room → null: destruir peer y resetear matchConfirmed ────────────────
  const prevRoomId = useRef<string | null>(currentRoomId);
  useEffect(() => {
    const prev = prevRoomId.current;
    prevRoomId.current = currentRoomId;
    if (prev !== null && currentRoomId === null) {
      closePeerConnection();
      setMatchConfirmed(false);
    }
  }, [currentRoomId, closePeerConnection]);

  // ── Crear PeerConnection ─────────────────────────────────────────────────
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

    // ← Tracks ya disponibles porque esperamos cameraReady antes de llegar aquí
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

  // ── Efecto principal: cámara + listeners ─────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // ← Iniciamos la cámara INMEDIATAMENTE, sin esperar el match
    initCamera();

    // match-found: esperar cámara, luego crear peer
    socket.off("match-found");
    socket.on("match-found", async ({ partnerId, isInitiator }) => {
      console.log(`[WebRTC] 🔗 Match con ${partnerId} | iniciador: ${isInitiator}`);
      setMatchConfirmed(true);

      // ← CLAVE: esperamos que la cámara esté lista antes de crear el peer
      await cameraReadyRef.current;
      console.log("[WebRTC] Cámara confirmada, procediendo con peer.");

      const activePeer = createPeer(partnerId);

      if (isInitiator) {
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

    // signal: responder offer/answer/candidate
    socket.off("signal");
    socket.on("signal", async ({ from, data }) => {
      if (!peer.current) {
        await cameraReadyRef.current;
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

    return () => {
      socket.off("match-found");
      socket.off("signal");
      closePeerConnection();
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