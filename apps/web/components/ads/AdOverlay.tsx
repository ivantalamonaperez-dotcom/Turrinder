"use client";

import { useState, useEffect, useRef, RefObject } from "react";

interface Props {
  visible: boolean;
  adContainerRef: RefObject<HTMLDivElement>;
  onContinue: () => void;
  skipCount: number;
  threshold: number;
  adBlockDetected: boolean;
}

const AD_WAIT_SECONDS = 15;

export default function AdOverlay({
  visible,
  adContainerRef,
  onContinue,
  skipCount,
  threshold,
  adBlockDetected,
}: Props) {
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

    setCountdown(AD_WAIT_SECONDS);
    setCanContinue(false);

    // Si hay adblocker, no iniciar countdown — el usuario debe resolverlo primero
    if (adBlockDetected) return;

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
  }, [visible, adBlockDetected]);

  const handleContinue = () => {
    if (!canContinue) return;
    setExiting(true);
    setTimeout(() => { onContinue(); setExiting(false); }, 450);
  };

  if (!visible) return null;

  const progress = ((AD_WAIT_SECONDS - countdown) / AD_WAIT_SECONDS) * 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        .adov-root {
          position:fixed; inset:0; z-index:9999;
          background:rgba(4,4,12,0.97); backdrop-filter:blur(20px);
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:20px; font-family:'DM Sans',sans-serif;
          animation:adovIn 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .adov-root.exiting { animation:adovOut 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes adovIn  { from{opacity:0;transform:scale(1.03)} to{opacity:1;transform:scale(1)} }
        @keyframes adovOut { from{opacity:1;transform:scale(1)}    to{opacity:0;transform:scale(0.97)} }

        .adov-glow {
          position:absolute; width:500px; height:500px; border-radius:50%;
          background:radial-gradient(circle,rgba(255,45,107,0.07) 0%,transparent 70%);
          top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none;
          animation:glowPulse 4s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%,100%{opacity:0.6;transform:translate(-50%,-50%) scale(1);}
          50%{opacity:1;transform:translate(-50%,-50%) scale(1.1);}
        }

        .adov-corner{position:absolute;width:22px;height:22px;opacity:0.15;}
        .adov-tl{top:16px;left:16px;border-top:1px solid #ff2d6b;border-left:1px solid #ff2d6b;}
        .adov-tr{top:16px;right:16px;border-top:1px solid #ff2d6b;border-right:1px solid #ff2d6b;}
        .adov-bl{bottom:16px;left:16px;border-bottom:1px solid #ff2d6b;border-left:1px solid #ff2d6b;}
        .adov-br{bottom:16px;right:16px;border-bottom:1px solid #ff2d6b;border-right:1px solid #ff2d6b;}

        .adov-logo{font-family:'Syne',sans-serif;font-size:19px;font-weight:900;letter-spacing:-0.5px;margin-bottom:4px;position:relative;z-index:1;}
        .adov-logo-w{color:rgba(255,255,255,0.9);}
        .adov-logo-g{background:linear-gradient(135deg,#ff6b35,#ff2d6b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .adov-eyebrow{font-size:9px;color:rgba(255,255,255,0.22);letter-spacing:3px;text-transform:uppercase;margin-bottom:18px;position:relative;z-index:1;}

        .adov-skip-row{display:flex;align-items:center;gap:8px;margin-bottom:14px;position:relative;z-index:1;}
        .adov-skip-dots{display:flex;gap:3px;}
        .adov-sdot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.1);transition:background 0.3s;}
        .adov-sdot.on{background:#ff2d6b;box-shadow:0 0 5px rgba(255,45,107,0.8);}
        .adov-skip-label{font-size:10px;color:rgba(255,45,107,0.6);letter-spacing:0.5px;}

        /* ── Banner container ── */
        .adov-banner-wrap{
          position:relative; z-index:1;
          width:300px; min-height:250px;
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:12px; overflow:hidden;
          display:flex; align-items:center; justify-content:center;
          margin-bottom:18px;
        }

        /* Placeholder detrás del iframe */
        .adov-placeholder{
          position:absolute; inset:0;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:8px; pointer-events:none;
        }
        .adov-placeholder-icon{font-size:24px;opacity:0.2;}
        .adov-placeholder-text{font-size:10px;color:rgba(255,255,255,0.15);text-transform:uppercase;letter-spacing:1px;}

        /* El div donde Adsterra inyecta el iframe */
        .adov-ad-slot{position:relative;z-index:2;width:300px;min-height:250px;display:flex;align-items:center;justify-content:center;}
        .adov-ad-slot iframe{border:none !important;display:block;}

        /* ── Adblocker warning ── */
        .adov-adblock-warn{
          position:relative; z-index:1;
          width:300px; padding:16px 20px;
          background:rgba(255,180,0,0.08);
          border:1px solid rgba(255,180,0,0.25);
          border-radius:12px; margin-bottom:18px;
          display:flex; flex-direction:column; align-items:center; gap:8px;
          text-align:center;
        }
        .adov-adblock-icon{font-size:28px;}
        .adov-adblock-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:rgba(255,200,0,0.9);}
        .adov-adblock-desc{font-size:11px;color:rgba(255,255,255,0.4);line-height:1.6;}
        .adov-adblock-desc strong{color:rgba(255,200,0,0.7);}

        /* ── Progress ── */
        .adov-progress-wrap{position:relative;z-index:1;width:300px;margin-bottom:16px;}
        .adov-progress-track{height:2px;background:rgba(255,255,255,0.06);border-radius:100px;overflow:hidden;}
        .adov-progress-fill{height:100%;background:linear-gradient(90deg,#ff6b35,#ff2d6b);border-radius:100px;transition:width 1s linear;box-shadow:0 0 8px rgba(255,45,107,0.5);}
        .adov-progress-labels{display:flex;justify-content:space-between;margin-top:7px;font-size:10px;color:rgba(255,255,255,0.2);}

        /* ── Botón ── */
        .adov-btn{position:relative;z-index:1;border:none;border-radius:100px;font-family:'Syne',sans-serif;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:13px 40px;cursor:pointer;min-width:200px;transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);}
        .adov-btn-wait{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.06);cursor:not-allowed;}
        .adov-btn-ready{background:linear-gradient(135deg,#ff6b35,#ff2d6b);color:white;box-shadow:0 4px 20px rgba(255,45,107,0.4);animation:btnPulse 2s ease-in-out infinite;}
        .adov-btn-ready:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 8px 28px rgba(255,45,107,0.6);}
        @keyframes btnPulse{0%,100%{box-shadow:0 4px 20px rgba(255,45,107,0.4);}50%{box-shadow:0 4px 28px rgba(255,45,107,0.65),0 0 0 6px rgba(255,45,107,0.05);}}

        .adov-legal{position:relative;z-index:1;margin-top:14px;font-size:9px;color:rgba(255,255,255,0.1);text-align:center;max-width:280px;line-height:1.7;}
      `}</style>

      <div className={`adov-root ${exiting ? "exiting" : ""}`}>
        <div className="adov-glow" />
        <div className="adov-corner adov-tl" />
        <div className="adov-corner adov-tr" />
        <div className="adov-corner adov-bl" />
        <div className="adov-corner adov-br" />

        <div className="adov-logo">
          <span className="adov-logo-w">Turr</span>
          <span className="adov-logo-g">inder</span>
        </div>
        <div className="adov-eyebrow">Pausa publicitaria</div>

        <div className="adov-skip-row">
          <div className="adov-skip-dots">
            {Array.from({ length: threshold }).map((_, i) => (
              <div key={i} className={`adov-sdot ${i < skipCount ? "on" : ""}`} />
            ))}
          </div>
          <span className="adov-skip-label">{skipCount} de {threshold} skips</span>
        </div>

        {/* ── Adblocker detectado ── */}
        {adBlockDetected ? (
          <div className="adov-adblock-warn">
            <div className="adov-adblock-icon">🚫</div>
            <div className="adov-adblock-title">Bloqueador detectado</div>
            <div className="adov-adblock-desc">
              Turrinder es gratuito gracias a los anuncios.<br />
              Por favor <strong>desactivá tu adblocker</strong> para este sitio y recargá la página.
            </div>
          </div>
        ) : (
          /* ── Banner Adsterra ── */
          <div className="adov-banner-wrap">
            <div className="adov-placeholder">
              <div className="adov-placeholder-icon">📺</div>
              <div className="adov-placeholder-text">Cargando anuncio...</div>
            </div>
            <div ref={adContainerRef} className="adov-ad-slot" />
          </div>
        )}

        {/* ── Progress bar (solo si no hay adblocker) ── */}
        {!adBlockDetected && (
          <div className="adov-progress-wrap">
            <div className="adov-progress-track">
              <div className="adov-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="adov-progress-labels">
              <span>{canContinue ? "¡Listo! ✓" : `Espera ${countdown}s`}</span>
              <span>1 anuncio cada {threshold} skips</span>
            </div>
          </div>
        )}

        <button
          className={`adov-btn ${canContinue && !adBlockDetected ? "adov-btn-ready" : "adov-btn-wait"}`}
          onClick={handleContinue}
          disabled={!canContinue || adBlockDetected}
        >
          {adBlockDetected
            ? "Desactivá el adblocker"
            : canContinue
              ? "Continuar →"
              : `Espera ${countdown}s`
          }
        </button>

        <p className="adov-legal">
          Turrinder es gratuito gracias a nuestros anunciantes.<br />
          Un anuncio cada {threshold} skips mantiene el servicio activo.
        </p>
      </div>
    </>
  );
}