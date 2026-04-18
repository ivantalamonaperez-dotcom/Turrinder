"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  visible: boolean;
  onContinue: () => void;
  skipCount: number;
  threshold: number;
  adReady: boolean;
}

const AD_WAIT_SECONDS = 15;

export default function AdOverlay({ visible, onContinue, skipCount, threshold, adReady }: Props) {
  const [countdown,   setCountdown]   = useState(AD_WAIT_SECONDS);
  const [canContinue, setCanContinue] = useState(false);
  const [exiting,     setExiting]     = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sincronizar canContinue con adReady del hook
  useEffect(() => {
    if (adReady) setCanContinue(true);
  }, [adReady]);

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
    setTimeout(() => { onContinue(); setExiting(false); }, 400);
  };

  if (!visible) return null;

  const progress = ((AD_WAIT_SECONDS - countdown) / AD_WAIT_SECONDS) * 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');
        .adov-root{position:fixed;inset:0;z-index:8000;background:rgba(4,4,12,0.93);backdrop-filter:blur(14px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;font-family:'DM Sans',sans-serif;animation:adovIn 0.35s cubic-bezier(0.16,1,0.3,1);}
        .adov-root.exiting{animation:adovOut 0.4s cubic-bezier(0.16,1,0.3,1) forwards;}
        @keyframes adovIn{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:scale(1)}}
        @keyframes adovOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(0.97)}}
        .adov-glow{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(255,45,107,0.07) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;animation:glowPulse 4s ease-in-out infinite;}
        @keyframes glowPulse{0%,100%{opacity:0.6;transform:translate(-50%,-50%) scale(1);}50%{opacity:1;transform:translate(-50%,-50%) scale(1.1);}}
        .adov-corner{position:absolute;width:22px;height:22px;opacity:0.15;}
        .adov-tl{top:16px;left:16px;border-top:1px solid #ff2d6b;border-left:1px solid #ff2d6b;}
        .adov-tr{top:16px;right:16px;border-top:1px solid #ff2d6b;border-right:1px solid #ff2d6b;}
        .adov-bl{bottom:16px;left:16px;border-bottom:1px solid #ff2d6b;border-left:1px solid #ff2d6b;}
        .adov-br{bottom:16px;right:16px;border-bottom:1px solid #ff2d6b;border-right:1px solid #ff2d6b;}
        .adov-logo{font-family:'Syne',sans-serif;font-size:22px;font-weight:900;letter-spacing:-0.5px;margin-bottom:6px;position:relative;z-index:1;}
        .adov-logo-w{color:rgba(255,255,255,0.9);}
        .adov-logo-g{background:linear-gradient(135deg,#ff6b35,#ff2d6b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .adov-eyebrow{font-size:9px;color:rgba(255,255,255,0.22);letter-spacing:3px;text-transform:uppercase;margin-bottom:28px;position:relative;z-index:1;}
        .adov-skip-row{display:flex;align-items:center;gap:8px;margin-bottom:28px;position:relative;z-index:1;}
        .adov-skip-dots{display:flex;gap:3px;}
        .adov-sdot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.1);transition:all 0.3s;}
        .adov-sdot.on{background:#ff2d6b;box-shadow:0 0 6px rgba(255,45,107,0.8);}
        .adov-skip-label{font-size:11px;color:rgba(255,45,107,0.6);letter-spacing:0.5px;}
        .adov-message{position:relative;z-index:1;text-align:center;margin-bottom:28px;display:flex;flex-direction:column;align-items:center;gap:10px;}
        .adov-message-icon{font-size:38px;}
        .adov-message-title{font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:rgba(255,255,255,0.85);}
        .adov-message-sub{font-size:12px;color:rgba(255,255,255,0.35);line-height:1.6;max-width:260px;}
        .adov-progress-wrap{position:relative;z-index:1;width:280px;margin-bottom:20px;}
        .adov-progress-track{height:3px;background:rgba(255,255,255,0.07);border-radius:100px;overflow:hidden;}
        .adov-progress-fill{height:100%;background:linear-gradient(90deg,#ff6b35,#ff2d6b);border-radius:100px;transition:width 1s linear;box-shadow:0 0 8px rgba(255,45,107,0.5);}
        .adov-progress-labels{display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:rgba(255,255,255,0.2);}
        .adov-btn{position:relative;z-index:1;border:none;border-radius:100px;font-family:'Syne',sans-serif;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:15px 44px;cursor:pointer;min-width:220px;transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);}
        .adov-btn-wait{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.06);cursor:not-allowed;}
        .adov-btn-ready{background:linear-gradient(135deg,#ff6b35,#ff2d6b);color:white;box-shadow:0 4px 20px rgba(255,45,107,0.4);animation:btnPulse 2s ease-in-out infinite;}
        .adov-btn-ready:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 8px 28px rgba(255,45,107,0.6);}
        @keyframes btnPulse{0%,100%{box-shadow:0 4px 20px rgba(255,45,107,0.4);}50%{box-shadow:0 4px 28px rgba(255,45,107,0.65),0 0 0 6px rgba(255,45,107,0.05);}}
        .adov-legal{position:relative;z-index:1;margin-top:16px;font-size:9px;color:rgba(255,255,255,0.1);text-align:center;max-width:260px;line-height:1.7;}
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

        <div className="adov-message">
          <div className="adov-message-icon">{canContinue ? "✅" : "📺"}</div>
          <div className="adov-message-title">
            {canContinue ? "¡Gracias por ver el anuncio!" : "Se abrió el anuncio"}
          </div>
          <div className="adov-message-sub">
            {canContinue
              ? "Ya podés continuar con Turrinder."
              : "Revisá la nueva pestaña con el anuncio. Podés volver acá en " + countdown + "s."
            }
          </div>
        </div>

        <div className="adov-progress-wrap">
          <div className="adov-progress-track">
            <div className="adov-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="adov-progress-labels">
            <span>{canContinue ? "Listo ✓" : `${countdown}s restantes`}</span>
            <span>1 anuncio cada {threshold} skips</span>
          </div>
        </div>

        <button
          className={`adov-btn ${canContinue ? "adov-btn-ready" : "adov-btn-wait"}`}
          onClick={handleContinue}
          disabled={!canContinue}
        >
          {canContinue ? "Continuar →" : `Espera ${countdown}s`}
        </button>

        <p className="adov-legal">
          Turrinder es gratuito gracias a nuestros anunciantes.<br />
          Un anuncio cada {threshold} skips mantiene el servicio activo.
        </p>
      </div>
    </>
  );
}