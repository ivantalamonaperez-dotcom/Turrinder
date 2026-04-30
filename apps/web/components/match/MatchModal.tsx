"use client";

import { useEffect, useState, useRef } from "react";

type Props = {
  visible: boolean;
  onClose: () => void;
  user?: {
    name?: string;
    photo?: string;
    avatar_url?: string;
    age?: number;
  };
  myProfile?: {
    name?: string;
    photo?: string;
    avatar_url?: string;
  };
};

// Genera partículas solo una vez al montar para evitar re-renders
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const angle  = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
  const radius = 120 + Math.random() * 180;
  return {
    x:     Math.cos(angle) * radius,
    y:     Math.sin(angle) * radius,
    size:  3 + Math.random() * 7,
    delay: Math.random() * 0.6,
    color: ["#54c7f8","#3b9eda","#a8e6ff","#ffffff","#1a6fa8"][Math.floor(Math.random() * 5)],
    duration: 1.2 + Math.random() * 0.8,
  };
});

export default function MatchModal({ visible, onClose, user, myProfile }: Props) {
  const [phase,     setPhase]     = useState<"hidden" | "enter" | "visible">("hidden");
  const [burst,     setBurst]     = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setPhase("enter");
      timerRef.current = setTimeout(() => {
        setPhase("visible");
        setBurst(true);
      }, 60);
    } else {
      setPhase("hidden");
      setBurst(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]);

  if (!visible && phase === "hidden") return null;

  const partnerPhoto = user?.avatar_url || user?.photo;
  const myPhoto      = myProfile?.avatar_url || myProfile?.photo;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        /* ── Variables ── */
        .mm-root {
          --sky:        #54c7f8;
          --sky2:       #3b9eda;
          --sky3:       #1a6fa8;
          --sky-glow:   rgba(84,199,248,0.45);
          --sky-soft:   rgba(84,199,248,0.12);
          --bg:         #030a14;
          --glass:      rgba(4,14,28,0.85);
          --glass-b:    rgba(84,199,248,0.18);
          --white:      #f5f8ff;
          --muted:      rgba(180,215,240,0.5);
        }

        /* ── Overlay ── */
        .mm-root {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;

          /* Fondo oscuro con aurora azul */
          background:
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(84,199,248,0.18) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 20% 100%, rgba(26,111,168,0.14) 0%, transparent 60%),
            rgba(3,10,20,0.97);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);

          opacity: 0;
          transform: scale(1.04);
          transition: opacity 0.35s ease, transform 0.35s ease;
          pointer-events: none;
        }

        .mm-root.visible {
          opacity: 1;
          transform: scale(1);
          pointer-events: all;
        }

        /* ── Ruido de fondo (textura) ── */
        .mm-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.4;
          z-index: 0;
        }

        /* ── Línea superior (flag) ── */
        .mm-flag {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg,
            transparent 0%,
            var(--sky3) 20%,
            var(--sky) 50%,
            var(--sky3) 80%,
            transparent 100%);
          z-index: 10;
          box-shadow: 0 0 20px var(--sky-glow);
        }

        /* ── Contenido ── */
        .mm-content {
          position: relative;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 16px 40px;
          width: 100%;
          max-width: min(90vw, 520px);
          box-sizing: border-box;
          overflow: visible;
        }

        /* ── Partículas ── */
        .mm-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          overflow: hidden;
        }

        .mm-particle {
          position: absolute;
          left: 50%; top: 42%;
          border-radius: 50%;
          opacity: 0;
          transform: translate(-50%, -50%);
        }

        .mm-particle.burst {
          animation: mm-burst var(--dur, 1.4s) var(--delay, 0s) cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
        }

        @keyframes mm-burst {
          0%   { opacity: 1;   transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          70%  { opacity: 0.8; }
          100% { opacity: 0;   transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(0); }
        }

        /* ── Píldora "Match" ── */
        .mm-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--sky-soft);
          border: 1px solid var(--glass-b);
          border-radius: 100px;
          padding: 6px 18px;
          margin-bottom: 28px;
          margin-top: 8px;
          animation: mm-fadein 0.5s 0.15s both;
        }

        .mm-pill-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--sky);
          box-shadow: 0 0 8px var(--sky);
          animation: mm-blink 1.8s infinite;
        }

        @keyframes mm-blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .mm-pill-text {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--sky);
        }

        /* ── Título ── */
        .mm-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(48px, 10vw, 88px);
          font-weight: 900;
          letter-spacing: 2px;
          line-height: 1;
          text-align: center;
          margin-bottom: 6px;
          display: block;
          white-space: nowrap;
          background: linear-gradient(160deg,
            #a8e6ff 0%,
            var(--sky) 35%,
            var(--sky2) 65%,
            var(--sky3) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: mm-titlein 0.7s 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          filter: drop-shadow(0 0 40px rgba(84,199,248,0.5));
        }

        @keyframes mm-titlein {
          from { opacity: 0; transform: scale(0.55) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .mm-subtitle {
          font-size: 13px;
          color: var(--muted);
          letter-spacing: 1px;
          margin-bottom: 36px;
          animation: mm-fadein 0.5s 0.5s both;
        }

        @keyframes mm-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Avatares ── */
        .mm-avatars {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 28px;
          animation: mm-fadein 0.6s 0.4s both;
        }

        .mm-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .mm-avatar-wrap:first-child { transform: translateX(22px); z-index: 2; }
        .mm-avatar-wrap:last-child  { transform: translateX(-22px); z-index: 2; }

        .mm-avatar {
          width: 90px; height: 90px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--bg);
          background: #060f1e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          overflow: hidden;
          box-shadow:
            0 0 0 1.5px var(--glass-b),
            0 0 30px rgba(84,199,248,0.2),
            0 8px 24px rgba(0,0,0,0.6);
        }

        .mm-avatar img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Ring pulsante alrededor del avatar */
        .mm-avatar-wrap::after {
          content: '';
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          border: 1.5px solid var(--sky);
          opacity: 0;
          animation: mm-ring 2.5s 0.8s ease-out infinite;
        }

        @keyframes mm-ring {
          0%   { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0;   transform: scale(1.35); }
        }

        /* ── Corazón central ── */
        .mm-heart-wrap {
          position: relative;
          z-index: 4;
          flex-shrink: 0;
        }

        .mm-heart {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          border: 3px solid var(--bg);
          box-shadow:
            0 0 0 1.5px var(--glass-b),
            0 0 24px var(--sky-glow),
            0 0 50px rgba(84,199,248,0.25);
          animation: mm-heartpulse 2s 0.8s ease-in-out infinite;
        }

        @keyframes mm-heartpulse {
          0%,100% { box-shadow: 0 0 0 1.5px var(--glass-b), 0 0 24px var(--sky-glow), 0 0 50px rgba(84,199,248,0.25); }
          50%     { box-shadow: 0 0 0 1.5px var(--glass-b), 0 0 40px var(--sky-glow), 0 0 80px rgba(84,199,248,0.4); }
        }

        /* ── Nombres ── */
        .mm-names {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: 8px;
          animation: mm-fadein 0.5s 0.55s both;
        }

        .mm-names-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mm-name {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--white);
        }

        .mm-name-sep {
          font-size: 12px;
          color: var(--sky);
          opacity: 0.7;
        }

        .mm-desc {
          font-size: 13px;
          color: var(--muted);
          text-align: center;
          margin-bottom: 32px;
          animation: mm-fadein 0.5s 0.6s both;
        }

        /* ── Pill "Contacto guardado" ── */
        .mm-saved {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 100px;
          padding: 9px 20px;
          margin-bottom: 28px;
          animation: mm-fadein 0.5s 0.65s both;
        }

        .mm-saved-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
          flex-shrink: 0;
          animation: mm-blink 1.8s infinite;
        }

        .mm-saved-text {
          font-size: 12px;
          color: rgba(255,255,255,0.55);
        }

        .mm-saved-text strong {
          color: #22c55e;
          font-weight: 600;
        }

        /* ── Botón ── */
        .mm-btn {
          width: 100%;
          max-width: 320px;
          padding: 17px;
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 60%, var(--sky3) 100%);
          border: none;
          border-radius: 16px;
          color: #020d18;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
          box-shadow: 0 6px 32px rgba(84,199,248,0.4), 0 2px 8px rgba(0,0,0,0.4);
          animation: mm-fadein 0.5s 0.75s both;
          -webkit-tap-highlight-color: transparent;
        }

        .mm-btn:hover  { transform: translateY(-3px) scale(1.02); box-shadow: 0 12px 40px rgba(84,199,248,0.55); }
        .mm-btn:active { transform: translateY(0) scale(0.98); }

        /* ── Divisor decorativo ── */
        .mm-divider {
          width: 40px; height: 1px;
          background: linear-gradient(90deg, transparent, var(--sky), transparent);
          margin: 0 auto 28px;
          opacity: 0.4;
          animation: mm-fadein 0.5s 0.6s both;
        }
      `}</style>

      <div className={`mm-root${phase === "visible" ? " visible" : ""}`}>
        <div className="mm-flag" />

        {/* Partículas burst */}
        <div className="mm-particles">
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className={`mm-particle${burst ? " burst" : ""}`}
              style={{
                width:  p.size,
                height: p.size,
                background: p.color,
                "--tx":    `${p.x}px`,
                "--ty":    `${p.y}px`,
                "--delay": `${p.delay}s`,
                "--dur":   `${p.duration}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        <div className="mm-content">

          {/* Píldora superior */}
          <div className="mm-pill">
            <div className="mm-pill-dot" />
            <span className="mm-pill-text">¡Es un Match!</span>
          </div>

          {/* Título */}
          <div className="mm-title">MATCH</div>
          <div className="mm-subtitle">Conexión establecida ✦</div>

          {/* Avatares */}
          <div className="mm-avatars">
            {/* Mi avatar */}
            <div className="mm-avatar-wrap">
              <div className="mm-avatar">
                {myPhoto
                  ? <img src={myPhoto} alt="Tú" />
                  : "🧑"}
              </div>
            </div>

            {/* Corazón central */}
            <div className="mm-heart-wrap">
              <div className="mm-heart">♥</div>
            </div>

            {/* Avatar de la pareja */}
            <div className="mm-avatar-wrap">
              <div className="mm-avatar">
                {partnerPhoto
                  ? <img src={partnerPhoto} alt={user?.name ?? "Pareja"} />
                  : "👤"}
              </div>
            </div>
          </div>

          {/* Nombres */}
          {(myProfile?.name || user?.name) && (
            <div className="mm-names">
              <div className="mm-names-row">
                {myProfile?.name && <span className="mm-name">{myProfile.name}</span>}
                {myProfile?.name && user?.name && <span className="mm-name-sep">✦</span>}
                {user?.name && (
                  <span className="mm-name">
                    {user.name}{user.age ? `, ${user.age}` : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          <p className="mm-desc">
            Ambos se dieron like{user?.name ? ` con ${user.name}` : ""}
          </p>

          <div className="mm-divider" />

          {/* Contacto guardado */}
          <div className="mm-saved">
            <div className="mm-saved-dot" />
            <span className="mm-saved-text">
              <strong>Contacto guardado</strong> — podés escribirle desde Chats
            </span>
          </div>

          {/* Botón */}
          <button className="mm-btn" onClick={onClose}>
            Seguir conociendo ✦
          </button>

        </div>
      </div>
    </>
  );
}