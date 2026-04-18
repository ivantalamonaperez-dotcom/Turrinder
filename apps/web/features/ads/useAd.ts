"use client";

/**
 * useAd.ts — Auto-complete cuando el usuario vuelve a la pestaña
 *
 * PROBLEMA:
 *   El Vignette de Monetag se muestra en su propia pestaña/overlay.
 *   Cuando el usuario lo cierra, vuelve a Turrinder pero el AdOverlay
 *   seguía visible bloqueando la UI porque esperaba que hiciera clic
 *   en "Continuar". Si el countdown ya terminó, el ad debería
 *   completarse automáticamente al volver.
 *
 * SOLUCIÓN:
 *   Escuchar `visibilitychange` y `focus`. Si el countdown ya llegó
 *   a 0 cuando el usuario vuelve a la pestaña, completar el ad
 *   automáticamente sin requerir clic en "Continuar".
 *
 *   Exponemos `adReady` (countdown terminó) para que AdOverlay
 *   también pueda auto-completar si el usuario ya estaba en la pestaña.
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
  adReady: boolean;           // ← true cuando el countdown terminó
  reportAdCompleted: () => void;
}

const MONETAG_ZONE = "10891714";
const MONETAG_SRC  = "https://n6wxm.com/vignette.min.js";
const AD_WAIT_MS   = 15_000;

function isDevEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.");
}

let monetagInjected = false;

function injectMonetagScript() {
  if (monetagInjected) return;
  if (isDevEnvironment()) {
    console.log("[Ad] 🧪 Dev: Monetag omitido.");
    monetagInjected = true;
    return;
  }
  const script = document.createElement("script");
  script.dataset.zone = MONETAG_ZONE;
  script.src = MONETAG_SRC;
  script.async = true;
  script.onload  = () => console.log("[Ad] ✅ Monetag cargado.");
  script.onerror = () => console.warn("[Ad] ⚠️ Monetag no cargó.");
  document.body.appendChild(script);
  monetagInjected = true;
}

export function useAd(): UseAdReturn {
  const { socket } = useSocket();
  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });
  const [adReady,  setAdReady]  = useState(false);  // countdown terminó

  const adTokenRef   = useRef<string | null>(null);
  const adTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adReadyRef   = useRef(false); // ref para acceder en listeners sin stale closure

  useEffect(() => { injectMonetagScript(); }, []);

  const completeAd = useCallback(() => {
    if (!socket?.connected) return;
    const token = adTokenRef.current;
    if (!token) return;
    console.log("[Ad] ✅ Completando ad con token.");
    socket.emit("ad-completed", { token });
    adTokenRef.current = null;
    adReadyRef.current = false;
    setAdReady(false);
    if (adTimerRef.current) clearTimeout(adTimerRef.current);
  }, [socket]);

  // Alias público para el botón "Continuar"
  const reportAdCompleted = completeAd;

  // Cuando el usuario vuelve a la pestaña y el countdown ya terminó → auto-completar
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && adReadyRef.current) {
        console.log("[Ad] 👀 Usuario volvió a la pestaña, ad listo → auto-completando.");
        completeAd();
      }
    };

    const handleFocus = () => {
      if (adReadyRef.current) {
        console.log("[Ad] 🔍 Ventana recuperó foco, ad listo → auto-completando.");
        completeAd();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [completeAd]);

  useEffect(() => {
    if (!socket) return;

    const handleShowAd = ({ token }: { token: string | null }) => {
      console.log("[Ad] 📺 show-ad → AD_MODE.");
      adTokenRef.current = token && token.trim() !== "" ? token : null;
      adReadyRef.current = false;
      setAdReady(false);
      setAdMode("AD_MODE");

      // Iniciar countdown — cuando termina, marcar como listo
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
      adTimerRef.current = setTimeout(() => {
        console.log("[Ad] ⏱️ Countdown terminado → adReady = true.");
        adReadyRef.current = true;
        setAdReady(true);

        // Si el usuario ya está en la pestaña, completar de inmediato
        if (document.visibilityState === "visible") {
          console.log("[Ad] 👀 Usuario ya en pestaña → auto-completando.");
          // Pequeña pausa para que el usuario vea el botón habilitado
          setTimeout(() => completeAd(), 300);
        }
      }, AD_WAIT_MS);
    };

    const handleAdDone = () => {
      console.log("[Ad] 🎉 ad-done → IDLE.");
      setAdMode("IDLE");
      setAdReady(false);
      adReadyRef.current = false;
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
      setSkipInfo(prev => ({ ...prev, count: 0, remaining: prev.threshold }));
    };

    const handleAdError   = () => console.error("[Ad] ❌ ad-error.");
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
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    };
  }, [socket, completeAd]);

  return {
    adMode,
    skipInfo,
    isBlocked: adMode === "AD_MODE",
    adReady,
    reportAdCompleted,
  };
}