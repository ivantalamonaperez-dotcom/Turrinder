"use client";

/**
 * useWebRTC v6 — DEVICE PREFERENCES FROM localStorage
 *
 * PROBLEMA RAÍZ (esta iteración):
 *   initCamera() siempre pedía `{ video: true, audio: true }` ignorando
 *   el dispositivo elegido en VideoAudioSection (guardado en localStorage
 *   bajo la key "turrin_va_prefs").
 *
 * SOLUCIÓN:
 *   - readDevicePrefs() lee cameraId, micId, frameRate, noiseSuppression y
 *     echoCancellation de localStorage antes de cada getUserMedia.
 *   - initCamera() construye los constraints con los deviceId guardados.
 *   - Se agrega reinitCamera() para reemplazar el stream cuando las prefs
 *     cambian mientras el usuario ya está en la página (escucha el evento
 *     "turrin:va_prefs_changed" que puede disparar VideoAudioSection).
 *
 * Compatibilidad con v5 (ICE candidate queue) mantenida íntegramente.
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

  // ── Cola de ICE candidates pendientes ─────────────────────────────────────
  // Se encolan cuando llegan antes de que remoteDescription esté seteado
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

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

  // ── readDevicePrefs ────────────────────────────────────────────────────────
  // Lee las preferencias guardadas por VideoAudioSection en localStorage.
  const readDevicePrefs = useCallback(() => {
    try {
      const raw = localStorage.getItem("turrin_va_prefs");
      if (!raw) return null;
      return JSON.parse(raw) as {
        cameraId?: string;
        micId?: string;
        frameRate?: number;
        noiseSuppression?: boolean;
        echoCancellation?: boolean;
        micEnabled?: boolean;
      };
    } catch {
      return null;
    }
  }, []);

  // ── buildConstraints ───────────────────────────────────────────────────────
  // Construye MediaStreamConstraints a partir de las prefs guardadas.
  const buildConstraints = useCallback((): MediaStreamConstraints => {
    const prefs = readDevicePrefs();

    const videoConstraint: MediaTrackConstraints = {};
    if (prefs?.cameraId)  videoConstraint.deviceId  = { exact: prefs.cameraId };
    if (prefs?.frameRate) videoConstraint.frameRate = { ideal: prefs.frameRate };

    const audioConstraint: MediaTrackConstraints = {
      noiseSuppression: prefs?.noiseSuppression ?? true,
      echoCancellation: prefs?.echoCancellation ?? true,
    };
    if (prefs?.micId) audioConstraint.deviceId = { exact: prefs.micId };

    return {
      video: Object.keys(videoConstraint).length ? videoConstraint : true,
      audio: audioConstraint,
    };
  }, [readDevicePrefs]);

  // ── initCamera ─────────────────────────────────────────────────────────────
  const initCamera = useCallback(async () => {
    if (localStream.current) return;
    if (cameraInitiated.current) return cameraReadyRef.current;

    cameraInitiated.current = true;
    const camPromise = (async () => {
      try {
        const constraints = buildConstraints();
        console.log("[WebRTC] 📷 getUserMedia constraints:", JSON.stringify(constraints));
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraError(false);
        console.log("[WebRTC] 📷 Cámara lista.");
      } catch (e) {
        // Si el deviceId guardado ya no es válido (dispositivo desconectado),
        // reintentamos con los defaults para no dejar al usuario sin cámara.
        console.warn("[WebRTC] ⚠️ getUserMedia con prefs falló, reintentando con defaults:", e);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStream.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          setCameraError(false);
        } catch (e2) {
          console.warn("[WebRTC] ⚠️ Sin cámara:", e2);
          setCameraError(true);
          cameraInitiated.current = false;
        }
      }
    })();

    cameraReadyRef.current = camPromise;
    return camPromise;
  }, [buildConstraints]);

  // ── closePeerConnection ────────────────────────────────────────────────────
  const closePeerConnection = useCallback(() => {
    if (!peer.current) return;
    peer.current.ontrack                    = null;
    peer.current.onicecandidate             = null;
    peer.current.oniceconnectionstatechange = null;
    peer.current.close();
    peer.current = null;
    iceCandidateQueue.current = []; // limpiar cola al cerrar
    setRemoteStream(null);
    setIsConnected(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    console.log("[WebRTC] 🧹 PeerConnection destruida.");
  }, []);

  // ── drainIceCandidateQueue ─────────────────────────────────────────────────
  // Se llama justo después de setRemoteDescription para aplicar
  // todos los candidates que llegaron antes del remote description
  const drainIceCandidateQueue = useCallback(async () => {
    const activePeer = peer.current;
    if (!activePeer || !activePeer.remoteDescription) return;

    const queue = iceCandidateQueue.current;
    if (queue.length === 0) return;

    console.log(`[WebRTC] 🧊 Drenando ${queue.length} ICE candidates en cola`);
    iceCandidateQueue.current = [];

    for (const candidate of queue) {
      try {
        await activePeer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("[WebRTC] Error aplicando ICE candidate en cola:", e);
      }
    }
  }, []);

  // ── createPeer ─────────────────────────────────────────────────────────────
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
  }, [closePeerConnection]);

  // ── Efecto 1: pedir cámara al montar (una sola vez) ────────────────────────
  useEffect(() => {
    initCamera();
    return () => {
      localStream.current?.getTracks().forEach((t) => t.stop());
      localStream.current = null;
      cameraInitiated.current = false;
      closePeerConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Efecto 2: reaccionar a currentRoomId ───────────────────────────────────
  useEffect(() => {
    if (currentRoomId === null) {
      closePeerConnection();
      setMatchConfirmed(false);
      return;
    }

    let cancelled = false;

    const connect = async (roomId: string) => {
      setMatchConfirmed(true);

      if (!localStream.current) await initCamera();
      await cameraReadyRef.current;

      if (cancelled) {
        console.log("[WebRTC] connect() cancelado (roomId cambió).");
        return;
      }

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomId]);

  // ── Efecto 3: señalización ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async ({ from, data }: { from: string; data: any }) => {
      if (!peer.current) {
        if (!localStream.current) await initCamera();
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
          await activePeer.setRemoteDescription(new RTCSessionDescription(data));
          // ✅ Drenar cola de ICE candidates que llegaron antes del offer
          await drainIceCandidateQueue();
          const answer = await activePeer.createAnswer();
          await activePeer.setLocalDescription(answer);
          socket.emit("signal", { to: from, data: answer });
          console.log("[WebRTC] 📤 Answer enviada.");

        } else if (data.type === "answer") {
          await activePeer.setRemoteDescription(new RTCSessionDescription(data));
          // ✅ Drenar cola de ICE candidates que llegaron antes del answer
          await drainIceCandidateQueue();

        } else if (data.type === "candidate" && data.candidate) {
          if (!activePeer.remoteDescription) {
            // ✅ Encolar si remoteDescription todavía no está seteado
            console.log("[WebRTC] 🧊 ICE candidate encolado (remoteDescription null)");
            iceCandidateQueue.current.push(data.candidate);
          } else {
            await activePeer.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (e) {
        console.warn("[WebRTC] Señal ignorada:", e);
      }
    };

    socket.on("signal", handleSignal);
    return () => { socket.off("signal", handleSignal); };
  }, [socket, initCamera, createPeer, drainIceCandidateQueue]);

  // ── reinitCamera ───────────────────────────────────────────────────────────
  // Reemplaza el stream local con los nuevos dispositivos sin cerrar el peer.
  // Si hay un peer activo, reemplaza los tracks para que el cambio sea
  // inmediato en la llamada en curso via replaceTrack().
  const reinitCamera = useCallback(async () => {
    console.log("[WebRTC] 🔄 Reiniciando cámara/micrófono con nuevas prefs...");

    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    cameraInitiated.current = false;

    await initCamera();
    await cameraReadyRef.current;

    const newStream = localStream.current;
    if (!newStream) return;

    if (peer.current) {
      const senders = peer.current.getSenders();
      for (const sender of senders) {
        if (sender.track?.kind === "video") {
          const newTrack = newStream.getVideoTracks()[0];
          if (newTrack) await sender.replaceTrack(newTrack).catch((e) =>
            console.warn("[WebRTC] replaceTrack video:", e)
          );
        } else if (sender.track?.kind === "audio") {
          const newTrack = newStream.getAudioTracks()[0];
          if (newTrack) await sender.replaceTrack(newTrack).catch((e) =>
            console.warn("[WebRTC] replaceTrack audio:", e)
          );
        }
      }
      console.log("[WebRTC] ✅ Tracks reemplazados en peer activo.");
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
  }, [initCamera]);

  // ── Efecto 4: escuchar cambios de preferencias de dispositivo ──────────────
  // VideoAudioSection dispara "turrin:va_prefs_changed" para aplicar el
  // dispositivo elegido en caliente, sin esperar al próximo match.
  useEffect(() => {
    const handler = () => { reinitCamera(); };
    window.addEventListener("turrin:va_prefs_changed", handler);
    return () => window.removeEventListener("turrin:va_prefs_changed", handler);
  }, [reinitCamera]);

  return {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    remoteStream,
    cameraError,
    matchConfirmed,
  };
};