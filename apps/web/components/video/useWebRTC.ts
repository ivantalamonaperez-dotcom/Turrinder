"use client";

/**
 * useWebRTC v4 — SOURCE OF TRUTH ÚNICO + ISINITIATOR VÍA REF
 *
 * BUGS CORREGIDOS:
 *
 * BUG A — isInitiator en deps causaba doble peer:
 *   En useMatchmaking, setIsInitiator() y setRoom() son dos setState separados.
 *   Aunque React 18 los batchea dentro del mismo handler, el efecto
 *   [currentRoomId, isInitiator] podía dispararse en un render intermedio con
 *   currentRoomId=nuevoId pero isInitiator=false (valor "viejo"), creando un peer
 *   como non-initiator. Luego isInitiator llegaba al valor correcto (true), el
 *   efecto se disparaba DE NUEVO, createPeer() destruía el peer anterior y creaba
 *   uno nuevo. Resultado: peer destruido justo cuando ICE llegaba a "connected".
 *
 *   FIX: isInitiator se recibe como prop pero NO está en las deps del efecto.
 *   Se lee via ref (isInitiatorRef) dentro del async connect(), garantizando
 *   siempre el valor más reciente sin re-disparar el efecto.
 *
 * BUG B — NotReadableError: Device in use:
 *   Al reintentar getUserMedia mientras el stream anterior seguía vivo en
 *   localStream.current, el navegador rechazaba el acceso. cameraInitiated se
 *   reseteaba a false, se pedía la cámara de nuevo y fallaba en loop.
 *
 *   FIX: la cámara se pide UNA SOLA VEZ al montar el hook y nunca se vuelve a
 *   pedir entre matches. El stream vive toda la vida del componente y solo se
 *   detiene en el cleanup de desmontaje. Si el primer intento falla, se reintenta
 *   solo cuando aún no hay stream (guarda contra Device in use persistente).
 *
 * ARQUITECTURA:
 *   - useMatchmaking escucha "match-found" → expone { room, isInitiator }
 *   - useWebRTC NO escucha "match-found"; solo observa currentRoomId (un string)
 *   - Un único efecto [currentRoomId] crea/destruye el peer
 *   - isInitiator se pasa como prop y se lee via ref dentro del efecto
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

interface UseWebRTCProps {
  currentRoomId: string | null;
  isInitiator: boolean;
}

export const useWebRTC = ({ currentRoomId, isInitiator }: UseWebRTCProps) => {
  const { socket } = useSocket();

  const localStream     = useRef<MediaStream | null>(null);
  const peer            = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef  = useRef<HTMLVideoElement | null>(null);
  const localVideoRef   = useRef<HTMLVideoElement | null>(null);

  // isInitiator como ref: el efecto lo lee sin tenerlo como dependencia
  const isInitiatorRef    = useRef(isInitiator);
  useEffect(() => { isInitiatorRef.current = isInitiator; }, [isInitiator]);

  // currentRoomId como ref para closures del handler de signal
  const currentRoomIdRef  = useRef<string | null>(currentRoomId);
  useEffect(() => { currentRoomIdRef.current = currentRoomId; }, [currentRoomId]);

  // socketRef para closures estables
  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  const cameraReadyRef  = useRef<Promise<void>>(Promise.resolve());
  const cameraInitiated = useRef(false);

  const [isConnected,    setIsConnected]    = useState(false);
  const [remoteStream,   setRemoteStream]   = useState<MediaStream | null>(null);
  const [cameraError,    setCameraError]    = useState(false);
  const [matchConfirmed, setMatchConfirmed] = useState(false);

  // ── initCamera ─────────────────────────────────────────────────────────────
  // Se llama UNA sola vez. El stream vive toda la vida del componente.
  // Si ya hay stream activo, es no-op garantizado.
  const initCamera = useCallback(async () => {
    if (localStream.current) return; // stream ya disponible, no hacer nada
    if (cameraInitiated.current) return cameraReadyRef.current; // en progreso

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
        // Reseteamos solo cameraInitiated para permitir un reintento puntual,
        // pero NO destruimos nada — el stream simplemente no existe.
        cameraInitiated.current = false;
      }
    })();

    cameraReadyRef.current = camPromise;
    return camPromise;
  }, []);

  // ── closePeerConnection ────────────────────────────────────────────────────
  const closePeerConnection = useCallback(() => {
    if (!peer.current) return;
    peer.current.ontrack                    = null;
    peer.current.onicecandidate             = null;
    peer.current.oniceconnectionstatechange = null;
    peer.current.close();
    peer.current = null;
    setRemoteStream(null);
    setIsConnected(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    console.log("[WebRTC] 🧹 PeerConnection destruida.");
  }, []);

  // ── createPeer ─────────────────────────────────────────────────────────────
  // Recibe targetId y usa socketRef para no tener socket en sus deps.
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
      localStream.current
        .getTracks()
        .forEach((t) => newPeer.addTrack(t, localStream.current!));
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
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("signal", {
          to: targetId,
          data: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    newPeer.oniceconnectionstatechange = () => {
      const state = newPeer.iceConnectionState;
      console.log("[WebRTC] Estado ICE:", state);
      if (state === "connected" || state === "completed") setIsConnected(true);
      if (["disconnected", "failed", "closed"].includes(state))
        setIsConnected(false);
    };

    return newPeer;
  }, [closePeerConnection]); // sin socket — usa socketRef

  // ── Efecto 1: pedir cámara al montar (una sola vez) ────────────────────────
  useEffect(() => {
    initCamera();
    // Cleanup: detener tracks solo al DESMONTAR el componente completo
    return () => {
      localStream.current?.getTracks().forEach((t) => t.stop());
      localStream.current = null;
      cameraInitiated.current = false;
      closePeerConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // sin deps — solo mount/unmount

  // ── Efecto 2: reaccionar a currentRoomId — ÚNICO creador/destructor de peer ─
  // isInitiator NO está en las deps. Se lee via isInitiatorRef en connect().
  useEffect(() => {
    if (currentRoomId === null) {
      closePeerConnection();
      setMatchConfirmed(false);
      return;
    }

    let cancelled = false;

    const connect = async (roomId: string) => {
      setMatchConfirmed(true);

      // Esperar cámara. Si no hay stream todavía, reintentar initCamera.
      // Esto cubre el caso en que el primer intento falló por "Device in use".
      if (!localStream.current) {
        await initCamera();
      }
      // Esperar siempre la promise para asegurarnos de que terminó
      await cameraReadyRef.current;

      if (cancelled) {
        console.log("[WebRTC] connect() cancelado (roomId cambió).");
        return;
      }

      // Leer isInitiator del ref en este momento — valor actual garantizado
      const initiator = isInitiatorRef.current;
      console.log(`[WebRTC] Conectando con ${roomId} | initiator: ${initiator}`);

      const activePeer = createPeer(roomId);

      if (initiator) {
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled || peer.current !== activePeer) {
          console.warn("[WebRTC] Peer reemplazado antes de enviar offer.");
          return;
        }
        try {
          const offer = await activePeer.createOffer();
          await activePeer.setLocalDescription(offer);
          socketRef.current?.emit("signal", { to: roomId, data: offer });
          console.log("[WebRTC] 📤 Offer enviada.");
        } catch (e) {
          console.error("[WebRTC] Error creando offer:", e);
        }
      }
    };

    connect(currentRoomId);
    return () => { cancelled = true; };

  // Solo currentRoomId como dep. isInitiator se lee via ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomId]);

  // ── Efecto 3: señalización — solo "signal" ─────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async ({ from, data }: { from: string; data: any }) => {
      // Si la offer llega antes de que el efecto 2 haya creado el peer,
      // esperamos la cámara y creamos un peer de emergencia.
      if (!peer.current) {
        if (!localStream.current) {
          await initCamera();
        }
        await cameraReadyRef.current;
        if (!peer.current && currentRoomIdRef.current) {
          createPeer(from);
          setMatchConfirmed(true);
        }
      }

      const activePeer = peer.current;
      if (!activePeer) return;

      try {
        if (data.type === "offer") {
          await activePeer.setRemoteDescription(
            new RTCSessionDescription(data)
          );
          const answer = await activePeer.createAnswer();
          await activePeer.setLocalDescription(answer);
          socket.emit("signal", { to: from, data: answer });
          console.log("[WebRTC] 📤 Answer enviada.");
        } else if (data.type === "answer") {
          await activePeer.setRemoteDescription(
            new RTCSessionDescription(data)
          );
        } else if (data.type === "candidate" && data.candidate) {
          await activePeer.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      } catch (e) {
        console.warn("[WebRTC] Señal ignorada:", e);
      }
    };

    socket.on("signal", handleSignal);
    return () => { socket.off("signal", handleSignal); };
  }, [socket, initCamera, createPeer]);

  return {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    remoteStream,
    cameraError,
    matchConfirmed,
  };
};