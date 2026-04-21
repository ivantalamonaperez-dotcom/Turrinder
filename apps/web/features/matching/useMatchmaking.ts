"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";

export type MatchMode = "discover" | "ligues" | string;

export const useMatchmaking = (mode: MatchMode) => {
  const { socket, connectCount } = useSocket();
  const [room,      setRoom]      = useState<{ id: string } | null>(null);
  const [searching, setSearching] = useState(false);

  const isFindingMatch = useRef(false);
  const searchTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedMode  = useRef<MatchMode | null>(null);
  const socketRef      = useRef(socket);
  const prevModeRef    = useRef<MatchMode | null>(null);

  useEffect(() => { socketRef.current = socket; }, [socket]);

  // ─── helpers ────────────────────────────────────────────────────────────────

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

  // ─── findNewMatch ────────────────────────────────────────────────────────────
  // Recibe el modo explícitamente para evitar closures con valor viejo

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

  // Wrapper público — usa siempre el modo actual del hook
  const findNewMatchPublic = useCallback((delayMs = 0) => {
    findNewMatch(mode, delayMs);
  }, [findNewMatch, mode]);

  // ─── Eventos de socket ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = (data: { partnerId: string; mode?: MatchMode }) => {
      // Si el server nos emparejó en otro modo (race condition), ignorar y re-buscar
      if (data.mode && data.mode !== committedMode.current) {
        console.warn(
          `[Matchmaking] ⚠️ Match en modo "${data.mode}" pero esperaba "${committedMode.current}" — descartando`
        );
        isFindingMatch.current = false;
        findNewMatch(committedMode.current ?? mode, 200);
        return;
      }
      clearSearchTimeout();
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

  // ─── Auto-trigger ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket?.connected || connectCount === 0) return;

    const isFirstRun   = prevModeRef.current === null;
    const modeChanged  = !isFirstRun && prevModeRef.current !== mode;
    prevModeRef.current = mode;

    if (modeChanged) {
      // Navegación SPA: salir de la sesión anterior, entrar en la nueva cola
      console.log(`[Matchmaking] 🔄 Modo "${mode}" detectado. Leave + re-search`);
      emitLeave();
      isFindingMatch.current = false;
      setRoom(null);
      setSearching(false);
      findNewMatch(mode, 300);
      return;
    }

    // Primera conexión / reconexión
    if (!room && !searching && !isFindingMatch.current) {
      console.log(`[Matchmaking] 🚀 Auto-búsqueda en modo: "${mode}"`);
      findNewMatch(mode);
    }
  // Solo queremos que esto corra cuando el socket conecta o el modo cambia
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectCount, socket?.connected, mode]);

  // ─── Cleanup al desmontar (salir de la página) ───────────────────────────────

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
    setRoom,
    findNewMatch: findNewMatchPublic,
  };
};