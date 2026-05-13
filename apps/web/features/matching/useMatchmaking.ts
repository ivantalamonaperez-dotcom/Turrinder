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
   */
  profileReady: boolean = false,
) => {
  const { socket, connectCount } = useSocket();

  const [matchState, setMatchState] = useState<MatchState>({
    room:        null,
    isInitiator: false,
  });
  const [searching, setSearching] = useState(false);

  // ── Refs de estado (evitan closures viejas en callbacks/timeouts) ──────────
  const isFindingMatch  = useRef(false);
  const searchTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedMode   = useRef<MatchMode | null>(null);
  const socketRef       = useRef(socket);
  const prevModeRef     = useRef<MatchMode | null>(null);
  const genderFilterRef = useRef<GenderFilter>(genderFilter);
  const myGenderRef     = useRef<UserGender>(myGender);
  const prevGenderRef   = useRef<GenderFilter>(genderFilter);
  const profileReadyRef = useRef<boolean>(profileReady);

  // FIX: ref para evitar que React Strict Mode (doble ejecución de efectos)
  // dispare dos búsquedas simultáneas. Se resetea solo cuando el socket
  // se reconecta (connectCount cambia), no en cada render.
  const didStartSearchRef = useRef(false);

  // FIX: guardar connectCount anterior para detectar reconexiones reales
  // vs. la primera conexión. Así evitamos disparar findNewMatch antes
  // de que profileReady sea true en la reconexión.
  const prevConnectCountRef = useRef(0);

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

  // ── findNewMatch ────────────────────────────────────────────────────────────
  // FIX: eliminamos el retry-loop interno para profileReady.
  // Si el perfil no está listo simplemente salimos — el efecto que observa
  // profileReady se encargará de arrancar la búsqueda cuando corresponda.
  // Esto corta el loop infinito de setTimeout que se acumulaba.
  const findNewMatch = useCallback((targetMode: MatchMode, delayMs = 0) => {
    if (!socketRef.current?.connected) return;
    if (isFindingMatch.current) return;

    // Si el perfil aún no cargó, no buscar. El efecto de profileReady
    // arrancará la búsqueda cuando esté listo.
    if (!profileReadyRef.current) {
      console.log("[Matchmaking] ⏳ Perfil no listo, búsqueda pospuesta.");
      return;
    }

    clearSearchTimeout();

    const doSearch = () => {
      if (!socketRef.current?.connected) return;
      if (!profileReadyRef.current) return; // doble check por si cambió durante el delay

      const filter   = genderFilterRef.current;
      const myGender = myGenderRef.current;

      console.log(
        `[Matchmaking] 🔍 find-match → modo: "${targetMode}" | filtro: "${filter}" | miGénero: "${myGender ?? "?"}"`
      );

      isFindingMatch.current = true;
      committedMode.current  = targetMode;
      didStartSearchRef.current = true;

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

  // ── Efecto: profileReady llegó (caso: socket ya conectado, perfil tardó) ──
  // Cubre el race condition más común: el socket conectó en el primer render,
  // profileReady era false, y llega true después.
  // FIX: solo arranca si nadie ya inició una búsqueda en esta sesión.
  useEffect(() => {
    if (!profileReady) return;
    if (!socket?.connected) return;
    if (matchState.room) return;
    if (isFindingMatch.current) return;
    if (didStartSearchRef.current) return; // ya buscó en esta conexión

    console.log("[Matchmaking] ✅ Perfil listo. Iniciando búsqueda automática...");
    findNewMatch(mode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady]);

  // ── Efecto: cambio de filtro de género ─────────────────────────────────────
  useEffect(() => {
    const prevGender = prevGenderRef.current;
    prevGenderRef.current = genderFilter;

    if (prevGender === genderFilter) return;
    if (!socket?.connected) return;
    if (!profileReady) return; // no reiniciar si el perfil aún no cargó

    console.log(`[Matchmaking] 🚻 Filtro género cambió a "${genderFilter}". Reiniciando búsqueda...`);
    emitLeave();
    isFindingMatch.current    = false;
    didStartSearchRef.current = false;
    setMatchState({ room: null, isInitiator: false });
    setSearching(false);
    findNewMatch(mode, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genderFilter]);

  // ── Efecto: listeners de socket ────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = (data: {
      partnerId:   string;
      isInitiator: boolean;
      mode?:       MatchMode;
    }) => {
      // Si el match llegó para un modo distinto al que esperamos, reiniciar
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
      isFindingMatch.current    = false;
      didStartSearchRef.current = false;
      setMatchState({ room: null, isInitiator: false });
      // FIX: solo reiniciar si el perfil ya está listo
      if (profileReadyRef.current) {
        findNewMatch(mode, 1500);
      }
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

  // ── Efecto: conectCount / modo cambia ──────────────────────────────────────
  // FIX: separamos la lógica de "primera conexión" de "reconexión" y de
  // "cambio de modo" para evitar que se solapen y generen búsquedas dobles.
  useEffect(() => {
    if (!socket?.connected || connectCount === 0) return;

    const isFirstRun  = prevModeRef.current === null;
    const modeChanged = !isFirstRun && prevModeRef.current !== mode;
    const isReconnect = !isFirstRun && connectCount !== prevConnectCountRef.current;

    prevModeRef.current       = mode;
    prevConnectCountRef.current = connectCount;

    if (modeChanged) {
      console.log(`[Matchmaking] 🔄 Modo "${mode}" detectado. Leave + re-search`);
      emitLeave();
      isFindingMatch.current    = false;
      didStartSearchRef.current = false;
      setMatchState({ room: null, isInitiator: false });
      setSearching(false);
      // Solo buscar si el perfil ya está listo
      if (profileReadyRef.current) {
        findNewMatch(mode, 300);
      }
      return;
    }

    if (isReconnect) {
      // El socket se reconectó (ej. pérdida de red momentánea).
      // Resetear flags para que el efecto de profileReady arranque de nuevo.
      console.log(`[Matchmaking] 🔌 Reconexión detectada. Reseteando estado...`);
      isFindingMatch.current    = false;
      didStartSearchRef.current = false;
      setMatchState({ room: null, isInitiator: false });
      setSearching(false);
      // Solo buscar si el perfil ya está listo
      if (profileReadyRef.current) {
        findNewMatch(mode, 300);
      }
      return;
    }

    // Primera conexión: solo buscar si profileReady ya llegó.
    // Si no llegó, el efecto de profileReady se encarga.
    if (isFirstRun) {
      if (
        !matchState.room         &&
        !searching               &&
        !isFindingMatch.current  &&
        !didStartSearchRef.current &&
        profileReadyRef.current
      ) {
        console.log(`[Matchmaking] 🚀 Auto-búsqueda inicial en modo: "${mode}"`);
        findNewMatch(mode);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectCount, mode]);

  // ── Cleanup al desmontar ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearSearchTimeout();
      emitLeave();
      isFindingMatch.current    = false;
      didStartSearchRef.current = false;
      committedMode.current     = null;
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