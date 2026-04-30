"use client";

/**
 * useAd.ts — Direct Link (frontend puro, sin backend)
 *
 * Flujo:
 *   Skip #8 → abrir Direct Link en nueva pestaña → mostrar AdOverlay con countdown
 *   Usuario ve el anuncio → vuelve a Turrinder → visibilitychange/focus detectado
 *   Si countdown terminó → cerrar modal automáticamente → UI desbloqueada
 *   Si countdown no terminó → esperar a que termine → cerrar automáticamente
 *
 * ROLES EXENTOS:
 *   Si el usuario tiene rol "streamer" o "vip", los anuncios se omiten
 *   completamente: skipCount nunca sube, AdOverlay nunca aparece.
 */

import { useState, useCallback, useEffect, useRef } from "react";

export type AdMode = "IDLE" | "AD_THANKS";

export interface SkipInfo {
  count: number;
  threshold: number;
  remaining: number;
}

export interface UseAdReturn {
  adMode: AdMode;
  skipInfo: SkipInfo;
  isBlocked: boolean;
  adReady: boolean;
  /** true si el rol del usuario lo exime de ver anuncios */
  isExempt: boolean;
  reportSkip: () => void;
  reportAdCompleted: () => void;
}

const AD_THRESHOLD = 8;
const AD_URL       = "https://omg10.com/4/10891625";
const AD_WAIT_MS   = 15_000;

/** Roles que nunca ven anuncios */
const EXEMPT_ROLES = ["streamer", "vip"] as const;

export function useAd(userRole?: string): UseAdReturn {
  const isExempt = EXEMPT_ROLES.includes(userRole as typeof EXEMPT_ROLES[number]);

  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [adReady,  setAdReady]  = useState(false);
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({
    count: 0,
    threshold: AD_THRESHOLD,
    remaining: AD_THRESHOLD,
  });

  const adReadyRef  = useRef(false);
  const adTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inAdModeRef = useRef(false);

  const closeModal = useCallback(() => {
    setAdMode("IDLE");
    setAdReady(false);
    adReadyRef.current  = false;
    inAdModeRef.current = false;
    if (adTimerRef.current) clearTimeout(adTimerRef.current);
  }, []);

  const reportSkip = useCallback(() => {
    // Roles exentos: skip siempre libre, contador no avanza
    if (isExempt) return;

    setSkipInfo(prev => {
      const newCount = prev.count + 1;

      if (newCount >= AD_THRESHOLD) {
        window.open(AD_URL, "_blank", "noopener,noreferrer");

        setAdMode("AD_THANKS");
        inAdModeRef.current = true;
        adReadyRef.current  = false;
        setAdReady(false);

        if (adTimerRef.current) clearTimeout(adTimerRef.current);
        adTimerRef.current = setTimeout(() => {
          adReadyRef.current = true;
          setAdReady(true);

          if (document.visibilityState === "visible" && inAdModeRef.current) {
            setTimeout(() => closeModal(), 300);
          }
        }, AD_WAIT_MS);

        return { count: 0, threshold: AD_THRESHOLD, remaining: AD_THRESHOLD };
      }

      return {
        count: newCount,
        threshold: AD_THRESHOLD,
        remaining: AD_THRESHOLD - newCount,
      };
    });
  }, [isExempt, closeModal]);

  const reportAdCompleted = useCallback(() => {
    closeModal();
  }, [closeModal]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && adReadyRef.current && inAdModeRef.current) {
        console.log("[Ad] 👀 Usuario volvió → auto-cerrando modal.");
        closeModal();
      }
    };

    const handleFocus = () => {
      if (adReadyRef.current && inAdModeRef.current) {
        console.log("[Ad] 🔍 Ventana con foco → auto-cerrando modal.");
        closeModal();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    };
  }, [closeModal]);

  return {
    adMode,
    skipInfo,
    isBlocked: adMode === "AD_THANKS",
    adReady,
    isExempt,
    reportSkip,
    reportAdCompleted,
  };
}