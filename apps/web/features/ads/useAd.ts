"use client";

/**
 * useAd.ts — Banner 300x250 de Adsterra embebido en el modal
 *
 * Key: ee96ab70d34ae8fe14b97603f3c84b9b
 * Zona: 29069525 (Banner 300x250 - turrinder.vercel.app)
 *
 * Cómo funciona:
 *   1. Servidor emite "show-ad" con token
 *   2. adMode → AD_MODE → AdOverlay se muestra
 *   3. loadBannerAd() inyecta el script de Adsterra en el div del modal
 *   4. El iframe del banner aparece dentro del overlay
 *   5. Tras AD_WAIT_SECONDS el botón "Continuar" se habilita
 *   6. Usuario hace clic → reportAdCompleted() → servidor valida → IDLE
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
const ADSTERRA_KEY = "ee96ab70d34ae8fe14b97603f3c84b9b";
const ADSTERRA_SRC = `https://www.highperformanceformat.com/${ADSTERRA_KEY}/invoke.js`;

export function useAd(): UseAdReturn {
  const { socket }     = useSocket();
  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });
  const adTokenRef     = useRef<string | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null!);

  /**
   * Inyecta el banner de Adsterra en el div del modal.
   * Limpia el contenido anterior antes de inyectar para evitar duplicados.
   */
  const loadBannerAd = useCallback(() => {
    const container = adContainerRef.current;
    if (!container) {
      console.warn("[Ad] ⚠️ Contenedor no disponible aún.");
      return;
    }

    // Limpiar inyección anterior
    container.innerHTML = "";

    // Script de configuración (debe ir ANTES del invoke.js)
    const configScript = document.createElement("script");
    configScript.type = "text/javascript";
    configScript.text = `
      atOptions = {
        'key': '${ADSTERRA_KEY}',
        'format': 'iframe',
        'height': 250,
        'width': 300,
        'params': {}
      };
    `;

    // Script que carga el banner
    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = ADSTERRA_SRC;
    invokeScript.async = true;

    invokeScript.onload = () => console.log("[Ad] ✅ Banner Adsterra cargado.");
    invokeScript.onerror = () => console.warn("[Ad] ⚠️ Error cargando banner (¿adblocker?).");

    container.appendChild(configScript);
    container.appendChild(invokeScript);
    console.log("[Ad] 📺 Inyectando banner 300x250...");
  }, []);

  const reportAdCompleted = useCallback(() => {
    if (!socket?.connected) return;
    const token = adTokenRef.current;
    if (!token || token.trim() === "") {
      console.warn("[Ad] ⚠️ Sin token válido.");
      return;
    }
    console.log("[Ad] ✅ Reportando ad-completed.");
    socket.emit("ad-completed", { token });
    adTokenRef.current = null;
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleShowAd = ({ token }: { token: string | null }) => {
      console.log("[Ad] 📺 show-ad recibido.");
      adTokenRef.current = (token && token.trim() !== "") ? token : null;
      setAdMode("AD_MODE");

      // Dos frames para asegurar que React renderizó el contenedor antes de inyectar
      requestAnimationFrame(() =>
        requestAnimationFrame(() => loadBannerAd())
      );
    };

    const handleAdDone = () => {
      console.log("[Ad] 🎉 ad-done → IDLE.");
      setAdMode("IDLE");
      setSkipInfo(prev => ({ ...prev, count: 0, remaining: prev.threshold }));
    };

    const handleAdError = () => {
      // Mantener en AD_MODE — el overlay sigue visible
      console.error("[Ad] ❌ Error de validación del servidor.");
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
  }, [socket, loadBannerAd]);

  return {
    adMode,
    skipInfo,
    isBlocked: adMode === "AD_MODE",
    adContainerRef,
    reportAdCompleted,
  };
}