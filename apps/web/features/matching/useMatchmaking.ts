"use client";

/**
 * useMatchmaking — CON MODO
 *
 * CAMBIO: El hook ahora recibe un parámetro `mode` (default "discover").
 * Ese modo se envía al servidor en cada "find-match" para que el matchmaking
 * solo emparejecon usuarios del mismo modo.
 *
 * Uso:
 *   // En discover (solo skip + streamer, sin like)
 *   const { room, searching, findNewMatch } = useMatchmaking("discover");
 *
 *   // En la modalidad Ligues (con like)
 *   const { room, searching, findNewMatch } = useMatchmaking("ligues");
 *
 * Para agregar una nueva modalidad en el futuro, solo pasás el string
 * correspondiente — no hay que tocar el hook ni el servidor.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";

export type MatchMode = "discover" | "ligues" | string;

export const useMatchmaking = (mode: MatchMode = "discover") => {
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
      console.log(`[Matchmaking] 🔍 Emitiendo find-match (modo: ${mode})...`);
      isFindingMatch.current = true;
      setSearching(true);
      setRoom(null);
      // ← CLAVE: enviamos el modo al servidor
      socket.emit("find-match", { mode });
    };

    if (delayMs > 0) {
      setRoom(null);
      setSearching(true);
      searchTimeout.current = setTimeout(doSearch, delayMs);
    } else {
      doSearch();
    }
  }, [socket, mode]);

  // ── Listeners ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleMatchFound = (data: { partnerId: string; mode?: string }) => {
      clearSearchTimeout();
      console.log(`[Matchmaking] ✅ Match con: ${data.partnerId} (modo: ${data.mode ?? mode})`);
      setRoom({ id: data.partnerId });
      setSearching(false);
      isFindingMatch.current = false;
    };

    const handleWaiting = () => {
      console.log(`[Matchmaking] ⏳ En cola (modo: ${mode})...`);
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
  }, [socket, findNewMatch, mode]);

  // ── Disparador automático en cada conexión ───────────────────────────────
  useEffect(() => {
    if (connectCount === 0) return;
    if (!room && !searching && !isFindingMatch.current) {
      console.log(`[Matchmaking] 🚀 Búsqueda inicial [${mode}] (connectCount=${connectCount})...`);
      findNewMatch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectCount]);

  return { room, searching, setRoom, findNewMatch };
};