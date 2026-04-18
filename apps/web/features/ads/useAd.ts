"use client";

/**
 * useAd.ts — Monetag Vignette Banner
 *
 * Cómo funciona el Vignette:
 *   El script de Monetag se inyecta UNA SOLA VEZ en el body al montar.
 *   Cuando queremos mostrar el anuncio, Monetag lo dispara automáticamente.
 *   El vignette aparece como un overlay ENCIMA de todo (z-index propio de Monetag).
 *   Nuestro AdOverlay muestra el countdown por debajo mientras el vignette está activo.
 *
 * El script:
 *   Zone: 10891714
 *   Src: https://n6wxm.com/vignette.min.js
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
  reportAdCompleted: () => void;
}

const MONETAG_ZONE    = "10891714";
const MONETAG_SRC     = "https://n6wxm.com/vignette.min.js";

function isDevEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.");
}

// Singleton: el script solo se agrega una vez por sesión
let monetagInjected = false;

function injectMonetagScript() {
  if (monetagInjected) return;
  if (isDevEnvironment()) {
    console.log("[Ad] 🧪 Dev: script Monetag omitido.");
    monetagInjected = true;
    return;
  }

  const script = document.createElement("script");
  script.dataset.zone = MONETAG_ZONE;
  script.src = MONETAG_SRC;
  script.async = true;

  script.onload  = () => console.log("[Ad] ✅ Monetag Vignette cargado.");
  script.onerror = () => console.warn("[Ad] ⚠️ Monetag no cargó (red/adblocker).");

  document.body.appendChild(script);
  monetagInjected = true;
  console.log("[Ad] 📺 Script Monetag inyectado.");
}

export function useAd(): UseAdReturn {
  const { socket } = useSocket();
  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });
  const adTokenRef = useRef<string | null>(null);

  // Inyectar el script de Monetag al montar (una sola vez)
  useEffect(() => {
    injectMonetagScript();
  }, []);

  const reportAdCompleted = useCallback(() => {
    if (!socket?.connected) return;
    const token = adTokenRef.current;
    if (!token) return;
    socket.emit("ad-completed", { token });
    adTokenRef.current = null;
    console.log("[Ad] ✅ ad-completed reportado.");
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleShowAd = ({ token }: { token: string | null }) => {
      console.log("[Ad] 📺 show-ad → activando AD_MODE.");
      adTokenRef.current = token && token.trim() !== "" ? token : null;
      setAdMode("AD_MODE");
      // El vignette de Monetag se dispara automáticamente al detectar
      // actividad en la página. El AdOverlay muestra el countdown.
    };

    const handleAdDone = () => {
      console.log("[Ad] 🎉 ad-done → IDLE.");
      setAdMode("IDLE");
      setSkipInfo(prev => ({ ...prev, count: 0, remaining: prev.threshold }));
    };

    const handleAdError = () => console.error("[Ad] ❌ ad-error.");

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
    reportAdCompleted,
  };
}