"use client";

import { useState, useEffect } from "react";

interface Props {
  visible: boolean;
  onContinue: () => void;
  skipCount: number;
  threshold: number;
}

export default function AdOverlay({ visible, onContinue, skipCount, threshold }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) setTimeout(() => setShow(true), 30);
    else setShow(false);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        .adov-root {
          position: fixed; inset: 0; z-index: 8000;
          background: rgba(4,4,12,0.94);
          backdrop-filter: blur(16px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 32px 24px;
          font-family: 'DM Sans', sans-serif;
          opacity: 0; transition: opacity 0.35s ease;
        }

        .adov-root.visible { opacity: 1; }

        /* Glow de fondo */
        .adov-glow {
          position: absolute; width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,45,107,0.08) 0%, transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%,-50%);
          pointer-events: none;
          animation: glowPulse 3s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%,100%{opacity:0.6;transform:translate(-50%,-50%) scale(1);}
          50%{opacity:1;transform:translate(-50%,-50%) scale(1.12);}
        }

        /* Corners decorativos */
        .adov-corner { position:absolute; width:20px; height:20px; opacity:0.12; }
        .adov-tl { top:18px; left:18px; border-top:1px solid #ff2d6b; border-left:1px solid #ff2d6b; }
        .adov-tr { top:18px; right:18px; border-top:1px solid #ff2d6b; border-right:1px solid #ff2d6b; }
        .adov-bl { bottom:18px; left:18px; border-bottom:1px solid #ff2d6b; border-left:1px solid #ff2d6b; }
        .adov-br { bottom:18px; right:18px; border-bottom:1px solid #ff2d6b; border-right:1px solid #ff2d6b; }

        /* Logo */
        .adov-logo {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 900;
          letter-spacing: -0.5px; margin-bottom: 32px; position: relative; z-index: 1;
        }
        .adov-logo-w { color: rgba(255,255,255,0.9); }
        .adov-logo-g {
          background: linear-gradient(135deg,#ff6b35,#ff2d6b);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }

        /* Skip dots */
        .adov-dots-row {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 28px; position: relative; z-index: 1;
        }
        .adov-dots { display: flex; gap: 4px; }
        .adov-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: rgba(255,255,255,0.08); transition: all 0.3s;
        }
        .adov-dot.on { background: #ff2d6b; box-shadow: 0 0 7px rgba(255,45,107,0.8); }
        .adov-dots-label {
          font-size: 11px; color: rgba(255,45,107,0.55); letter-spacing: 0.5px;
        }

        /* Card de gracias */
        .adov-card {
          position: relative; z-index: 1;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          padding: 32px 28px;
          text-align: center;
          max-width: 340px;
          width: 100%;
          margin-bottom: 24px;
        }

        .adov-icon { font-size: 48px; margin-bottom: 16px; }

        .adov-title {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          color: white; letter-spacing: -0.3px; margin-bottom: 10px;
        }

        .adov-sub {
          font-size: 13px; color: rgba(255,255,255,0.4);
          line-height: 1.65; max-width: 240px; margin: 0 auto;
        }

        /* Botón */
        .adov-btn {
          position: relative; z-index: 1;
          background: linear-gradient(135deg,#ff6b35,#ff2d6b);
          border: none; border-radius: 100px;
          color: white; font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 800;
          letter-spacing: 1px; text-transform: uppercase;
          padding: 16px 48px; cursor: pointer;
          box-shadow: 0 6px 24px rgba(255,45,107,0.4);
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
          animation: btnPulse 2s ease-in-out infinite;
        }

        .adov-btn:hover {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 10px 32px rgba(255,45,107,0.6);
        }

        @keyframes btnPulse {
          0%,100%{box-shadow:0 6px 24px rgba(255,45,107,0.4);}
          50%{box-shadow:0 6px 32px rgba(255,45,107,0.65),0 0 0 5px rgba(255,45,107,0.06);}
        }

        .adov-legal {
          position: relative; z-index: 1; margin-top: 16px;
          font-size: 10px; color: rgba(255,255,255,0.1);
          text-align: center; line-height: 1.7;
        }
      `}</style>

      <div className={`adov-root ${show ? "visible" : ""}`}>
        <div className="adov-glow" />
        <div className="adov-corner adov-tl" />
        <div className="adov-corner adov-tr" />
        <div className="adov-corner adov-bl" />
        <div className="adov-corner adov-br" />

        {/* Logo */}
        <div className="adov-logo">
          <span className="adov-logo-w">Turr</span>
          <span className="adov-logo-g">inder</span>
        </div>

        {/* Dots de skips */}
        <div className="adov-dots-row">
          <div className="adov-dots">
            {Array.from({ length: threshold }).map((_, i) => (
              <div key={i} className={`adov-dot ${i < skipCount ? "on" : ""}`} />
            ))}
          </div>
          <span className="adov-dots-label">{skipCount} de {threshold} skips</span>
        </div>

        {/* Card */}
        <div className="adov-card">
          <div className="adov-icon">🙌</div>
          <div className="adov-title">¡Gracias por apoyarnos!</div>
          <p className="adov-sub">
            Turrinder es gratis gracias a anunciantes como este.
            Con tu apoyo podemos seguir mejorando la app.
          </p>
        </div>

        {/* Botón continuar */}
        <button className="adov-btn" onClick={onContinue}>
          Continuar →
        </button>

        <p className="adov-legal">
          1 anuncio cada {threshold} skips · Turrinder es 100% gratuito
        </p>
      </div>
    </>
  );
}