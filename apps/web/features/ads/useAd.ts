"use client";

/**
 * useAd.ts — Corregido: atOptions en window global
 *
 * CAUSA DEL "Cargando anuncio..." permanente:
 *   El invoke.js de Adsterra busca `window.atOptions` al ejecutarse.
 *   Al inyectar atOptions como innerText de un <script> dentro de un div,
 *   algunos navegadores lo ejecutan en scope local → window.atOptions = undefined
 *   → Adsterra no renderiza nada.
 *
 * SOLUCIÓN:
 *   1. Asignar `window.atOptions` directamente desde JS antes de cargar el script.
 *   2. Cargar invoke.js solo UNA vez (evitar duplicados en re-renders).
 *   3. Si ya estaba cargado, forzar re-render del slot eliminando y recreando el div.
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

const ADSTERRA_KEY = "ee96ab70d34ae8fe14b97603f3c84b9b";
const ADSTERRA_SRC = `https://www.highperformanceformat.com/${ADSTERRA_KEY}/invoke.js`;

// Track si el script ya fue agregado al DOM (singleton)
let invokeScriptLoaded = false;

export function useAd(): UseAdReturn {
  const { socket }     = useSocket();
  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });
  const adTokenRef     = useRef<string | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null!);

  const loadBannerAd = useCallback(() => {
    const container = adContainerRef.current;
    if (!container) {
      console.warn("[Ad] ⚠️ Contenedor no disponible.");
      return;
    }

    // Limpiar contenido anterior
    container.innerHTML = "";

    // ── CLAVE: asignar atOptions a window ANTES de cargar el script ──────
    (window as any).atOptions = {
      key: ADSTERRA_KEY,
      format: "iframe",
      height: 250,
      width: 300,
      params: {},
    };
    console.log("[Ad] ✅ window.atOptions asignado:", (window as any).atOptions);

    if (!invokeScriptLoaded) {
      // Primera vez: agregar el script al <head>
      const script = document.createElement("script");
      script.src = ADSTERRA_SRC;
      script.async = true;
      script.setAttribute("data-cfasync", "false");

      script.onload = () => {
        invokeScriptLoaded = true;
        console.log("[Ad] ✅ invoke.js cargado.");
      };
      script.onerror = () => {
        console.warn("[Ad] ⚠️ invoke.js no cargó (¿adblocker?).");
      };

      // Agregar al head para que corra en scope global
      document.head.appendChild(script);
      console.log("[Ad] 📺 invoke.js agregado al head.");
    } else {
      // Ya cargado: Adsterra busca el div con atOptions y lo renderiza.
      // Forzamos que lo detecte creando un script inline que llama invoke de nuevo.
      console.log("[Ad] 🔁 invoke.js ya cargado, forzando re-render del slot...");

      // Adsterra re-renderiza si encuentra el div vacío con atOptions en window.
      // Creamos un script inline mínimo para triggear la lógica interna.
      const reloadScript = document.createElement("script");
      reloadScript.setAttribute("data-cfasync", "false");
      reloadScript.src = ADSTERRA_SRC + "?t=" + Date.now(); // cache bust
      reloadScript.async = true;
      document.head.appendChild(reloadScript);
    }
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
      // Esperar dos frames para que React renderice el contenedor
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
      console.error("[Ad] ❌ Error del servidor, manteniendo AD_MODE.");
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