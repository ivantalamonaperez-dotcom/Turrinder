"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

export const useWebRTC = (currentRoomId: string | null) => {
  const socket = useSocket();
  const localStream = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const closePeerConnection = useCallback(() => {
    if (peer.current) {
      peer.current.ontrack = null;
      peer.current.onicecandidate = null;
      peer.current.oniceconnectionstatechange = null;
      peer.current.close();
      peer.current = null;
    }
    setRemoteStream(null);
    setIsConnected(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    console.log("[WebRTC] 🧹 Conexión destruida y limpiada.");
  }, []);

  // ✨ LA MAGIA: Si la sala pasa a null (por Skip o abandono), matamos el video.
  useEffect(() => {
    if (!currentRoomId) {
      closePeerConnection();
    }
  }, [currentRoomId, closePeerConnection]);

  const createPeer = useCallback((targetId: string) => {
    console.log("[WebRTC] Creando PeerConnection para:", targetId);
    closePeerConnection(); // Limpieza preventiva antes de crear uno nuevo
    
    peer.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ],
    });

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peer.current?.addTrack(track, localStream.current!);
      });
    }

    peer.current.ontrack = (event) => {
      console.log("[WebRTC] 🎥 Stream remoto recibido!");
      const incomingStream = event.streams[0];
      setRemoteStream(incomingStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = incomingStream;
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

    peer.current.oniceconnectionstatechange = () => {
      const state = peer.current?.iceConnectionState;
      console.log("[WebRTC] Estado ICE:", state);
      if (state === "connected") setIsConnected(true);
      if (state === "disconnected" || state === "failed" || state === "closed") {
        setIsConnected(false);
      }
    };
  }, [socket, closePeerConnection]);

  useEffect(() => {
    if (!socket) return;
    
    const startCall = async () => {
      // 1. Asegurar Cámara
      if (!localStream.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStream.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        } catch (e) {
          console.error("[WebRTC] Error cámara:", e);
        }
      }

      // 2. Definir Listeners de Señalización
      socket.off("match-found"); 
      socket.on("match-found", async ({ partnerId, isInitiator }) => {
        console.log(`[WebRTC] 🔗 Iniciando conexión con: ${partnerId}`);
        createPeer(partnerId);
        
        if (isInitiator && peer.current) {
          // Breve pausa para asegurar que el peer receptor esté listo
          await new Promise(r => setTimeout(r, 1000));
          const offer = await peer.current.createOffer();
          await peer.current.setLocalDescription(offer);
          socket.emit("signal", { to: partnerId, data: offer });
        }
      });

      socket.off("signal");
      socket.on("signal", async ({ from, data }) => {
        if (!peer.current) createPeer(from);
        if (!peer.current) return;
        try {
          if (data.type === "offer") {
            await peer.current.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await peer.current.createAnswer();
            await peer.current.setLocalDescription(answer);
            socket.emit("signal", { to: from, data: answer });
          } else if (data.type === "answer") {
            await peer.current.setRemoteDescription(new RTCSessionDescription(data));
          } else if (data.type === "candidate" && data.candidate) {
            await peer.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        } catch (e) {
          console.warn("[WebRTC] Error en señal:", e);
        }
      });

      // ⚠️ ELIMINADO: Ya no escuchamos 'partner-left' ni emitimos 'find-match' aquí.
      // De eso se encarga 100% tu useMatchmaking.ts
    };

    startCall();

    return () => {
      socket.off("match-found");
      socket.off("signal");
      closePeerConnection();
    };
  }, [socket, createPeer, closePeerConnection]);

  return { localVideoRef, remoteVideoRef, isConnected, remoteStream };
};
