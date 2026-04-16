"use client";

/**
 * useAd.ts — Corregido para Popunder
 *
 * BUGS CORREGIDOS:
 * 1. adContainerRef eliminado — el Popunder no necesita div en la página.
 *    El overlay anterior intentaba inyectar en un div vacío → "Cargando anuncio..."
 *
 * 2. Guard de token nulo: si show-ad llega con token null (re-envío por bypass),
 *    no llamamos reportAdCompleted automáticamente. El usuario debe esperar
 *    el countdown igual.
 *
 * 3. El overlay se cerraba solo porque token=null pasaba la validación vacía.
 *    Ahora guardamos el token solo si es string no vacío.
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

// ── Script real de Adsterra (Popunder - turrinder.vercel.app) ────────────────
const ADSTERRA_SCRIPT_URL =
  "https://pl29155233.profitablecpmratenetwork.com/18/d5/29/18d5299059da1c91673a62219c2825a0.js";

let popunderInjected = false;

function triggerPopunder() {
  if (popunderInjected) {
    // El script ya está — el popunder se re-dispara con la próxima interacción
    console.log("[Ad] 🔁 Popunder ya inyectado.");
    return;
  }

  const script = document.createElement("script");
  script.src = ADSTERRA_SCRIPT_URL;
  script.async = true;
  script.setAttribute("data-cfasync", "false");
  script.onload = () => {
    popunderInjected = true;
    console.log("[Ad] ✅ Script Popunder cargado.");
  };
  script.onerror = () => {
    console.warn("[Ad] ⚠️ No se cargó el script (¿adblocker?)");
  };

  document.head.appendChild(script);
  console.log("[Ad] 📺 Inyectando Popunder...");
}

export function useAd(): UseAdReturn {
  const { socket } = useSocket();
  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });
  const adTokenRef = useRef<string | null>(null);

  /**
   * reportAdCompleted: el usuario hizo clic en "Continuar" tras el countdown.
   * Solo emite si tenemos un token válido del servidor.
   */
  const reportAdCompleted = useCallback(() => {
    if (!socket?.connected) return;

    const token = adTokenRef.current;

    // ← GUARD: token nulo = bypass attempt, no emitir
    if (!token || token.trim() === "") {
      console.warn("[Ad] ⚠️ Sin token válido, no se puede reportar ad-completed.");
      return;
    }

    console.log("[Ad] ✅ Reportando ad-completed.");
    socket.emit("ad-completed", { token });
    adTokenRef.current = null;
    // El estado vuelve a IDLE cuando el servidor responde "ad-done"
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleShowAd = ({ token }: { token: string | null }) => {
      console.log("[Ad] 📺 show-ad recibido.");

      // Guardar token solo si es válido
      if (token && token.trim() !== "") {
        adTokenRef.current = token;
      } else {
        console.warn("[Ad] ⚠️ Token nulo recibido (posible re-envío). El usuario igual debe esperar el countdown.");
        adTokenRef.current = null;
      }

      setAdMode("AD_MODE");
      triggerPopunder();
    };

    const handleAdDone = () => {
      console.log("[Ad] 🎉 ad-done → IDLE.");
      setAdMode("IDLE");
      setSkipInfo(prev => ({ ...prev, count: 0, remaining: prev.threshold }));
    };

    const handleAdError = ({ message }: { message: string }) => {
      console.error("[Ad] ❌ Error:", message);
      // Mantener en AD_MODE, el overlay sigue visible
      // El usuario puede intentar de nuevo cuando expire el overlay
    };

    const handleSkipCount = (info: SkipInfo) => {
      setSkipInfo(info);
    };

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