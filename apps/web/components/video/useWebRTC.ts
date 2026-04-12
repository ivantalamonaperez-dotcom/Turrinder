"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

export const useWebRTC = () => {
  const socket = useSocket();
  const localStream = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const partnerIdRef = useRef<string | null>(null);
  
  // Estados para controlar la UI
  const [isConnected, setIsConnected] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // 1. Apagar cámara físicamente
  const stopMediaTracks = useCallback(() => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        track.stop();
      });
      localStream.current = null;
    }
  }, []);

  // 2. Cerrar conexión WebRTC existente de forma limpia
  const closePeerConnection = useCallback(() => {
    if (peer.current) {
      peer.current.ontrack = null;
      peer.current.onicecandidate = null;
      peer.current.oniceconnectionstatechange = null;
      peer.current.close();
      peer.current = null;
      console.log("[WebRTC] PeerConnection destruida");
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setRemoteStream(null);
    setIsConnected(false);
  }, []);

  const createPeer = useCallback((targetId: string) => {
    closePeerConnection();

    peer.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ],
    });

    // Añadir tracks locales (si existen)
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peer.current?.addTrack(track, localStream.current!);
      });
    }

    // Se dispara cuando llega el video/audio del otro
    peer.current.ontrack = (event) => {
      console.log("[WebRTC] Recibiendo stream remoto...");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteStream(event.streams[0]);
      }
    };

    peer.current.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("signal", {
          to: targetId,
          data: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    // Monitor de estado para el radar
    peer.current.oniceconnectionstatechange = () => {
      const state = peer.current?.iceConnectionState;
      console.log("[WebRTC] Estado de red:", state);
      
      if (state === "connected" || state === "completed") {
        setIsConnected(true);
      } else if (state === "failed" || state === "disconnected" || state === "closed") {
        setIsConnected(false);
        setRemoteStream(null);
      }
    };
  }, [socket, closePeerConnection]);

  useEffect(() => {
    if (!socket) return;

    const initCamera = async () => {
      if (localStream.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStream.current = stream;
      } catch (err) {
        console.warn("⚠️ Cámara ocupada o no disponible, intentando solo audio...");
        try {
          localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          console.error("❌ Sin permisos de medios. Creando stream vacío.");
          localStream.current = new MediaStream();
        }
      } finally {
        if (localVideoRef.current && localStream.current) {
          localVideoRef.current.srcObject = localStream.current;
        }
      }
    };

    initCamera();

    // Evento MATCH FOUND
    socket.on("match-found", async ({ partnerId, isInitiator }) => {
      if (!partnerId) {
        partnerIdRef.current = null;
        closePeerConnection();
        return;
      }

      console.log(`[WebRTC] Nuevo partner: ${partnerId} (Iniciador: ${isInitiator})`);
      partnerIdRef.current = partnerId;
      createPeer(partnerId);

      if (isInitiator && peer.current) {
        try {
          const offer = await peer.current.createOffer();
          await peer.current.setLocalDescription(offer);
          socket.emit("signal", { to: partnerId, data: offer });
        } catch (e) {
          console.error("Error creando oferta:", e);
        }
      }
    });

    // Evento SIGNAL
    socket.on("signal", async ({ from, data }) => {
      if (!data) return;

      if (!peer.current && (data.type === "offer" || data.candidate)) {
        createPeer(from);
      }

      if (!peer.current) return;

      try {
        if (data.type === "offer") {
          await peer.current.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await peer.current.createAnswer();
          await peer.current.setLocalDescription(answer);
          socket.emit("signal", { to: from, data: answer });
        } 
        else if (data.type === "answer") {
          if (peer.current.signalingState === "have-local-offer") {
            await peer.current.setRemoteDescription(new RTCSessionDescription(data));
          }
        } 
        else if (data.type === "candidate" && data.candidate) {
          if (peer.current.remoteDescription) {
            await peer.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (err) {
        console.warn("[WebRTC] Error en señalización:", err);
      }
    });

    socket.on("partner-left", () => {
      console.log("[WebRTC] Partner se desconectó");
      partnerIdRef.current = null;
      closePeerConnection();
    });

    return () => {
      socket.off("match-found");
      socket.off("signal");
      socket.off("partner-left");
      closePeerConnection();
      stopMediaTracks();
    };
  }, [socket, createPeer, closePeerConnection, stopMediaTracks]);

  return {
    localVideoRef,
    remoteVideoRef,
    partnerId: partnerIdRef.current,
    isConnected,
    remoteStream // <--- Clave para ocultar el radar si hay video
  };
};