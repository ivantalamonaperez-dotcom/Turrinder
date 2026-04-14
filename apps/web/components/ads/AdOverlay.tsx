"use client";

/**
 * AdOverlay.tsx — Overlay de pantalla completa para mostrar anuncios
 *
 * Estados visuales:
 * 1. Cuenta regresiva activa (15s) → botón "Continuar" deshabilitado
 * 2. Cuenta regresiva completada  → botón "Continuar" habilitado
 * 3. Transición de salida          → animación de cierre
 *
 * Diseño: dark luxury / neon — coherente con el resto de la app
 */

import { useState, useEffect, useRef, RefObject } from "react";

interface Props {
  visible: boolean;
  adContainerRef: RefObject<HTMLDivElement>;
  onContinue: () => void;     // Llamar cuando el usuario hace clic en Continuar
  skipCount: number;
  threshold: number;
}

const AD_WAIT_SECONDS = 15;

export default function AdOverlay({ visible, adContainerRef, onContinue, skipCount, threshold }: Props) {
  const [countdown,    setCountdown]    = useState(AD_WAIT_SECONDS);
  const [canContinue,  setCanContinue]  = useState(false);
  const [exiting,      setExiting]      = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reiniciar countdown cada vez que el overlay se hace visible
  useEffect(() => {
    if (!visible) {
      setCountdown(AD_WAIT_SECONDS);
      setCanContinue(false);
      setExiting(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setCountdown(AD_WAIT_SECONDS);
    setCanContinue(false);

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setCanContinue(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [visible]);

  const handleContinue = () => {
    if (!canContinue) return;
    setExiting(true);
    setTimeout(() => {
      onContinue();
      setExiting(false);
    }, 500);
  };

  if (!visible) return null;

  const progress = ((AD_WAIT_SECONDS - countdown) / AD_WAIT_SECONDS) * 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        .ad-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(4, 4, 12, 0.97);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          animation: adOverlayIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(20px);
        }
        .ad-overlay.exiting {
          animation: adOverlayOut 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes adOverlayIn {
          from { opacity: 0; transform: scale(1.04); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes adOverlayOut {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.97); }
        }

        /* ── Fondo de ruido/textura ── */
        .ad-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.4;
        }

        /* ── Header ── */
        .ad-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
          position: relative;
          z-index: 1;
        }
        .ad-logo {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }
        .ad-logo-white { color: rgba(255,255,255,0.9); }
        .ad-logo-grad  {
          background: linear-gradient(135deg, #ff6b35, #ff2d6b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ad-title {
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        /* ── Contador de skips ── */
        .ad-skip-info {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,45,107,0.08);
          border: 1px solid rgba(255,45,107,0.2);
          border-radius: 100px;
          padding: 5px 16px;
          font-size: 11px;
          color: rgba(255,45,107,0.8);
          letter-spacing: 1px;
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }
        .ad-skip-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #ff2d6b;
          box-shadow: 0 0 6px #ff2d6b;
        }

        /* ── Contenedor del anuncio ── */
        .ad-content-wrap {
          position: relative;
          z-index: 1;
          width: min(480px, 90vw);
          min-height: 280px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 28px;
        }
        .ad-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.15);
          font-size: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .ad-placeholder-icon { font-size: 32px; opacity: 0.3; }

        /* ── Barra de progreso ── */
        .ad-progress-wrap {
          width: min(480px, 90vw);
          position: relative;
          z-index: 1;
          margin-bottom: 20px;
        }
        .ad-progress-track {
          height: 2px;
          background: rgba(255,255,255,0.06);
          border-radius: 100px;
          overflow: hidden;
        }
        .ad-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff6b35, #ff2d6b);
          border-radius: 100px;
          transition: width 1s linear;
          box-shadow: 0 0 8px rgba(255,45,107,0.5);
        }
        .ad-progress-label {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 10px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.5px;
        }

        /* ── Botón continuar ── */
        .ad-btn {
          position: relative;
          z-index: 1;
          border: none;
          border-radius: 100px;
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 14px 40px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          min-width: 200px;
        }
        .ad-btn-disabled {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: not-allowed;
        }
        .ad-btn-enabled {
          background: linear-gradient(135deg, #ff6b35 0%, #ff2d6b 100%);
          color: white;
          box-shadow: 0 4px 24px rgba(255,45,107,0.4), 0 0 0 0 rgba(255,45,107,0.2);
          animation: btnReadyPulse 2s ease-in-out infinite;
        }
        .ad-btn-enabled:hover {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 8px 32px rgba(255,45,107,0.55);
        }
        @keyframes btnReadyPulse {
          0%,100% { box-shadow: 0 4px 24px rgba(255,45,107,0.4); }
          50%      { box-shadow: 0 4px 32px rgba(255,45,107,0.65), 0 0 0 8px rgba(255,45,107,0.05); }
        }

        /* ── Mensaje legal ── */
        .ad-legal {
          position: relative;
          z-index: 1;
          margin-top: 20px;
          font-size: 10px;
          color: rgba(255,255,255,0.15);
          text-align: center;
          letter-spacing: 0.3px;
          max-width: 320px;
        }

        /* ── Decoración de esquinas ── */
        .ad-corner {
          position: absolute;
          width: 28px; height: 28px;
          opacity: 0.2;
        }
        .ad-corner-tl { top: 20px; left: 20px; border-top: 1px solid #ff2d6b; border-left: 1px solid #ff2d6b; }
        .ad-corner-tr { top: 20px; right: 20px; border-top: 1px solid #ff2d6b; border-right: 1px solid #ff2d6b; }
        .ad-corner-bl { bottom: 20px; left: 20px; border-bottom: 1px solid #ff2d6b; border-left: 1px solid #ff2d6b; }
        .ad-corner-br { bottom: 20px; right: 20px; border-bottom: 1px solid #ff2d6b; border-right: 1px solid #ff2d6b; }

        /* ── Glow central de fondo ── */
        .ad-glow {
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,45,107,0.06) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          animation: glowPulse 4s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.6; transform: translate(-50%,-50%) scale(1); }
          50%      { opacity: 1;   transform: translate(-50%,-50%) scale(1.1); }
        }
      `}</style>

      <div className={`ad-overlay ${exiting ? "exiting" : ""}`}>
        {/* Decoraciones */}
        <div className="ad-glow" />
        <div className="ad-corner ad-corner-tl" />
        <div className="ad-corner ad-corner-tr" />
        <div className="ad-corner ad-corner-bl" />
        <div className="ad-corner ad-corner-br" />

        {/* Logo */}
        <div className="ad-header">
          <div className="ad-logo">
            <span className="ad-logo-white">Turr</span>
            <span className="ad-logo-grad">inder</span>
          </div>
          <div className="ad-title">Mensaje patrocinado</div>
        </div>

        {/* Info de skips */}
        <div className="ad-skip-info">
          <div className="ad-skip-dot" />
          {skipCount} skips · Mira el anuncio para continuar
        </div>

        {/* Contenedor del anuncio de Adsterra */}
        <div className="ad-content-wrap">
          <div ref={adContainerRef} style={{ width: "100%", minHeight: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="ad-placeholder">
              <div className="ad-placeholder-icon">📺</div>
              <div>Cargando anuncio...</div>
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="ad-progress-wrap">
          <div className="ad-progress-track">
            <div className="ad-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="ad-progress-label">
            <span>{canContinue ? "¡Listo!" : `Espera ${countdown}s`}</span>
            <span>Anuncio 1 de 1</span>
          </div>
        </div>

        {/* Botón continuar */}
        <button
          className={`ad-btn ${canContinue ? "ad-btn-enabled" : "ad-btn-disabled"}`}
          onClick={handleContinue}
          disabled={!canContinue}
        >
          {canContinue ? "Continuar →" : `Espera ${countdown}s`}
        </button>

        {/* Legal */}
        <p className="ad-legal">
          Turrinder es gratuito gracias a nuestros anunciantes.<br />
          Un anuncio cada {threshold} skips.
        </p>
      </div>
    </>
  );
}