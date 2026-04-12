// apps/web/features/matching/useMatchmaking.ts
import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";

export const useMatchmaking = () => {
  const socket = useSocket();
  
  // Mantenemos el estado de 'room' para que DiscoverPage pueda leerlo y resetearlo
  const [room, setRoom] = useState<{ id: string } | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [searching, setSearching] = useState(true);
  
  // Usamos una ref para evitar bucles infinitos en el useEffect
  const hasJoinedQueue = useRef(false);

  const startSearch = useCallback(() => {
    if (!socket) return;
    console.log("🔍 Buscando nuevo match...");
    setSearching(true);
    setRoom(null);
    setIsInitiator(false);
    socket.emit("find-match");
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    // Si no hay sala y no estamos buscando, iniciamos búsqueda
    if (!room && !hasJoinedQueue.current) {
      startSearch();
      hasJoinedQueue.current = true;
    }

    socket.on("match-found", ({ partnerId: newPartnerId, isInitiator: initiator }) => {
      if (newPartnerId) {
        console.log("🎯 Match encontrado con:", newPartnerId);
        // Seteamos el objeto room para que useMatchUser(room) se dispare
        setRoom({ id: newPartnerId }); 
        setIsInitiator(initiator);
        setSearching(false);
        hasJoinedQueue.current = false;
      } else {
        setRoom(null);
        setSearching(true);
      }
    });

    socket.on("waiting", () => {
      console.log("⏳ En cola de espera...");
      setRoom(null);
      setSearching(true);
    });

    socket.on("partner-left", () => {
      console.log("👤 El compañero se fue");
      setRoom(null);
      setSearching(true);
      // Re-intentar búsqueda automáticamente
      setTimeout(() => startSearch(), 1000);
    });

    return () => {
      socket.off("match-found");
      socket.off("waiting");
      socket.off("partner-left");
    };
  }, [socket, startSearch, room]);

  return { 
    room,         // Ahora DiscoverPage recibe el objeto esperado
    setRoom,      // Ahora nextUser puede hacer setRoom(null)
    isInitiator, 
    searching, 
    startSearch 
  };
};