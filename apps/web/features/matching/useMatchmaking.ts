"use client";

/**
 * useMatchmaking — SIN LEAVE EN CLEANUP DE EFECTO
 *
 * PROBLEMA RAÍZ del no-match:
 *   El cleanup del useEffect emitía "leave-matchmaking" cada vez que
 *   React desmontaba el componente — lo cual ocurre en cada Fast Refresh,
 *   en StrictMode (doble mount), y en transiciones de ruta.
 *   Resultado: el usuario entraba en cola, React remontaba, el cleanup
 *   lo sacaba, y cuando el otro usuario llegaba la cola estaba vacía.
 *
 * SOLUCIÓN:
 *   - El cleanup del useEffect NO emite leave.
 *   - El leave solo se emite en eventos reales de cierre de página
 *     (beforeunload / visibilitychange a hidden) via un efecto separado
 *     que solo corre una vez al montar.
 *   - Esto es idéntico al comportamiento de la versión original que
 *     funcionaba, más el parámetro de modo.
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

  // ── Listeners — cleanup SIN leave ────────────────────────────────────────
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
      // ← Solo limpiamos listeners y timeout.
      // NO emitimos leave aquí — evita que Fast Refresh / remounts
      // saquen al usuario de la cola innecesariamente.
      socket.off("match-found",  handleMatchFound);
      socket.off("waiting",      handleWaiting);
      socket.off("error",        handleError);
      socket.off("partner-left", handlePartnerLeft);
      clearSearchTimeout();
    };
  }, [socket, findNewMatch, mode]);

  // ── Leave SOLO al cerrar/salir de la página real ──────────────────────────
  useEffect(() => {
    if (!socket) return;

    const emitLeave = () => {
      if (socket.connected) {
        socket.emit("leave-matchmaking");
        console.log(`[Matchmaking] 🚪 Página cerrada, leave emitido (modo: ${mode})`);
      }
    };

    // beforeunload: cierre de pestaña / navegador
    window.addEventListener("beforeunload", emitLeave);

    // visibilitychange: minimizar en móvil o cambiar de pestaña
    const onVisibility = () => {
      if (document.visibilityState === "hidden") emitLeave();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("beforeunload", emitLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [socket, mode]);

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