"use client";

/**
 * useWebRTC v3 — UN SOLO SOURCE OF TRUTH
 *
 * CAUSA RAÍZ DEL BUG ASIMÉTRICO:
 *   Existían DOS listeners de "match-found" corriendo en paralelo:
 *     1. useMatchmaking → setRoom({ id: partnerId })
 *     2. useWebRTC      → createPeer(partnerId)
 *
 *   El problema: cuando (1) actualizaba room, React re-renderizaba el componente,
 *   lo que cambiaba currentRoomId en useWebRTC. Esto podía disparar el efecto de
 *   prevRoomId en momentos inesperados, destruyendo el peer recién creado en (2).
 *   Además, la race entre ambos listeners era no-determinista: dependiendo del
 *   orden de micro-tareas y del lado que fuera initiator/non-initiator, uno de
 *   los dos peers se creaba sin tracks o después de haber sido destruido.
 *
 * SOLUCIÓN — separar responsabilidades:
 *   useMatchmaking  → escucha "match-found", expone { room, isInitiator }
 *   useWebRTC       → NO escucha "match-found"; solo reacciona a currentRoomId
 *
 *   Cuando currentRoomId cambia de null → valor: inicializa cámara, crea peer,
 *   si isInitiator envía offer tras 500 ms.
 *   Cuando currentRoomId cambia de valor → null: destruye peer.
 *   Solo "signal" se sigue escuchando aquí (offer/answer/candidate).
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

interface UseWebRTCProps {
  currentRoomId: string | null;
  /** Viene de useMatchmaking: true si este cliente envía la offer */
  isInitiator: boolean;
}

export const useWebRTC = ({ currentRoomId, isInitiator }: UseWebRTCProps) => {
  const { socket } = useSocket();

  const localStream     = useRef<MediaStream | null>(null);
  const peer            = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef  = useRef<HTMLVideoElement | null>(null);
  const localVideoRef   = useRef<HTMLVideoElement | null>(null);
  const cameraReadyRef  = useRef<Promise<void>>(Promise.resolve());
  const cameraInitiated = useRef(false);

  // Ref para acceder al roomId actual dentro de closures sin re-crear funciones
  const currentRoomIdRef = useRef<string | null>(currentRoomId);
  useEffect(() => { currentRoomIdRef.current = currentRoomId; }, [currentRoomId]);

  const [isConnected,    setIsConnected]    = useState(false);
  const [remoteStream,   setRemoteStream]   = useState<MediaStream | null>(null);
  const [cameraError,    setCameraError]    = useState(false);
  const [matchConfirmed, setMatchConfirmed] = useState(false);

  // ── initCamera ──────────────────────────────────────────────────────────────
  const initCamera = useCallback(async () => {
    if (localStream.current) return;
    if (cameraInitiated.current) return cameraReadyRef.current;

    cameraInitiated.current = true;
    const camPromise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraError(false);
        console.log("[WebRTC] 📷 Cámara lista.");
      } catch (e) {
        console.warn("[WebRTC] ⚠️ Sin cámara:", e);
        setCameraError(true);
        cameraInitiated.current = false; // permite reintentar en el próximo match
      }
    })();
    cameraReadyRef.current = camPromise;
    return camPromise;
  }, []);

  // ── closePeerConnection ──────────────────────────────────────────────────────
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

  // ── createPeer ───────────────────────────────────────────────────────────────
  const createPeer = useCallback((targetId: string) => {
    closePeerConnection();
    console.log("[WebRTC] 🔗 Creando PeerConnection para:", targetId);

    const newPeer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });
    peer.current = newPeer;

    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => newPeer.addTrack(t, localStream.current!));
      console.log("[WebRTC] ✅ Tracks locales añadidos.");
    } else {
      console.warn("[WebRTC] ⚠️ Peer creado sin tracks.");
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

  // ── Efecto 1: cámara al montar ───────────────────────────────────────────────
  useEffect(() => {
    initCamera();
  }, [initCamera]);

  // ── Efecto 2: reaccionar a currentRoomId — ÚNICO lugar que crea/destruye peer
  const prevRoomId = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevRoomId.current;
    prevRoomId.current = currentRoomId;

    if (prev === null && currentRoomId === null) return;

    // valor → null: destruir peer
    if (currentRoomId === null) {
      closePeerConnection();
      setMatchConfirmed(false);
      return;
    }

    // null → valor (o cambio de partner): inicializar conexión
    let cancelled = false;

    const connect = async (roomId: string, initiator: boolean) => {
      setMatchConfirmed(true);

      // Reintentar cámara si falló antes (ej: NotReadableError — Device in use)
      if (!localStream.current) {
        cameraInitiated.current = false;
        await initCamera();
      } else {
        await cameraReadyRef.current;
      }

      if (cancelled) {
        console.log("[WebRTC] Conexión cancelada antes de crear peer (roomId cambió).");
        return;
      }

      const activePeer = createPeer(roomId);

      if (initiator) {
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled || peer.current !== activePeer) {
          console.warn("[WebRTC] Peer reemplazado antes de enviar offer, abortando.");
          return;
        }
        try {
          const offer = await activePeer.createOffer();
          await activePeer.setLocalDescription(offer);
          socket?.emit("signal", { to: roomId, data: offer });
          console.log("[WebRTC] 📤 Offer enviada.");
        } catch (e) {
          console.error("[WebRTC] Error creando offer:", e);
        }
      }
    };

    connect(currentRoomId, isInitiator);

    return () => { cancelled = true; };
  // Solo currentRoomId e isInitiator como deps — no incluir funciones estables
  // para evitar re-runs inesperados que destruyan el peer activo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomId, isInitiator]);

  // ── Efecto 3: señalización (solo "signal", sin "match-found") ────────────────
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async ({ from, data }: { from: string; data: any }) => {
      // Si la offer llega antes de que el peer exista (race con el efecto 2),
      // esperar cámara y crear peer de emergencia.
      if (!peer.current) {
        if (!localStream.current) {
          cameraInitiated.current = false;
          await initCamera();
        } else {
          await cameraReadyRef.current;
        }
        // Verificar de nuevo: el efecto 2 puede haber creado el peer mientras esperábamos
        if (!peer.current) {
          const roomId = currentRoomIdRef.current;
          if (roomId) {
            createPeer(from);
            setMatchConfirmed(true);
          }
        }
      }

      const activePeer = peer.current;
      if (!activePeer) return;

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
    };

    socket.on("signal", handleSignal);
    return () => { socket.off("signal", handleSignal); };
  }, [socket, initCamera, createPeer]);

  // ── Cleanup al desmontar ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      closePeerConnection();
      localStream.current?.getTracks().forEach((t) => t.stop());
      localStream.current = null;
      cameraInitiated.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    remoteStream,
    cameraError,
    matchConfirmed,
  };
};