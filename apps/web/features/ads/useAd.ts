"use client";

/**
 * useAd.ts — Dev/Prod split
 *
 * PROBLEMA RAÍZ:
 *   Adsterra rechaza requests desde localhost porque el dominio registrado
 *   es turrinder.vercel.app. ERR_CONNECTION_REFUSED es la respuesta del
 *   servidor de Adsterra al detectar un origen no autorizado.
 *   Esto NO es un adblocker — es una restricción de dominio del servidor de ads.
 *
 * SOLUCIÓN:
 *   En desarrollo (localhost) → mostrar un banner simulado con countdown real.
 *   En producción (vercel.app o dominio real) → cargar Adsterra real.
 *
 *   Detección: typeof window !== 'undefined' && window.location.hostname
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
  isDev: boolean;
  reportAdCompleted: () => void;
}

const ADSTERRA_KEY = "ee96ab70d34ae8fe14b97603f3c84b9b";
const ADSTERRA_SRC = `https://www.highperformanceformat.com/${ADSTERRA_KEY}/invoke.js`;

/** True si estamos en localhost / desarrollo */
function isDevEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.");
}

/** Inyecta un banner de prueba visual (solo en dev) */
function injectMockAd(container: HTMLDivElement) {
  container.innerHTML = `
    <div style="
      width:300px; height:250px;
      background: linear-gradient(135deg, #1a0a14, #2a0d1e);
      border: 1px dashed rgba(255,45,107,0.3);
      border-radius: 8px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 10px; color: rgba(255,255,255,0.5);
      font-family: 'DM Sans', sans-serif;
    ">
      <div style="font-size:32px">📺</div>
      <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,45,107,0.6)">
        Anuncio de prueba
      </div>
      <div style="font-size:10px; color:rgba(255,255,255,0.25); text-align:center; padding:0 20px; line-height:1.5">
        En producción aparecerá<br/>el anuncio real de Adsterra
      </div>
      <div style="
        background:rgba(255,45,107,0.1); border:1px solid rgba(255,45,107,0.2);
        border-radius:100px; padding:3px 12px;
        font-size:9px; color:rgba(255,45,107,0.7); letter-spacing:1px;
        text-transform:uppercase;
      ">
        300 × 250
      </div>
    </div>
  `;
  console.log("[Ad] 🧪 Mock ad inyectado (modo desarrollo).");
}

export function useAd(): UseAdReturn {
  const { socket }     = useSocket();
  const [adMode,         setAdMode]         = useState<AdMode>("IDLE");
  const [skipInfo,       setSkipInfo]       = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const adTokenRef     = useRef<string | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null!);
  const dev = isDevEnvironment();

  const loadBannerAd = useCallback(() => {
    const container = adContainerRef.current;
    if (!container) {
      console.warn("[Ad] ⚠️ Contenedor no disponible.");
      return;
    }

    container.innerHTML = "";
    setAdBlockDetected(false);

    // ── Modo desarrollo: mock visual ──────────────────────────────────────
    if (isDevEnvironment()) {
      injectMockAd(container);
      return;
    }

    // ── Modo producción: Adsterra real ────────────────────────────────────
    (window as any).atOptions = {
      key: ADSTERRA_KEY,
      format: "iframe",
      height: 250,
      width: 300,
      params: {},
    };

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

    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = ADSTERRA_SRC + "?cb=" + Date.now();
    invokeScript.async = false;

    invokeScript.onload = () => {
      console.log("[Ad] ✅ Banner Adsterra cargado.");
      setAdBlockDetected(false);
    };
    invokeScript.onerror = () => {
      console.warn("[Ad] ⚠️ invoke.js bloqueado (adblocker).");
      setAdBlockDetected(true);
    };

    container.appendChild(invokeScript);
    console.log("[Ad] 📺 Banner Adsterra inyectado (producción).");
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

    // Usamos un pequeño delay para asegurar que el DOM de AdOverlay se renderizó
    setTimeout(() => {
      if (adContainerRef.current) {
        loadBannerAd();
      } else {
        console.warn("[Ad] Reintentando carga: contenedor aún no disponible.");
        // Un segundo intento si falló el primero
        setTimeout(() => loadBannerAd(), 500);
      }
    }, 300); 
  };

    const handleAdDone = () => {
      setAdMode("IDLE");
      setAdBlockDetected(false);
      setSkipInfo(prev => ({ ...prev, count: 0, remaining: prev.threshold }));
      console.log("[Ad] 🎉 ad-done → IDLE.");
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
    isDev: dev,
    reportAdCompleted,
  };
}