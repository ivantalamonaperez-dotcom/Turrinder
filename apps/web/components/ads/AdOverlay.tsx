"use client";

/**
 * AdOverlay.tsx — Overlay para Popunder de Adsterra
 *
 * El Popunder NO inyecta nada en la página — abre una pestaña en background.
 * Este overlay bloquea la UI de Turrinder durante el countdown y le dice
 * al usuario que revise la nueva pestaña.
 *
 * Estados:
 *  1. Countdown activo  → botón deshabilitado, instrucción de revisar pestaña
 *  2. Countdown listo   → botón "Continuar" habilitado
 *  3. Exiting           → animación de salida
 */

import { useState, useEffect, useRef } from "react";

interface Props {
  visible: boolean;
  onContinue: () => void;
  skipCount: number;
  threshold: number;
}

const AD_WAIT_SECONDS = 15;

export default function AdOverlay({ visible, onContinue, skipCount, threshold }: Props) {
  const [countdown,   setCountdown]   = useState(AD_WAIT_SECONDS);
  const [canContinue, setCanContinue] = useState(false);
  const [exiting,     setExiting]     = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) {
      setCountdown(AD_WAIT_SECONDS);
      setCanContinue(false);
      setExiting(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Reiniciar cada vez que el overlay se hace visible
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

        .adov-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(4,4,12,0.98);
          backdrop-filter: blur(24px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'DM Sans', sans-serif;
          animation: adovIn 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .adov-root.exiting {
          animation: adovOut 0.45s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        @keyframes adovIn  { from { opacity:0; transform:scale(1.03); } to { opacity:1; transform:scale(1); } }
        @keyframes adovOut { from { opacity:1; transform:scale(1);    } to { opacity:0; transform:scale(0.97); } }

        /* Glow de fondo */
        .adov-glow {
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,45,107,0.07) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          pointer-events: none;
          animation: glowPulse 4s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%,100% { opacity:0.6; transform:translate(-50%,-50%) scale(1); }
          50%      { opacity:1;   transform:translate(-50%,-50%) scale(1.12); }
        }

        /* Corners */
        .adov-corner {
          position: absolute;
          width: 24px; height: 24px;
          opacity: 0.18;
        }
        .adov-corner-tl { top:18px; left:18px;   border-top:1px solid #ff2d6b; border-left:1px solid #ff2d6b; }
        .adov-corner-tr { top:18px; right:18px;  border-top:1px solid #ff2d6b; border-right:1px solid #ff2d6b; }
        .adov-corner-bl { bottom:18px; left:18px;  border-bottom:1px solid #ff2d6b; border-left:1px solid #ff2d6b; }
        .adov-corner-br { bottom:18px; right:18px; border-bottom:1px solid #ff2d6b; border-right:1px solid #ff2d6b; }

        /* Logo */
        .adov-logo {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
          position: relative; z-index:1;
        }
        .adov-logo-w { color: rgba(255,255,255,0.9); }
        .adov-logo-g {
          background: linear-gradient(135deg, #ff6b35, #ff2d6b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .adov-eyebrow {
          font-size: 10px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 32px;
          position: relative; z-index:1;
        }

        /* Card central */
        .adov-card {
          position: relative; z-index:1;
          width: min(420px, 92vw);
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        /* Icono de pestaña */
        .adov-tab-icon {
          width: 64px; height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,45,107,0.15));
          border: 1px solid rgba(255,45,107,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          animation: iconBob 3s ease-in-out infinite;
        }
        @keyframes iconBob {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }

        .adov-card-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 800;
          color: white;
          text-align: center;
          line-height: 1.3;
        }
        .adov-card-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          text-align: center;
          line-height: 1.6;
          max-width: 300px;
        }
        .adov-card-desc strong {
          color: rgba(255,255,255,0.7);
          font-weight: 500;
        }

        /* Separador */
        .adov-divider {
          width: 100%;
          height: 1px;
          background: rgba(255,255,255,0.06);
        }

        /* Skip badge */
        .adov-skip-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(255,45,107,0.7);
          letter-spacing: 0.5px;
        }
        .adov-skip-dots {
          display: flex;
          gap: 3px;
        }
        .adov-sdot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: rgba(255,45,107,0.25);
        }
        .adov-sdot.on {
          background: #ff2d6b;
          box-shadow: 0 0 5px rgba(255,45,107,0.8);
        }

        /* Progress bar */
        .adov-progress-wrap {
          position: relative; z-index:1;
          width: min(420px, 92vw);
          margin-bottom: 20px;
        }
        .adov-progress-track {
          height: 2px;
          background: rgba(255,255,255,0.06);
          border-radius: 100px;
          overflow: hidden;
        }
        .adov-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff6b35, #ff2d6b);
          border-radius: 100px;
          transition: width 1s linear;
          box-shadow: 0 0 8px rgba(255,45,107,0.5);
        }
        .adov-progress-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 10px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.5px;
        }

        /* Botón */
        .adov-btn {
          position: relative; z-index:1;
          border: none;
          border-radius: 100px;
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 15px 44px;
          cursor: pointer;
          min-width: 220px;
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .adov-btn-wait {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.07);
          cursor: not-allowed;
        }
        .adov-btn-ready {
          background: linear-gradient(135deg, #ff6b35, #ff2d6b);
          color: white;
          box-shadow: 0 4px 24px rgba(255,45,107,0.4);
          animation: btnPulse 2s ease-in-out infinite;
        }
        .adov-btn-ready:hover {
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 8px 32px rgba(255,45,107,0.6);
        }
        @keyframes btnPulse {
          0%,100% { box-shadow: 0 4px 24px rgba(255,45,107,0.4); }
          50%      { box-shadow: 0 4px 32px rgba(255,45,107,0.65), 0 0 0 6px rgba(255,45,107,0.05); }
        }

        .adov-legal {
          position: relative; z-index:1;
          margin-top: 16px;
          font-size: 10px;
          color: rgba(255,255,255,0.12);
          text-align: center;
          max-width: 300px;
          line-height: 1.6;
        }
      `}</style>

      <div className={`adov-root ${exiting ? "exiting" : ""}`}>
        <div className="adov-glow" />
        <div className="adov-corner adov-corner-tl" />
        <div className="adov-corner adov-corner-tr" />
        <div className="adov-corner adov-corner-bl" />
        <div className="adov-corner adov-corner-br" />

        {/* Logo */}
        <div className="adov-logo">
          <span className="adov-logo-w">Turr</span>
          <span className="adov-logo-g">inder</span>
        </div>
        <div className="adov-eyebrow">Pausa publicitaria</div>

        {/* Card */}
        <div className="adov-card">
          <div className="adov-tab-icon">📺</div>

          <div className="adov-card-title">
            {canContinue ? "¡Gracias por ver el anuncio!" : "Se abrió una nueva pestaña"}
          </div>

          <div className="adov-card-desc">
            {canContinue
              ? "Ya podés continuar con Turrinder."
              : <>Revisá la <strong>nueva pestaña</strong> que se abrió con el anuncio.<br />Podés volver acá en <strong>{countdown}s</strong>.</>
            }
          </div>

          <div className="adov-divider" />

          {/* Dots de skips */}
          <div className="adov-skip-badge">
            <div className="adov-skip-dots">
              {Array.from({ length: threshold }).map((_, i) => (
                <div key={i} className={`adov-sdot ${i < skipCount ? "on" : ""}`} />
              ))}
            </div>
            {skipCount} de {threshold} skips
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="adov-progress-wrap">
          <div className="adov-progress-track">
            <div className="adov-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="adov-progress-labels">
            <span>{canContinue ? "Listo ✓" : `${countdown}s restantes`}</span>
            <span>Un anuncio cada {threshold} skips</span>
          </div>
        </div>

        {/* Botón */}
        <button
          className={`adov-btn ${canContinue ? "adov-btn-ready" : "adov-btn-wait"}`}
          onClick={handleContinue}
          disabled={!canContinue}
        >
          {canContinue ? "Continuar →" : `Espera ${countdown}s`}
        </button>

        <p className="adov-legal">
          Turrinder es gratuito gracias a nuestros anunciantes.<br />
          Los anuncios nos permiten mantener el servicio activo.
        </p>
      </div>
    </>
  );
}