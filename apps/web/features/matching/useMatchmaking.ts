"use client";

/**
 * useMatchmaking — CON MODO + CLEANUP AL DESMONTAR
 *
 * FIXES:
 *
 * 1. MODO INCORRECTO AL NAVEGAR:
 *    Al pasar de /discover a /modalidades/ligues, el hook de discover
 *    se desmontaba sin emitir "leave-matchmaking", dejando al usuario
 *    en la cola de "discover". El nuevo hook de ligues entonces emitía
 *    "find-match" con "ligues" pero el servidor lo sacaba de la cola
 *    equivocada (o encontraba el match en discover).
 *
 *    Solución: emitir "leave-matchmaking" en el cleanup del useEffect
 *    principal, garantizando que al desmontar el usuario salga de
 *    cualquier cola en la que esté.
 *
 * 2. LISTENERS DUPLICADOS:
 *    Con el socket singleton, si dos instancias del hook estaban vivas
 *    a la vez (StrictMode o navegación rápida), los listeners se
 *    acumulaban. Ahora el off() en el cleanup es simétrico al on().
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

  // ── Listeners + cleanup al desmontar ─────────────────────────────────────
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

      // ← CLAVE: al desmontar, salimos de la cola del servidor.
      // Esto evita que el usuario quede "fantasma" en la cola de un modo
      // después de navegar a otra página o modalidad.
      if (socket.connected) {
        socket.emit("leave-matchmaking");
        console.log(`[Matchmaking] 🚪 Desmontando hook (modo: ${mode}), leave emitido.`);
      }
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