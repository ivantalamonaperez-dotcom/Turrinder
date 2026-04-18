"use client";

import { useState, useCallback, useRef } from "react";

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
  reportSkip: () => void;       // llamar al hacer skip
  reportAdCompleted: () => void; // llamar cuando cierra el modal de gracias
}

const AD_THRESHOLD = 8; // mostrar anuncio cada N skips
const AD_URL = "https://omg10.com/4/10891625";

export function useAd(): UseAdReturn {
  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({
    count: 0,
    threshold: AD_THRESHOLD,
    remaining: AD_THRESHOLD,
  });

  // Llamar cada vez que el usuario hace skip
  const reportSkip = useCallback(() => {
    setSkipInfo(prev => {
      const newCount = prev.count + 1;

      if (newCount >= AD_THRESHOLD) {
        // Abrir anuncio en nueva pestaña
        window.open(AD_URL, "_blank", "noopener,noreferrer");
        // Mostrar modal de gracias
        setAdMode("AD_THANKS");
        return { count: 0, threshold: AD_THRESHOLD, remaining: AD_THRESHOLD };
      }

      return {
        count: newCount,
        threshold: AD_THRESHOLD,
        remaining: AD_THRESHOLD - newCount,
      };
    });
  }, []);

  // Llamar cuando el usuario cierra el modal de gracias
  const reportAdCompleted = useCallback(() => {
    setAdMode("IDLE");
  }, []);

  return {
    adMode,
    skipInfo,
    isBlocked: adMode === "AD_THANKS", // bloquear UI mientras se muestra el modal
    reportSkip,
    reportAdCompleted,
  };
}