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
 * Configuración de Adsterra (Social Bar — ya configurado):
 *   Zone ID : 29056188
 *   Formato : Social Bar  (script directo, no usa atOptions)
 *   El script se inyecta dinámicamente en <body> una sola vez.
 *   Para cambiar de zona, edita ADSTERRA_SOCIAL_BAR_SRC abajo.
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

// ─── Adsterra Social Bar ────────────────────────────────────────────────────
// Copiado desde: publishers.adsterra.com → zona 29056188 → GET CODE
// Pégalo justo antes del cierre de </body> (este hook lo inyecta dinámicamente).
const ADSTERRA_SOCIAL_BAR_SRC =
  "https://pl29156687.profitablecpmratenetwork.com/cb/05/2a/cb052aa79584c606592ea803f507ff2c.js";

// ID del <script> para evitar inyecciones duplicadas entre re-renders
const SOCIAL_BAR_SCRIPT_ID = "adsterra-social-bar";
// ────────────────────────────────────────────────────────────────────────────

/**
 * Inyecta el script de Social Bar en <body> una única vez.
 * Si ya existe (por hot-reload o strict-mode) no lo duplica.
 */
function injectSocialBar(): void {
  if (document.getElementById(SOCIAL_BAR_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id    = SOCIAL_BAR_SCRIPT_ID;
  script.type  = "text/javascript";
  script.src   = ADSTERRA_SOCIAL_BAR_SRC;
  script.async = true;
  script.setAttribute("data-cfasync", "false");

  document.body.appendChild(script);
  console.log("[Ad] 📺 Adsterra Social Bar inyectado.");
}

export function useAd(): UseAdReturn {
  const { socket } = useSocket();
  const [adMode,   setAdMode]   = useState<AdMode>("IDLE");
  const [skipInfo, setSkipInfo] = useState<SkipInfo>({ count: 0, threshold: 8, remaining: 8 });
  const adTokenRef     = useRef<string | null>(null);
  const adContainerRef = useRef<HTMLDivElement>(null!);

  /**
   * loadAd — se llama cuando el servidor indica que hay que mostrar el anuncio.
   *
   * El Social Bar de Adsterra es un widget flotante global (barra inferior/lateral)
   * que se gestiona a través del script inyectado en <body>; no necesita un
   * contenedor específico en el DOM.
   *
   * Si en el futuro quieres añadir un banner adicional (300×250, etc.) dentro
   * del overlay, puedes hacerlo aquí usando adContainerRef.
   */
  const loadAd = useCallback(() => {
    // 1. Asegura que el Social Bar esté activo
    injectSocialBar();

    // 2. (Opcional) Banner secundario dentro del overlay — descomenta si lo necesitas:
    // const container = adContainerRef.current;
    // if (container) {
    //   container.innerHTML = "";
    //   const cfg = document.createElement("script");
    //   cfg.text = `var atOptions = { 'key': 'OTRO_ZONE_ID', 'format': 'iframe', 'height': 250, 'width': 300, 'params': {} };`;
    //   const inv = document.createElement("script");
    //   inv.src   = "//www.highperformanceformat.com/OTRO_ZONE_ID/invoke.js";
    //   inv.async = true;
    //   container.appendChild(cfg);
    //   container.appendChild(inv);
    // }

    console.log("[Ad] 🟢 Modo anuncio activado.");
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
      // En caso de error del servidor, igual mostramos el overlay para no
      // dejar al usuario en un estado inconsistente.
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