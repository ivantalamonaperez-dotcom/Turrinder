"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import type { GenderFilter } from "@/hooks/Usegenderfilter";

export type MatchMode = "discover" | "ligues" | string;

// room e isInitiator en un solo objeto para actualizarse atómicamente
// y evitar renders intermedios con combinaciones inválidas.
type MatchState = {
  room: { id: string } | null;
  isInitiator: boolean;
};

export const useMatchmaking = (mode: MatchMode, genderFilter: GenderFilter = "all") => {
  const { socket, connectCount } = useSocket();

  const [matchState, setMatchState] = useState<MatchState>({
    room: null,
    isInitiator: false,
  });
  const [searching, setSearching] = useState(false);

  const isFindingMatch = useRef(false);
  const searchTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedMode  = useRef<MatchMode | null>(null);
  const socketRef      = useRef(socket);
  const prevModeRef    = useRef<MatchMode | null>(null);
  // Ref para el filtro de género — permite leerlo en closures sin re-disparar efectos
  const genderFilterRef = useRef<GenderFilter>(genderFilter);
  const prevGenderRef   = useRef<GenderFilter>(genderFilter);

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { genderFilterRef.current = genderFilter; }, [genderFilter]);

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
      const filter = genderFilterRef.current;
      console.log(`[Matchmaking] 🔍 find-match → modo: "${targetMode}" | género: "${filter}"`);
      isFindingMatch.current = true;
      committedMode.current  = targetMode;
      setSearching(true);
      // Reset atómico: room=null, isInitiator=false en un solo setState
      setMatchState({ room: null, isInitiator: false });
      socketRef.current!.emit("find-match", { mode: targetMode, genderFilter: filter });
    };

    if (delayMs > 0) {
      setMatchState({ room: null, isInitiator: false });
      setSearching(true);
      searchTimeout.current = setTimeout(doSearch, delayMs);
    } else {
      doSearch();
    }
  }, [clearSearchTimeout]);

  const findNewMatchPublic = useCallback((delayMs = 0) => {
    findNewMatch(mode, delayMs);
  }, [findNewMatch, mode]);

  // ── Reaccionar al cambio de filtro de género ─────────────────────────────
  // Si el filtro cambia mientras hay búsqueda o match activo, reiniciamos.
  useEffect(() => {
    const prevGender = prevGenderRef.current;
    prevGenderRef.current = genderFilter;

    if (prevGender === genderFilter) return; // primera ejecución o sin cambio real
    if (!socket?.connected) return;

    console.log(`[Matchmaking] 🚻 Filtro género "${genderFilter}". Leave + re-search`);
    emitLeave();
    isFindingMatch.current = false;
    setMatchState({ room: null, isInitiator: false });
    setSearching(false);
    findNewMatch(mode, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genderFilter]);

  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = (data: {
      partnerId: string;
      isInitiator: boolean;
      mode?: MatchMode;
    }) => {
      if (data.mode && data.mode !== committedMode.current) {
        console.warn(
          `[Matchmaking] ⚠️ Match en modo "${data.mode}" pero esperaba "${committedMode.current}" — descartando`
        );
        isFindingMatch.current = false;
        findNewMatch(committedMode.current ?? mode, 200);
        return;
      }
      clearSearchTimeout();
      // UN SOLO setState: room e isInitiator se actualizan juntos.
      setMatchState({ room: { id: data.partnerId }, isInitiator: data.isInitiator });
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
      setMatchState({ room: null, isInitiator: false });
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
      setMatchState({ room: null, isInitiator: false });
      setSearching(false);
      findNewMatch(mode, 300);
      return;
    }

    if (!matchState.room && !searching && !isFindingMatch.current) {
      console.log(`[Matchmaking] 🚀 Auto-búsqueda en modo: "${mode}" | género: "${genderFilter}"`);
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
    room:        matchState.room,
    isInitiator: matchState.isInitiator,
    searching,
    setRoom: (room: { id: string } | null) =>
      setMatchState((prev) => ({ ...prev, room })),
    findNewMatch: findNewMatchPublic,
  };
};