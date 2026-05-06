"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import type { GenderFilter } from "@/hooks/Usegenderfilter";
import type { UserGender } from "@/hooks/useProfile";

export type MatchMode = "discover" | "ligues" | string;

type MatchState = {
  room:        { id: string } | null;
  isInitiator: boolean;
};

export const useMatchmaking = (
  mode:         MatchMode,
  genderFilter: GenderFilter = "all",
  myGender:     UserGender   = undefined,
  /**
   * profileReady: true cuando useProfile ya terminó su fetch de Supabase.
   * Mientras sea false, el hook NO emite find-match aunque el socket esté listo.
   * Esto evita el race condition donde myGender llega undefined en el primer emit.
   */
  profileReady: boolean = false,
) => {
  const { socket, connectCount } = useSocket();

  const [matchState, setMatchState] = useState<MatchState>({
    room:        null,
    isInitiator: false,
  });
  const [searching, setSearching] = useState(false);

  const isFindingMatch  = useRef(false);
  const searchTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedMode   = useRef<MatchMode | null>(null);
  const socketRef       = useRef(socket);
  const prevModeRef     = useRef<MatchMode | null>(null);
  const genderFilterRef = useRef<GenderFilter>(genderFilter);
  const myGenderRef     = useRef<UserGender>(myGender);
  const prevGenderRef   = useRef<GenderFilter>(genderFilter);
  const profileReadyRef = useRef<boolean>(profileReady);

  useEffect(() => { socketRef.current       = socket;       }, [socket]);
  useEffect(() => { genderFilterRef.current = genderFilter; }, [genderFilter]);
  useEffect(() => { myGenderRef.current     = myGender;     }, [myGender]);
  useEffect(() => { profileReadyRef.current = profileReady; }, [profileReady]);

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

      // Bloquear si el perfil aún no cargó — el género sería undefined
      // y el filtro funcionaría mal (el usuario entraría a la cola sin género)
      if (!profileReadyRef.current) {
        console.log("[Matchmaking] ⏳ Esperando perfil antes de buscar...");
        // Reintentar en 300ms
        searchTimeout.current = setTimeout(() => doSearch(), 300);
        return;
      }

      const filter   = genderFilterRef.current;
      const myGender = myGenderRef.current;
      console.log(
        `[Matchmaking] 🔍 find-match → modo: "${targetMode}" | filtro: "${filter}" | miGénero: "${myGender ?? "?"}"`
      );
      isFindingMatch.current = true;
      committedMode.current  = targetMode;
      setSearching(true);
      setMatchState({ room: null, isInitiator: false });
      socketRef.current!.emit("find-match", {
        mode:         targetMode,
        genderFilter: filter,
        myGender,
      });
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
  useEffect(() => {
    const prevGender = prevGenderRef.current;
    prevGenderRef.current = genderFilter;

    if (prevGender === genderFilter) return;
    if (!socket?.connected) return;

    console.log(`[Matchmaking] 🚻 Filtro género cambió a "${genderFilter}". Reiniciando búsqueda...`);
    emitLeave();
    isFindingMatch.current = false;
    setMatchState({ room: null, isInitiator: false });
    setSearching(false);
    findNewMatch(mode, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genderFilter]);

  // ── Arrancar búsqueda cuando el perfil esté listo (si ya había socket) ───
  // Cubre el caso: socket conectó primero, profileReady llegó después.
  useEffect(() => {
    if (!profileReady) return;
    if (!socket?.connected) return;
    if (matchState.room || searching || isFindingMatch.current) return;

    console.log("[Matchmaking] ✅ Perfil listo. Iniciando búsqueda automática...");
    findNewMatch(mode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady]);

  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = (data: {
      partnerId:   string;
      isInitiator: boolean;
      mode?:       MatchMode;
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

    // Solo auto-buscar si el perfil ya está listo
    if (!matchState.room && !searching && !isFindingMatch.current && profileReadyRef.current) {
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
    room:        matchState.room,
    isInitiator: matchState.isInitiator,
    searching,
    setRoom: (room: { id: string } | null) =>
      setMatchState((prev) => ({ ...prev, room })),
    findNewMatch: findNewMatchPublic,
  };
};