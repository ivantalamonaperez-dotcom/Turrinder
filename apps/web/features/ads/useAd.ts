"use client";

/**
 * useAd.ts — Gestión de anuncios con Adsterra (Popunder)
 *
 * BUGS CORREGIDOS:
 *   1. El overlay se cerraba al instante porque "ad-done" llegaba antes
 *      de que el usuario clicara "Continuar". Ahora el servidor emite
 *      "ad-done" SOLO después de recibir "ad-completed" del frontend,
 *      y el frontend solo emite "ad-completed" cuando el usuario hace clic.
 *      → Se agrega un flag `adCompletedSentRef` para evitar doble emisión.
 *
 *   2. Los skips no se reiniciaban sin recargar porque el estado local
 *      `skipInfo` no se reseteaba si el flujo se cortaba. Ahora el reset
 *      siempre ocurre al recibir "ad-done", independientemente del flujo.
 *
 *   3. Popunder: se abre con window.open() en el momento exacto en que
 *      el servidor autoriza el anuncio ("show-ad"), no dentro del overlay.
 *      El overlay muestra el countdown de 15s para dar tiempo a que el
 *      popunder cargue en segundo plano.
 *
 * Flujo corregido:
 *   skip × 8 → servidor emite "show-ad" con token
 *   → hook abre popunder + activa AD_MODE → AdOverlay muestra 15s
 *   → usuario hace clic "Continuar" → hook emite "ad-completed"
 *   → servidor valida → emite "ad-done"
 *   → hook recibe "ad-done" → resetea IDLE + skipInfo sin recargar
 *   → matchmaking reanudado automáticamente
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";

export type AdMode = "IDLE" | "AD_MODE";

export interface SkipInfo {
  count: number;
  threshold: number;
  remaining: number;
}

export interface UseAdReturn {
  adMode: AdMode;
  skipInfo: SkipInfo;
  isBlocked: boolean;
  adContainerRef: React.RefObject<HTMLDivElement>;
  reportAdCompleted: () => void;
}

// ─── Adsterra Popunder ───────────────────────────────────────────────────────
// Reemplaza con tu Direct Link real de Adsterra:
// publishers.adsterra.com → tu zona Popunder → GET CODE → Direct Link
const ADSTERRA_POPUNDER_URL =
  "https://pl29156687.profitablecpmratenetwork.com/cb/05/2a/cb052aa79584c606592ea803f507ff2c.js";
// ────────────────────────────────────────────────────────────────────────────

/**
 * Abre el popunder en segundo plano.
 * Requiere que haya un gesto de usuario reciente en la cadena de llamadas
 * (el "skip" viene de un click, así que generalmente pasa el bloqueo del browser).
 * Si el browser lo bloquea igual, el overlay sigue funcionando con el countdown.
 */
function openPopunder(): void {
  try {
    const win = window.open(ADSTERRA_POPUNDER_URL, "_blank", "noopener,noreferrer");
    if (win) {
      win.blur();
      window.focus();
      console.log("[Ad] 📺 Popunder abierto.");
    } else {
      console.warn("[Ad] ⚠️ Browser bloqueó el popup — overlay activo de todos modos.");
    }
  } catch (e) {
    console.error("[Ad] Error abriendo popunder:", e);
  }
}

export function useAd(): UseAdReturn {
  const { socket } = useSocket();
  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });

  const adTokenRef          = useRef<string | null>(null);
  // Evita emitir "ad-completed" más de una vez por ciclo de anuncio
  const adCompletedSentRef  = useRef<boolean>(false);
  // Ref del contenedor del banner secundario (optional, dentro del overlay)
  const adContainerRef      = useRef<HTMLDivElement>(null!);

  /**
   * Llamado por AdOverlay cuando el usuario hace clic en "Continuar".
   * Solo emite una vez por ciclo gracias al flag.
   */
  const reportAdCompleted = useCallback(() => {
    if (!socket?.connected) {
      console.warn("[Ad] reportAdCompleted: socket no conectado");
      return;
    }
    if (!adTokenRef.current) {
      console.warn("[Ad] reportAdCompleted: sin token");
      return;
    }
    if (adCompletedSentRef.current) {
      // BUG FIX: evita que un segundo render o doble-click cierre el overlay prematuramente
      console.warn("[Ad] reportAdCompleted: ya emitido, ignorando duplicado");
      return;
    }

    adCompletedSentRef.current = true;
    socket.emit("ad-completed", { token: adTokenRef.current });
    console.log("[Ad] ✅ ad-completed enviado al servidor.");
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleShowAd = ({ token }: { token: string }) => {
      console.log("[Ad] show-ad recibido");

      // 1. Guardar token y resetear flag ANTES de abrir popup
      adTokenRef.current         = token;
      adCompletedSentRef.current = false;

      // 2. Abrir popunder (en contexto de evento de socket, cercano al click del usuario)
      openPopunder();

      // 3. Mostrar overlay modal
      setAdMode("AD_MODE");
    };

    const handleAdDone = () => {
      // BUG FIX #1 y #2: este es el ÚNICO lugar donde se cierra el overlay
      // y se resetean los skips — solo ocurre tras recibir "ad-done" del servidor,
      // que a su vez solo llega tras "ad-completed" del usuario (clic en Continuar).
      console.log("[Ad] ad-done recibido → reset completo");
      adTokenRef.current         = null;
      adCompletedSentRef.current = false;
      setAdMode("IDLE");
      setSkipInfo(prev => ({ ...prev, count: 0, remaining: prev.threshold }));
    };

    const handleAdError = ({ message }: { message?: string } = {}) => {
      console.warn("[Ad] ad-error:", message);
      // Resetear para permitir un nuevo intento en el mismo ciclo
      adCompletedSentRef.current = false;
      adTokenRef.current         = null;
      // Forzar re-mount del overlay para reiniciar el countdown
      setAdMode("IDLE");
      setTimeout(() => setAdMode("AD_MODE"), 50);
    };

    const handleSkipCount = (info: SkipInfo) => setSkipInfo(info);

    socket.on("show-ad",    handleShowAd);
    socket.on("ad-done",    handleAdDone);
    socket.on("ad-error",   handleAdError);
    socket.on("skip-count", handleSkipCount);

    return () => {
      socket.off("show-ad",    handleShowAd);
      socket.off("ad-done",    handleAdDone);
      socket.off("ad-error",   handleAdError);
      socket.off("skip-count", handleSkipCount);
    };
  }, [socket]);

  return {
    adMode,
    skipInfo,
    isBlocked: adMode === "AD_MODE",
    adContainerRef,
    reportAdCompleted,
  };
}