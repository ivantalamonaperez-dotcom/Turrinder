"use client";

/**
 * useMatchmaking — CON DELAY EN SKIP
 *
 * CAMBIO: findNewMatch ahora acepta un parámetro `delayMs` (default 0).
 * - nextUser en page.tsx puede llamar findNewMatch() sin delay.
 * - handlePartnerLeft usa 1000ms de delay para que la transición sea suave.
 * - El delay también evita que dos usuarios se "crucen" y ambos busquen
 *   a la vez, terminando en cola en lugar de emparejarse entre sí.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";

export const useMatchmaking = () => {
  const { socket, connectCount } = useSocket();
  const [room,      setRoom]      = useState<{ id: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const isFindingMatch = useRef(false);
  const searchTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSearchTimeout = () => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
      searchTimeout.current = null;
    }
  };

  const findNewMatch = useCallback((delayMs = 0) => {
    if (!socket?.connected) {
      console.warn("[Matchmaking] Socket no conectado.");
      return;
    }
    if (isFindingMatch.current) return;

    clearSearchTimeout();

    const doSearch = () => {
      if (!socket?.connected) return;
      console.log("[Matchmaking] 🔍 Emitiendo find-match...");
      isFindingMatch.current = true;
      setSearching(true);
      setRoom(null);
      socket.emit("find-match");
    };

    if (delayMs > 0) {
      // Mostrar el radar inmediatamente aunque la búsqueda tenga delay
      setRoom(null);
      setSearching(true);
      searchTimeout.current = setTimeout(doSearch, delayMs);
    } else {
      doSearch();
    }
  }, [socket]);

  // ── Listeners ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = (data: { partnerId: string }) => {
      clearSearchTimeout();
      console.log("[Matchmaking] ✅ Match con:", data.partnerId);
      setRoom({ id: data.partnerId });
      setSearching(false);
      isFindingMatch.current = false;
    };

    const handleWaiting = () => {
      console.log("[Matchmaking] ⏳ En cola...");
      setSearching(true);
      isFindingMatch.current = false;
    };

    const handleError = (err: any) => {
      console.error("[Matchmaking] ❌ Error:", err);
      setSearching(false);
      isFindingMatch.current = false;
    };

    const handlePartnerLeft = () => {
      console.log("[Matchmaking] 💔 Compañero se fue.");
      isFindingMatch.current = false;
      // 1 segundo de pausa antes de buscar — transición suave + evita cruce
      findNewMatch(1000);
    };

    socket.on("match-found",  handleMatchFound);
    socket.on("waiting",      handleWaiting);
    socket.on("error",        handleError);
    socket.on("partner-left", handlePartnerLeft);

    return () => {
      socket.off("match-found",  handleMatchFound);
      socket.off("waiting",      handleWaiting);
      socket.off("error",        handleError);
      socket.off("partner-left", handlePartnerLeft);
      clearSearchTimeout();
    };
  }, [socket, findNewMatch]);

  // ── Disparador automático en cada conexión ───────────────────────────────
  useEffect(() => {
    if (connectCount === 0) return;
    if (!room && !searching && !isFindingMatch.current) {
      console.log(`[Matchmaking] 🚀 Búsqueda inicial (connectCount=${connectCount})...`);
      findNewMatch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectCount]);

  return { room, searching, setRoom, findNewMatch };
};