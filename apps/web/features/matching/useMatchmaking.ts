"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";

export type MatchMode = "discover" | "ligues" | string;

export const useMatchmaking = (mode: MatchMode) => {
  const { socket, connectCount } = useSocket();
  const [room,        setRoom]        = useState<{ id: string } | null>(null);
  const [searching,   setSearching]   = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);

  const isFindingMatch = useRef(false);
  const searchTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedMode  = useRef<MatchMode | null>(null);
  const socketRef      = useRef(socket);
  const prevModeRef    = useRef<MatchMode | null>(null);

  useEffect(() => { socketRef.current = socket; }, [socket]);

  const clearSearchTimeout = useCallback(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
      searchTimeout.current = null;
    }
  }, []);

  const emitLeave = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave-matchmaking");
    }
  }, []);

  const findNewMatch = useCallback((targetMode: MatchMode, delayMs = 0) => {
    if (!socketRef.current?.connected) return;
    if (isFindingMatch.current) return;

    clearSearchTimeout();

    const doSearch = () => {
      if (!socketRef.current?.connected) return;
      console.log(`[Matchmaking] 🔍 find-match → modo: "${targetMode}"`);
      isFindingMatch.current = true;
      committedMode.current  = targetMode;
      setSearching(true);
      setRoom(null);
      setIsInitiator(false);
      socketRef.current!.emit("find-match", { mode: targetMode });
    };

    if (delayMs > 0) {
      setRoom(null);
      setSearching(true);
      searchTimeout.current = setTimeout(doSearch, delayMs);
    } else {
      doSearch();
    }
  }, [clearSearchTimeout]);

  const findNewMatchPublic = useCallback((delayMs = 0) => {
    findNewMatch(mode, delayMs);
  }, [findNewMatch, mode]);

  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = (data: { partnerId: string; isInitiator: boolean; mode?: MatchMode }) => {
      if (data.mode && data.mode !== committedMode.current) {
        console.warn(
          `[Matchmaking] ⚠️ Match en modo "${data.mode}" pero esperaba "${committedMode.current}" — descartando`
        );
        isFindingMatch.current = false;
        findNewMatch(committedMode.current ?? mode, 200);
        return;
      }
      clearSearchTimeout();
      // Primero isInitiator, luego room — así useWebRTC ve el valor correcto
      // cuando el efecto de currentRoomId se dispara
      setIsInitiator(data.isInitiator);
      setRoom({ id: data.partnerId });
      setSearching(false);
      isFindingMatch.current = false;
    };

    const handleWaiting = () => {
      setSearching(true);
      isFindingMatch.current = false;
    };

    const handlePartnerLeft = () => {
      console.log("[Matchmaking] 💔 Partner se fue. Reiniciando...");
      isFindingMatch.current = false;
      setRoom(null);
      setIsInitiator(false);
      findNewMatch(mode, 1500);
    };

    socket.on("match-found",  handleMatchFound);
    socket.on("waiting",      handleWaiting);
    socket.on("partner-left", handlePartnerLeft);

    return () => {
      socket.off("match-found",  handleMatchFound);
      socket.off("waiting",      handleWaiting);
      socket.off("partner-left", handlePartnerLeft);
      clearSearchTimeout();
    };
  }, [socket, mode, findNewMatch, clearSearchTimeout]);

  useEffect(() => {
    if (!socket?.connected || connectCount === 0) return;

    const isFirstRun  = prevModeRef.current === null;
    const modeChanged = !isFirstRun && prevModeRef.current !== mode;
    prevModeRef.current = mode;

    if (modeChanged) {
      console.log(`[Matchmaking] 🔄 Modo "${mode}" detectado. Leave + re-search`);
      emitLeave();
      isFindingMatch.current = false;
      setRoom(null);
      setSearching(false);
      setIsInitiator(false);
      findNewMatch(mode, 300);
      return;
    }

    if (!room && !searching && !isFindingMatch.current) {
      console.log(`[Matchmaking] 🚀 Auto-búsqueda en modo: "${mode}"`);
      findNewMatch(mode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectCount, socket?.connected, mode]);

  useEffect(() => {
    return () => {
      clearSearchTimeout();
      emitLeave();
      isFindingMatch.current = false;
      committedMode.current  = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    room,
    searching,
    isInitiator,
    setRoom,
    findNewMatch: findNewMatchPublic,
  };
};