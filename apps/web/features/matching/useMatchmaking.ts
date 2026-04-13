"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";

export const useMatchmaking = () => {
  const socket = useSocket();
  const [room, setRoom] = useState<{ id: string } | null>(null);
  const [searching, setSearching] = useState(false);
  
  const isFindingMatch = useRef(false);

  const findNewMatch = useCallback(() => {
    if (!socket?.connected || isFindingMatch.current) return;
    
    console.log("[Matchmaking] 🔍 Iniciando búsqueda...");
    isFindingMatch.current = true;
    setSearching(true);
    // Al poner esto en null, nuestro nuevo useWebRTC destruye la cámara vieja al instante
    setRoom(null); 
    socket.emit("find-match");
  }, [socket]);

  // EFECTO 1: Listeners de Socket
  useEffect(() => {
    if (!socket) return;

    // 🔥 EL ARREGLO ESTÁ AQUÍ: Usamos data.partnerId en lugar de roomId
    const handleMatchFound = (data: { partnerId: string }) => {
      console.log("[Matchmaking] ✅ Match encontrado con:", data.partnerId);
      setRoom({ id: data.partnerId }); // ¡Ahora sí guarda un ID real!
      setSearching(false);
      isFindingMatch.current = false;
    };

    const handleWaiting = () => {
      console.log("[Matchmaking] ⏳ En cola de espera...");
      setSearching(true);
      isFindingMatch.current = false;
    };

    const handleError = (error: any) => {
      console.error("[Matchmaking] ❌ Error:", error);
      setSearching(false);
      isFindingMatch.current = false;
    };

    const handlePartnerLeft = () => {
      console.log("[Matchmaking] 💔 El compañero saltó o se desconectó.");
      findNewMatch(); 
    };

    socket.on("match-found", handleMatchFound);
    socket.on("waiting", handleWaiting);
    socket.on("error", handleError);
    socket.on("partner-left", handlePartnerLeft);

    return () => {
      socket.off("match-found", handleMatchFound);
      socket.off("waiting", handleWaiting);
      socket.off("error", handleError);
      socket.off("partner-left", handlePartnerLeft);
    };
  }, [socket, findNewMatch]);

  // EFECTO 2: Disparador automático
  useEffect(() => {
    if (socket?.connected && !room && !searching && !isFindingMatch.current) {
      console.log("[Matchmaking] 🚀 Disparando búsqueda inicial...");
      findNewMatch();
    }
  }, [socket?.connected, room, searching, findNewMatch]);

  return {
    room,
    searching,
    setRoom,
    findNewMatch,
  };
};
