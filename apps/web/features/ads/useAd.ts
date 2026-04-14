"use client";

/**
 * useAd.ts — Gestión de anuncios con Adsterra
 *
 * Flujo completo:
 *   Usuario hace skip → servidor emite "skip-count" + evalúa threshold
 *   Si llegó a 8 skips → servidor emite "show-ad" con token único
 *   Este hook activa AD_MODE → AdOverlay se muestra → Adsterra se carga
 *   Tras 15s el usuario puede hacer clic en "Continuar"
 *   → emitimos "ad-completed" con el token al servidor
 *   → servidor valida tiempo + token → emite "ad-done"
 *   → volvemos a IDLE, skips reseteados, matchmaking reanudado automáticamente
 *
 * Configuración de Adsterra:
 *   1. Entra a https://publishers.adsterra.com y registra tu dominio
 *   2. En "Add Site" → elige formato Interstitial o Banner 300x250
 *   3. Copia el Zone ID y pégalo en ADSTERRA_ZONE_ID abajo
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

// ⚠️  REEMPLAZA con tu Zone ID real de Adsterra
const ADSTERRA_ZONE_ID = "YOUR_ADSTERRA_ZONE_ID";

export function useAd(): UseAdReturn {
  const { socket } = useSocket();
  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });
  const adTokenRef     = useRef<string | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null!);

  const loadAd = useCallback(() => {
    const container = adContainerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const configScript = document.createElement("script");
    configScript.type = "text/javascript";
    configScript.text = `
      var atOptions = {
        'key': '${ADSTERRA_ZONE_ID}',
        'format': 'iframe',
        'height': 300,
        'width': 160,
        'params': {}
      };
    `;
    const adScript = document.createElement("script");
    adScript.type = "text/javascript";
    adScript.src = `//www.highperformanceformat.com/${ADSTERRA_ZONE_ID}/invoke.js`;
    adScript.async = true;
    adScript.setAttribute("data-cfasync", "false");

    container.appendChild(configScript);
    container.appendChild(adScript);
    console.log("[Ad] 📺 Adsterra cargado.");
  }, []);

  const reportAdCompleted = useCallback(() => {
    if (!socket?.connected || !adTokenRef.current) return;
    socket.emit("ad-completed", { token: adTokenRef.current });
    adTokenRef.current = null;
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleShowAd = ({ token }: { token: string }) => {
      adTokenRef.current = token;
      setAdMode("AD_MODE");
      requestAnimationFrame(() => requestAnimationFrame(() => loadAd()));
    };
    const handleAdDone = () => {
      setAdMode("IDLE");
      setSkipInfo(prev => ({ ...prev, count: 0, remaining: prev.threshold }));
    };
    const handleAdError = () => {
      setAdMode("AD_MODE");
      requestAnimationFrame(() => loadAd());
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
  }, [socket, loadAd]);

  return { adMode, skipInfo, isBlocked: adMode === "AD_MODE", adContainerRef, reportAdCompleted };
}