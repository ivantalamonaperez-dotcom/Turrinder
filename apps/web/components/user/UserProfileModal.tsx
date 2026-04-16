"use client";

import { useEffect } from "react";
import type { MatchUserProfile } from "./UserChip";

interface Props {
  user: MatchUserProfile | null;
  isConnected?: boolean;
  visible: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ user, isConnected = false, visible, onClose }: Props) {
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  if (!user) return null;

  const initials = user.name?.[0]?.toUpperCase() ?? "?";

  const genderLabel: Record<string, string> = {
    male: "Hombre", female: "Mujer", non_binary: "No binario",
    other: "Otro", prefer_not_to_say: "Prefiero no decir",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        .upm-backdrop {
          position: fixed; inset: 0; z-index: 9000;
          background: rgba(4,4,12,0.85);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          display: flex; align-items: flex-end; justify-content: center;
          transition: opacity 0.3s ease;
          font-family: 'DM Sans', sans-serif;
        }
        .upm-backdrop.hidden { opacity: 0; pointer-events: none; }
        .upm-backdrop.visible { opacity: 1; pointer-events: all; }

        .upm-sheet {
          width: 100%; max-width: 480px; max-height: 92dvh;
          background: #0b0b18;
          border: 1px solid rgba(255,255,255,0.06); border-bottom: none;
          border-radius: 28px 28px 0 0;
          overflow: hidden; display: flex; flex-direction: column;
          transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
          position: relative;
        }
        .upm-backdrop.hidden .upm-sheet { transform: translateY(40px); }
        .upm-backdrop.visible .upm-sheet { transform: translateY(0); }

        .upm-handle {
          width: 36px; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.12);
          margin: 12px auto 0; flex-shrink: 0;
        }
        .upm-close {
          position: absolute; top: 16px; right: 16px; z-index: 10;
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5); font-size: 14px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, color 0.2s;
        }
        .upm-close:hover { background: rgba(255,45,107,0.15); color: rgba(255,100,130,0.9); }

        .upm-scroll {
          overflow-y: auto; flex: 1; min-height: 0; padding: 0 0 32px;
          scrollbar-width: none;
        }
        .upm-scroll::-webkit-scrollbar { display: none; }

        .upm-hero {
          position: relative; display: flex; flex-direction: column;
          align-items: center; padding: 32px 24px 24px; gap: 14px;
        }
        .upm-hero::before {
          content: ''; position: absolute; top: 0; left: 50%;
          transform: translateX(-50%); width: 220px; height: 160px;
          background: radial-gradient(ellipse, rgba(255,45,107,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .upm-avatar-wrap { position: relative; z-index: 1; }
        .upm-avatar {
          width: 96px; height: 96px; border-radius: 50%; object-fit: cover;
          border: 2.5px solid rgba(255,45,107,0.5);
          box-shadow: 0 0 24px rgba(255,45,107,0.25), 0 8px 32px rgba(0,0,0,0.5);
          display: block;
        }
        .upm-avatar-ph {
          width: 96px; height: 96px; border-radius: 50%;
          background: rgba(255,45,107,0.1); border: 2.5px solid rgba(255,45,107,0.5);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-size: 36px; font-weight: 800;
          color: rgba(255,100,130,0.8);
        }
        .upm-avatar-ring {
          position: absolute; inset: -6px; border-radius: 50%;
          border: 1.5px solid rgba(255,45,107,0.3);
          animation: upmRingPulse 2.5s ease-in-out infinite;
        }
        @keyframes upmRingPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.3; transform: scale(1.06); }
        }
        .upm-status {
          position: absolute; bottom: 2px; right: 2px;
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid #0b0b18;
          display: flex; align-items: center; justify-content: center;
        }
        .upm-status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .upm-status-dot.connected {
          background: #22c55e; box-shadow: 0 0 6px #22c55e;
          animation: upmBlink 2s infinite;
        }
        .upm-status-dot.idle { background: rgba(255,255,255,0.2); }
        @keyframes upmBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .upm-name {
          font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
          color: rgba(255,255,255,0.95); letter-spacing: -0.5px;
          text-align: center; line-height: 1.1; z-index: 1;
        }
        .upm-name-age {
          font-weight: 300; color: rgba(255,255,255,0.45);
          font-family: 'DM Sans', sans-serif; font-size: 20px;
        }
        .upm-live-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 14px; border-radius: 100px; font-size: 10px;
          font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; z-index: 1;
        }
        .upm-live-pill.connected {
          background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25);
          color: rgba(100,220,130,0.9);
        }
        .upm-live-pill.idle {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.3);
        }
        .upm-live-pill-dot { width: 5px; height: 5px; border-radius: 50%; }
        .upm-live-pill.connected .upm-live-pill-dot {
          background: #22c55e; box-shadow: 0 0 5px #22c55e; animation: upmBlink 2s infinite;
        }
        .upm-live-pill.idle .upm-live-pill-dot { background: rgba(255,255,255,0.2); }

        .upm-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent);
          margin: 0 24px; flex-shrink: 0;
        }

        .upm-section { padding: 20px 24px 0; }
        .upm-section-label {
          font-size: 9px; font-weight: 600; letter-spacing: 2px;
          text-transform: uppercase; color: rgba(255,255,255,0.25); margin-bottom: 10px;
        }
        .upm-bio {
          font-size: 14px; font-weight: 300; color: rgba(255,255,255,0.65);
          line-height: 1.65; font-style: italic;
        }
        .upm-bio-empty { font-size: 13px; color: rgba(255,255,255,0.2); font-style: italic; }

        /* FOTOS */
        .upm-photos {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 2px;
        }
        .upm-photo {
          aspect-ratio: 1; border-radius: 8px; object-fit: cover; width: 100%;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
        }

        /* TAGS */
        .upm-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
        .upm-interest-tag {
          padding: 5px 12px; border-radius: 100px;
          background: rgba(255,45,107,0.07); border: 1px solid rgba(255,45,107,0.15);
          font-size: 11px; color: rgba(255,180,195,0.8); letter-spacing: 0.3px;
        }
        .upm-looking-tag {
          padding: 5px 12px; border-radius: 100px;
          background: rgba(107,53,255,0.08); border: 1px solid rgba(107,53,255,0.2);
          font-size: 11px; color: rgba(180,160,255,0.85); letter-spacing: 0.3px;
        }

        /* META */
        .upm-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
        .upm-meta-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 10px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          font-size: 12px; color: rgba(255,255,255,0.55);
        }

        /* FOOTER */
        .upm-footer-line {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; padding: 24px 24px 0; opacity: 0.15;
        }
        .upm-footer-line::before, .upm-footer-line::after {
          content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.3);
        }
        .upm-footer-gem { width: 5px; height: 5px; border-radius: 50%; background: #ff2d6b; }
      `}</style>

      <div className={`upm-backdrop ${visible ? "visible" : "hidden"}`} onClick={onClose}>
        <div className="upm-sheet" onClick={(e) => e.stopPropagation()}>

          <div className="upm-handle" />
          <button className="upm-close" onClick={onClose} aria-label="Cerrar">✕</button>

          <div className="upm-scroll">

            {/* Hero */}
            <div className="upm-hero">
              <div className="upm-avatar-wrap">
                {isConnected && <div className="upm-avatar-ring" />}
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.name} className="upm-avatar" />
                  : <div className="upm-avatar-ph">{initials}</div>
                }
                <div className="upm-status">
                  <div className={`upm-status-dot ${isConnected ? "connected" : "idle"}`} />
                </div>
              </div>

              <div className="upm-name">
                {user.name}
                {user.age && <span className="upm-name-age">, {user.age}</span>}
              </div>

              <div className={`upm-live-pill ${isConnected ? "connected" : "idle"}`}>
                <div className="upm-live-pill-dot" />
                {isConnected ? "En vivo ahora" : "Conectando"}
              </div>
            </div>

            {/* Fotos extra */}
            {user.photos && user.photos.length > 0 && (
              <>
                <div className="upm-divider" />
                <div className="upm-section">
                  <div className="upm-section-label">Fotos</div>
                  <div className="upm-photos">
                    {user.photos.map((url, i) => (
                      <img key={i} src={url} alt={`foto ${i + 1}`} className="upm-photo" />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Género */}
            {user.gender && (
              <>
                <div className="upm-divider" style={{ marginTop: 20 }} />
                <div className="upm-section">
                  <div className="upm-section-label">Info</div>
                  <div className="upm-meta">
                    <div className="upm-meta-pill">
                      <span style={{ fontSize: 13 }}>👤</span>
                      {genderLabel[user.gender] ?? user.gender}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Bio */}
            <div className="upm-divider" style={{ marginTop: 20 }} />
            <div className="upm-section">
              <div className="upm-section-label">Sobre mí</div>
              {user.bio
                ? <p className="upm-bio">"{user.bio}"</p>
                : <p className="upm-bio-empty">Sin descripción todavía.</p>
              }
            </div>

            {/* Intereses */}
            {user.interests && user.interests.length > 0 && (
              <>
                <div className="upm-divider" style={{ marginTop: 20 }} />
                <div className="upm-section">
                  <div className="upm-section-label">Intereses</div>
                  <div className="upm-tags">
                    {user.interests.map((tag, i) => (
                      <span key={i} className="upm-interest-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Buscando */}
            {user.looking_for && user.looking_for.length > 0 && (
              <>
                <div className="upm-divider" style={{ marginTop: 20 }} />
                <div className="upm-section">
                  <div className="upm-section-label">Buscando</div>
                  <div className="upm-tags">
                    {user.looking_for.map((item, i) => (
                      <span key={i} className="upm-looking-tag">{item}</span>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="upm-footer-line">
              <div className="upm-footer-gem" />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}