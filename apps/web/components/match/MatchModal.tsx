"use client";

import { useEffect, useState } from "react";

type Props = {
  visible: boolean;
  onClose: () => void;
  user?: any;
};

export default function MatchModal({ visible, onClose, user }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setTimeout(() => setShow(true), 50);
    } else {
      setShow(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .match-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(8,8,16,0.95);
          backdrop-filter: blur(20px);
          font-family: 'DM Sans', sans-serif;
          opacity: 0;
          transition: opacity 0.4s ease;
          padding: 40px;
        }

        .match-overlay.visible {
          opacity: 1;
        }

        .particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          border-radius: 50%;
          animation: particle-fly 1.5s ease-out forwards;
        }

        @keyframes particle-fly {
          from { opacity: 1; transform: translate(0, 0) scale(1); }
          to   { opacity: 0; transform: var(--tx) scale(0); }
        }

        .match-badge {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #ff2d6b;
          margin-bottom: 16px;
          animation: badge-in 0.5s 0.2s both;
        }

        @keyframes badge-in {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .match-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(52px, 12vw, 80px);
          font-weight: 800;
          letter-spacing: -3px;
          line-height: 1;
          text-align: center;
          margin-bottom: 8px;
          animation: title-in 0.6s 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          background: linear-gradient(135deg, #ff2d6b 0%, #ff6b35 50%, #ffd93d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        @keyframes title-in {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }

        .match-emoji {
          font-size: 48px;
          margin-bottom: 32px;
          animation: emoji-in 0.5s 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          -webkit-text-fill-color: initial;
        }

        @keyframes emoji-in {
          from { opacity: 0; transform: scale(0) rotate(-20deg); }
          to   { opacity: 1; transform: scale(1) rotate(0); }
        }

        .match-avatars {
          display: flex;
          align-items: center;
          gap: 0;
          margin-bottom: 24px;
          animation: avatars-in 0.5s 0.6s both;
        }

        @keyframes avatars-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .match-avatar {
          width: 80px; height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #080810;
          background: #1a1a2e;
          display: flex; align-items: center; justify-content: center;
          font-size: 32px;
          color: white;
          overflow: hidden;
          flex-shrink: 0;
        }

        .match-avatar:first-child { transform: translateX(16px); z-index: 2; }
        .match-avatar:last-child  { transform: translateX(-16px); z-index: 2; }

        .avatar-heart {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          border: 3px solid #080810;
          z-index: 3;
          box-shadow: 0 0 20px rgba(255,45,107,0.5);
        }

        .match-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.45);
          text-align: center;
          margin-bottom: 12px;
          animation: avatars-in 0.5s 0.7s both;
        }

        /* ✅ Pill de contacto guardado */
        .contact-saved {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          border-radius: 100px;
          padding: 8px 18px;
          margin-bottom: 36px;
          animation: avatars-in 0.5s 0.75s both;
        }

        .contact-saved-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          flex-shrink: 0;
        }

        .contact-saved-text {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
        }

        .contact-saved-text strong {
          color: #22c55e;
          font-weight: 600;
        }

        .match-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 320px;
          animation: avatars-in 0.5s 0.8s both;
        }

        /* ✅ Único botón — cerrar y seguir con el match actual */
        .btn-close {
          padding: 16px;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          border: none;
          border-radius: 14px;
          color: white;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 8px 30px rgba(255,45,107,0.35);
        }

        .btn-close:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(255,45,107,0.5);
        }

        .btn-close:active {
          transform: translateY(0);
        }
      `}</style>

      <div className={`match-overlay ${show ? "visible" : ""}`}>
        <div className="particles">
          {Array.from({ length: 12 }).map((_, i) => {
            const x = (Math.random() - 0.5) * 400;
            const y = (Math.random() - 0.5) * 400;
            const size = 6 + Math.random() * 10;
            const colors = ["#ff2d6b", "#ff6b35", "#ffd93d", "#7c3aed", "#06b6d4"];
            const color = colors[Math.floor(Math.random() * colors.length)];
            return (
              <div
                key={i}
                className="particle"
                style={{
                  left: "50%",
                  top: "50%",
                  width: size,
                  height: size,
                  background: color,
                  "--tx": `translate(${x}px, ${y}px)`,
                  animationDelay: `${i * 0.05}s`,
                } as any}
              />
            );
          })}
        </div>

        <div className="match-badge">¡Es un Match!</div>
        <div className="match-title">MATCH</div>
        <div className="match-emoji">🔥</div>

        <div className="match-avatars">
          <div className="match-avatar">🧑</div>
          <div className="avatar-heart">♥</div>
          {user?.photo ? (
            <img src={user.photo} className="match-avatar" alt={user.name} />
          ) : (
            <div className="match-avatar">👤</div>
          )}
        </div>

        <p className="match-sub">
          Ambos se dieron like{user?.name ? ` con ${user.name}` : ""}
        </p>

        {/* ✅ Contacto guardado — reemplaza el botón de "Enviar mensaje" */}
        <div className="contact-saved">
          <div className="contact-saved-dot" />
          <span className="contact-saved-text">
            <strong>Contacto guardado</strong> — podés escribirle desde Chats
          </span>
        </div>

        <div className="match-actions">
          <button className="btn-close" onClick={onClose}>
            Seguir conociendo ✨
          </button>
        </div>
      </div>
    </>
  );
}