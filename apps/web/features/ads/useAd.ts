"use client";

/**
 * useAd.ts — Integración con Adsterra Popunder real
 *
 * Zona: 29054734 (turrinder.vercel.app)
 * Tipo: Popunder
 *
 * Cómo funciona el Popunder:
 *   - Al dispararse, abre una nueva pestaña/ventana en segundo plano
 *   - No se puede detectar cuándo el usuario la cierra
 *   - Por eso usamos el timer de 15s en el overlay como confirmación
 *   - El script solo se dispara UNA VEZ por sesión de AD_MODE
 *
 * Flujo:
 *   "show-ad" → activar AD_MODE → disparar Popunder → mostrar AdOverlay con timer
 *   → usuario espera 15s → botón "Continuar" → emitir "ad-completed" → servidor valida → IDLE
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

// ── Configuración real de Adsterra ────────────────────────────────────────────
const ADSTERRA_SCRIPT_URL =
  "https://pl29155233.profitablecpmratenetwork.com/18/d5/29/18d5299059da1c91673a62219c2825a0.js";

/** Inyecta el script del Popunder en el <head> una sola vez */
let popunderLoaded = false;

function triggerPopunder() {
  if (popunderLoaded) {
    // El script ya está en el DOM — el Popunder se re-dispara
    // automáticamente en el siguiente clic del usuario (comportamiento nativo)
    console.log("[Ad] 🔁 Popunder ya cargado, se disparará en próxima interacción.");
    return;
  }

  const script = document.createElement("script");
  script.src = ADSTERRA_SCRIPT_URL;
  script.async = true;
  script.setAttribute("data-cfasync", "false");

  script.onload = () => {
    popunderLoaded = true;
    console.log("[Ad] ✅ Script Popunder cargado y disparado.");
  };
  script.onerror = () => {
    console.warn("[Ad] ⚠️ No se pudo cargar el script de Adsterra (adblocker?).");
  };

  document.head.appendChild(script);
  console.log("[Ad] 📺 Inyectando script Popunder de Adsterra...");
}

export function useAd(): UseAdReturn {
  const { socket } = useSocket();
  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });

  const adTokenRef     = useRef<string | null>(null);
  // adContainerRef: para Popunder no necesitamos inyectar nada visible,
  // pero lo mantenemos por compatibilidad con AdOverlay
  const adContainerRef = useRef<HTMLDivElement>(null!);

  /** El usuario hizo clic en "Continuar" después del timer de 15s */
  const reportAdCompleted = useCallback(() => {
    if (!socket?.connected || !adTokenRef.current) return;
    console.log("[Ad] ✅ Reportando ad-completed al servidor.");
    socket.emit("ad-completed", { token: adTokenRef.current });
    adTokenRef.current = null;
    // El estado vuelve a IDLE cuando el servidor responde "ad-done"
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleShowAd = ({ token }: { token: string }) => {
      console.log("[Ad] 📺 show-ad recibido → entrando en AD_MODE");
      adTokenRef.current = token;
      setAdMode("AD_MODE");

      // Disparar el Popunder de Adsterra
      // El popunder abre en background; el AdOverlay bloquea la UI de Turrinder
      triggerPopunder();
    };

    const handleAdDone = () => {
      console.log("[Ad] 🎉 ad-done → volviendo a IDLE");
      setAdMode("IDLE");
      setSkipInfo(prev => ({ ...prev, count: 0, remaining: prev.threshold }));
    };

    const handleAdError = ({ message }: { message: string }) => {
      console.error("[Ad] ❌ Error de validación:", message);
      // Volver a mostrar el overlay para que el usuario espere de nuevo
      setAdMode("AD_MODE");
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
    adContainerRef,
    reportAdCompleted,
  };
}