"use client";

/**
 * useAd.ts — Corregido: script inyectado en el body (dentro del div del modal)
 *
 * CORRECCIÓN PRINCIPAL:
 *   Adsterra Banner requiere que el código esté en el BODY, no en el <head>.
 *   La versión anterior inyectaba invoke.js en document.head → el script
 *   no encontraba el div destino → anuncio nunca aparecía.
 *
 *   Ahora: tanto atOptions como invoke.js se inyectan DENTRO del
 *   adContainerRef (que está en el body del modal).
 *
 * DETECCIÓN DE ADBLOCKER:
 *   Si invoke.js falla (onerror), adBlockDetected = true → AdOverlay
 *   puede mostrar un mensaje pidiendo desactivarlo.
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
  adBlockDetected: boolean;
  reportAdCompleted: () => void;
}

const ADSTERRA_KEY = "ee96ab70d34ae8fe14b97603f3c84b9b";
const ADSTERRA_SRC = `https://www.highperformanceformat.com/${ADSTERRA_KEY}/invoke.js`;

export function useAd(): UseAdReturn {
  const { socket }     = useSocket();
  const [adMode,         setAdMode]         = useState<AdMode>("IDLE");
  const [skipInfo,       setSkipInfo]       = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const adTokenRef     = useRef<string | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null!);

  /**
   * Inyecta atOptions + invoke.js DENTRO del contenedor del modal (body).
   * Adsterra renderiza el iframe en el mismo div donde encuentra el script.
   */
  const loadBannerAd = useCallback(() => {
    const container = adContainerRef.current;
    if (!container) {
      console.warn("[Ad] ⚠️ Contenedor no disponible.");
      return;
    }

    // Limpiar inyecciones anteriores
    container.innerHTML = "";
    setAdBlockDetected(false);

    // 1. Asignar atOptions a window (requerido por invoke.js)
    (window as any).atOptions = {
      key: ADSTERRA_KEY,
      format: "iframe",
      height: 250,
      width: 300,
      params: {},
    };

    // 2. Script de configuración inline DENTRO del container (body)
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
    container.appendChild(configScript);

    // 3. invoke.js DENTRO del container (no en head)
    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = ADSTERRA_SRC;
    // Cache-bust para forzar re-carga en cada sesión de ad
    invokeScript.src += "?cb=" + Date.now();
    invokeScript.async = false; // sync para que corra en orden con el config

    invokeScript.onload = () => {
      console.log("[Ad] ✅ Banner cargado correctamente.");
      setAdBlockDetected(false);
    };

    invokeScript.onerror = () => {
      console.warn("[Ad] ⚠️ invoke.js bloqueado (adblocker o DNS).");
      setAdBlockDetected(true);
    };

    container.appendChild(invokeScript);
    console.log("[Ad] 📺 Banner inyectado en el modal (body).");
  }, []);

  const reportAdCompleted = useCallback(() => {
    if (!socket?.connected) return;
    const token = adTokenRef.current;
    if (!token || token.trim() === "") {
      console.warn("[Ad] ⚠️ Sin token válido.");
      return;
    }
    socket.emit("ad-completed", { token });
    adTokenRef.current = null;
    console.log("[Ad] ✅ ad-completed reportado.");
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleShowAd = ({ token }: { token: string | null }) => {
      console.log("[Ad] 📺 show-ad recibido.");
      adTokenRef.current = (token && token.trim() !== "") ? token : null;
      setAdMode("AD_MODE");

      // Esperar dos frames para que React renderice el contenedor del modal
      requestAnimationFrame(() =>
        requestAnimationFrame(() => loadBannerAd())
      );
    };

    const handleAdDone = () => {
      setAdMode("IDLE");
      setAdBlockDetected(false);
      setSkipInfo(prev => ({ ...prev, count: 0, remaining: prev.threshold }));
    };

    const handleAdError = () => {
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
    adBlockDetected,
    reportAdCompleted,
  };
}