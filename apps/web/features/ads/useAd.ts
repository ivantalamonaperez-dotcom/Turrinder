"use client";

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

const MONETAG_DIRECT_LINK = "https://omg10.com/4/10891625";

/** Dev environment */
function isDevEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.")
  );
}

/** Mock ad solo dev */
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
        En producción aparecerá el anuncio real
      </div>
      <div style="
        background:rgba(255,45,107,0.1);
        border:1px solid rgba(255,45,107,0.2);
        border-radius:100px;
        padding:3px 12px;
        font-size:9px;
        color:rgba(255,45,107,0.7);
        letter-spacing:1px;
        text-transform:uppercase;
      ">
        300 × 250
      </div>
    </div>
  `;
}

export function useAd(): UseAdReturn {
  const { socket } = useSocket();

  const [adMode, setAdMode] = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({
    count: 0,
    threshold: 8,
    remaining: 8,
  });

  const [adBlockDetected, setAdBlockDetected] = useState(false);

  const adTokenRef = useRef<string | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null!);

  const dev = isDevEnvironment();

  /**
   * 🚀 MONETAG DIRECT LINK LOADER
   */
  const loadAd = useCallback(() => {
    setAdBlockDetected(false);

    // DEV: mock visual
    if (isDevEnvironment()) {
      const container = adContainerRef.current;
      if (container) injectMockAd(container);
      return;
    }

    console.log("[Ad] 📺 Abriendo Monetag Direct Link...");

    const win = window.open(MONETAG_DIRECT_LINK, "_blank");

    if (!win) {
      console.warn("[Ad] ⚠️ Popup bloqueado por el navegador.");
      setAdBlockDetected(true);
      return;
    }

    console.log("[Ad] ✅ Monetag abierto correctamente.");
    setAdBlockDetected(false);
  }, []);

  /**
   * Reporte de ad completado
   */
  const reportAdCompleted = useCallback(() => {
    if (!socket?.connected) return;

    const token = adTokenRef.current;
    if (!token) {
      console.warn("[Ad] ⚠️ Sin token válido.");
      return;
    }

    socket.emit("ad-completed", { token });
    adTokenRef.current = null;

    console.log("[Ad] ✅ ad-completed enviado.");
  }, [socket]);

  /**
   * SOCKET EVENTS
   */
  useEffect(() => {
    if (!socket) return;

    const handleShowAd = ({ token }: { token: string | null }) => {
      console.log("[Ad] 📺 show-ad recibido.");

      adTokenRef.current = token && token.trim() !== "" ? token : null;
      setAdMode("AD_MODE");

      setTimeout(() => {
        const container = adContainerRef.current;

        if (container) {
          loadAd();
        } else {
          console.warn("[Ad] ⚠️ Contenedor no listo, reintentando...");
          setTimeout(() => loadAd(), 500);
        }
      }, 250);
    };

    const handleAdDone = () => {
      setAdMode("IDLE");
      setAdBlockDetected(false);
      setSkipInfo((prev) => ({
        ...prev,
        count: 0,
        remaining: prev.threshold,
      }));

      console.log("[Ad] 🎉 ad-done → IDLE");
    };

    const handleSkipCount = (info: SkipInfo) => setSkipInfo(info);

    const handleAdError = () => {
      console.error("[Ad] ❌ ad-error recibido.");
    };

    socket.on("show-ad", handleShowAd);
    socket.on("ad-done", handleAdDone);
    socket.on("ad-error", handleAdError);
    socket.on("skip-count", handleSkipCount);

    return () => {
      socket.off("show-ad", handleShowAd);
      socket.off("ad-done", handleAdDone);
      socket.off("ad-error", handleAdError);
      socket.off("skip-count", handleSkipCount);
    };
  }, [socket, loadAd]);

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