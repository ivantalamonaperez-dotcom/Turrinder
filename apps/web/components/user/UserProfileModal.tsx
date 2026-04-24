"use client";

import { useEffect, useState } from "react";
import type { MatchUserProfile } from "./UserChip";

interface Props {
  user: MatchUserProfile | null;
  isConnected?: boolean;
  visible: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ user, isConnected = false, visible, onClose }: Props) {
  const [show, setShow] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (visible) {
      setTimeout(() => setShow(true), 30);
    } else {
      setShow(false);
      setActivePhoto(0);
    }
  }, [visible]);

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

  if (!visible && !show) return null;
  if (!user) return null;

  const initials   = user.name?.[0]?.toUpperCase() ?? "?";
  const allPhotos  = user.photos?.length ? user.photos : (user.avatar_url ? [user.avatar_url] : []);

  const genderLabel: Record<string, string> = {
    male: "Hombre", female: "Mujer", non_binary: "No binario",
    "No binario": "No binario", "Hombre": "Hombre", "Mujer": "Mujer",
    other: "Otro", prefer_not_to_say: "Prefiero no decir",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        .upm-root {
          --sky:      #54c7f8;
          --sky2:     #3b9eda;
          --sky3:     #1a6fa8;
          --sky-glow: rgba(84,199,248,0.38);
          --sky-soft: rgba(84,199,248,0.10);
          --glass-b:  rgba(84,199,248,0.14);
          --bg:       #030a14;
          --bg2:      #060f1e;
          --white:    #f5f8ff;
          --muted:    rgba(180,215,240,0.45);
          --success:  #22c55e;
        }

        /* ── Backdrop ── */
        .upm-root {
          position: fixed; inset: 0; z-index: 9000;
          display: flex; align-items: flex-end; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;

          background: rgba(3,10,20,0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);

          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .upm-root.show {
          opacity: 1;
          pointer-events: all;
        }

        /* ── Sheet ── */
        .upm-sheet {
          width: 100%;
          max-width: 480px;
          max-height: 91dvh;
          background:
            radial-gradient(ellipse 80% 35% at 50% 0%, rgba(84,199,248,0.07) 0%, transparent 60%),
            #060f1e;
          border: 1px solid var(--glass-b);
          border-bottom: none;
          border-radius: 26px 26px 0 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;

          transform: translateY(32px);
          transition: transform 0.38s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .upm-root.show .upm-sheet {
          transform: translateY(0);
        }

        /* Línea superior sky */
        .upm-sheet::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1.5px;
          background: linear-gradient(90deg,
            transparent 0%,
            var(--sky3) 20%,
            var(--sky) 50%,
            var(--sky3) 80%,
            transparent 100%);
          box-shadow: 0 0 18px var(--sky-glow);
          z-index: 20;
        }

        /* ── Handle ── */
        .upm-handle {
          width: 36px; height: 4px;
          border-radius: 2px;
          background: rgba(84,199,248,0.18);
          margin: 14px auto 0;
          flex-shrink: 0;
        }

        /* ── Close ── */
        .upm-close {
          position: absolute; top: 14px; right: 16px; z-index: 30;
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--sky-soft);
          border: 1px solid var(--glass-b);
          color: var(--muted); font-size: 13px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, color 0.2s, transform 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .upm-close:hover {
          background: rgba(84,199,248,0.18);
          color: var(--sky);
          transform: scale(1.08);
        }

        /* ── Scroll ── */
        .upm-scroll {
          overflow-y: auto; flex: 1; min-height: 0;
          padding: 0 0 40px;
          scrollbar-width: none;
        }
        .upm-scroll::-webkit-scrollbar { display: none; }

        /* ══════════════════════════════
           HERO — foto principal + nombre
        ══════════════════════════════ */
        .upm-hero {
          position: relative;
          padding: 24px 24px 20px;
          display: flex;
          align-items: flex-end;
          gap: 18px;
        }

        /* Foto principal grande */
        .upm-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .upm-avatar {
          width: 88px; height: 88px;
          border-radius: 18px;
          object-fit: cover;
          border: 2px solid var(--glass-b);
          box-shadow: 0 0 0 1px rgba(84,199,248,0.08), 0 8px 28px rgba(0,0,0,0.55);
          display: block;
        }
        .upm-avatar-ph {
          width: 88px; height: 88px;
          border-radius: 18px;
          background: linear-gradient(135deg, #060f1e, #0a1a2e);
          border: 2px solid var(--glass-b);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif;
          font-size: 34px; font-weight: 900;
          color: var(--sky);
        }

        /* Dot de estado en esquina */
        .upm-status-dot {
          position: absolute;
          bottom: -4px; right: -4px;
          width: 20px; height: 20px;
          border-radius: 50%;
          border: 2.5px solid #060f1e;
          display: flex; align-items: center; justify-content: center;
        }
        .upm-status-dot::after {
          content: '';
          width: 8px; height: 8px;
          border-radius: 50%;
        }
        .upm-status-dot.live::after {
          background: var(--success);
          box-shadow: 0 0 6px var(--success);
          animation: upmBlink 2s infinite;
        }
        .upm-status-dot.idle::after {
          background: rgba(255,255,255,0.18);
        }
        @keyframes upmBlink { 0%,100%{opacity:1} 50%{opacity:0.25} }

        /* Info al lado de la foto */
        .upm-hero-info {
          flex: 1; min-width: 0;
        }
        .upm-name {
          font-family: 'Syne', sans-serif;
          font-size: 24px; font-weight: 900;
          color: var(--white);
          letter-spacing: -0.5px;
          line-height: 1.1;
          margin-bottom: 5px;
        }
        .upm-name-age {
          font-family: 'DM Sans', sans-serif;
          font-size: 18px; font-weight: 300;
          color: rgba(180,215,240,0.5);
        }

        /* Pill estado */
        .upm-live-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px; border-radius: 100px;
          font-size: 9px; font-weight: 600;
          letter-spacing: 2px; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .upm-live-pill.live {
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.2);
          color: rgba(100,220,130,0.9);
        }
        .upm-live-pill.idle {
          background: var(--sky-soft);
          border: 1px solid var(--glass-b);
          color: rgba(143,212,255,0.6);
        }
        .upm-live-pip {
          width: 5px; height: 5px; border-radius: 50%;
        }
        .upm-live-pill.live   .upm-live-pip { background: var(--success); box-shadow: 0 0 5px var(--success); animation: upmBlink 2s infinite; }
        .upm-live-pill.idle   .upm-live-pip { background: var(--sky); box-shadow: 0 0 5px var(--sky-glow); }

        /* Tags rápidos bajo el nombre */
        .upm-quick-tags {
          display: flex; flex-wrap: wrap; gap: 5px;
        }
        .upm-qtag {
          padding: 3px 10px; border-radius: 100px;
          background: var(--sky-soft);
          border: 1px solid var(--glass-b);
          font-size: 10px; color: rgba(143,212,255,0.8);
          letter-spacing: 0.3px;
        }

        /* ══════════════════════════════
           GALERÍA DE FOTOS
        ══════════════════════════════ */
        .upm-gallery {
          padding: 0 24px;
          margin-bottom: 4px;
        }
        .upm-gallery-main {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          border-radius: 16px;
          overflow: hidden;
          background: #040c18;
          border: 1px solid var(--glass-b);
          margin-bottom: 8px;
        }
        .upm-gallery-main img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }
        .upm-gallery-main-ph {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 56px; opacity: 0.3;
        }
        /* Overlay degradado en foto principal */
        .upm-gallery-main::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(6,15,30,0.7) 0%, transparent 45%);
          pointer-events: none;
        }
        /* Contador de fotos */
        .upm-photo-count {
          position: absolute; bottom: 10px; right: 12px; z-index: 2;
          background: rgba(3,10,20,0.65);
          border: 1px solid var(--glass-b);
          backdrop-filter: blur(8px);
          border-radius: 100px;
          padding: 3px 10px;
          font-size: 9px; font-weight: 600;
          color: rgba(143,212,255,0.7);
          letter-spacing: 1px;
        }
        /* Thumbnails */
        .upm-thumbs {
          display: flex; gap: 6px; overflow-x: auto;
          scrollbar-width: none; padding-bottom: 2px;
        }
        .upm-thumbs::-webkit-scrollbar { display: none; }
        .upm-thumb {
          width: 52px; height: 52px;
          border-radius: 10px; object-fit: cover;
          flex-shrink: 0; cursor: pointer;
          border: 2px solid transparent;
          transition: border-color 0.2s, transform 0.15s;
          background: #040c18;
        }
        .upm-thumb.active {
          border-color: var(--sky);
          box-shadow: 0 0 10px rgba(84,199,248,0.4);
        }
        .upm-thumb:hover:not(.active) {
          border-color: var(--glass-b);
          transform: scale(1.05);
        }

        /* ══════════════════════════════
           SECCIONES
        ══════════════════════════════ */
        .upm-divider {
          height: 1px; margin: 20px 24px 0;
          background: linear-gradient(to right,
            transparent,
            rgba(84,199,248,0.10) 30%,
            rgba(84,199,248,0.10) 70%,
            transparent);
        }

        .upm-section { padding: 16px 24px 0; }

        .upm-section-hdr {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 12px;
        }
        .upm-section-hdr-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--sky);
          box-shadow: 0 0 6px var(--sky-glow);
          flex-shrink: 0;
        }
        .upm-section-label {
          font-size: 9px; font-weight: 700;
          letter-spacing: 2.5px; text-transform: uppercase;
          color: rgba(84,199,248,0.5);
        }
        .upm-section-hdr-line {
          flex: 1; height: 1px;
          background: linear-gradient(to right, rgba(84,199,248,0.12), transparent);
        }

        /* Bio */
        .upm-bio {
          font-size: 14px; font-weight: 300;
          color: rgba(180,215,240,0.7);
          line-height: 1.7; font-style: italic;
          padding: 12px 16px;
          background: var(--sky-soft);
          border: 1px solid var(--glass-b);
          border-radius: 12px;
          position: relative;
        }
        .upm-bio::before {
          content: '"';
          position: absolute; top: 6px; left: 12px;
          font-size: 28px; line-height: 1;
          color: rgba(84,199,248,0.2);
          font-family: 'Syne', sans-serif;
        }
        .upm-bio-empty {
          font-size: 13px; color: rgba(255,255,255,0.18);
          font-style: italic;
        }

        /* Info meta pills */
        .upm-meta { display: flex; flex-wrap: wrap; gap: 7px; }
        .upm-meta-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 13px; border-radius: 10px;
          background: var(--sky-soft);
          border: 1px solid var(--glass-b);
          font-size: 12px; color: rgba(180,215,240,0.7);
          letter-spacing: 0.3px;
        }
        .upm-meta-pill span { font-size: 13px; }

        /* Tags intereses */
        .upm-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .upm-interest-tag {
          padding: 5px 13px; border-radius: 100px;
          background: var(--sky-soft);
          border: 1px solid var(--glass-b);
          font-size: 11px; color: rgba(143,212,255,0.85);
          letter-spacing: 0.3px;
          transition: background 0.2s, border-color 0.2s;
        }
        .upm-interest-tag:hover {
          background: rgba(84,199,248,0.18);
          border-color: rgba(84,199,248,0.35);
        }
        .upm-looking-tag {
          padding: 5px 13px; border-radius: 100px;
          background: rgba(26,111,168,0.12);
          border: 1px solid rgba(84,199,248,0.2);
          font-size: 11px; color: rgba(168,230,255,0.8);
        }

        /* Footer decorativo */
        .upm-footer {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; padding: 24px 24px 0; opacity: 0.2;
        }
        .upm-footer::before, .upm-footer::after {
          content: ''; flex: 1; height: 1px;
          background: linear-gradient(to right, transparent, var(--sky));
        }
        .upm-footer::after {
          background: linear-gradient(to left, transparent, var(--sky));
        }
        .upm-footer-gem {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--sky);
          box-shadow: 0 0 8px var(--sky);
        }
      `}</style>

      <div className={`upm-root${show ? " show" : ""}`} onClick={onClose}>
        <div className="upm-sheet" onClick={(e) => e.stopPropagation()}>

          <div className="upm-handle" />
          <button className="upm-close" onClick={onClose} aria-label="Cerrar">✕</button>

          <div className="upm-scroll">

            {/* ══ HERO ══ */}
            <div className="upm-hero">
              <div className="upm-avatar-wrap">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.name} className="upm-avatar" />
                  : <div className="upm-avatar-ph">{initials}</div>
                }
                <div className={`upm-status-dot ${isConnected ? "live" : "idle"}`} />
              </div>

              <div className="upm-hero-info">
                <div className={`upm-live-pill ${isConnected ? "live" : "idle"}`}>
                  <div className="upm-live-pip" />
                  {isConnected ? "En vivo ahora" : "Conectando"}
                </div>

                <div className="upm-name">
                  {user.name}
                  {user.age && <span className="upm-name-age">, {user.age}</span>}
                </div>

                {/* Tags rápidos: género + looking_for preview */}
                <div className="upm-quick-tags">
                  {user.gender && (
                    <span className="upm-qtag">
                      {genderLabel[user.gender] ?? user.gender}
                    </span>
                  )}
                  {user.looking_for?.slice(0, 2).map((lf, i) => (
                    <span key={i} className="upm-qtag">{lf}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* ══ GALERÍA ══ */}
            {allPhotos.length > 0 && (
              <div className="upm-gallery">
                <div className="upm-gallery-main">
                  <img src={allPhotos[activePhoto]} alt="foto principal" />
                  {allPhotos.length > 1 && (
                    <div className="upm-photo-count">
                      {activePhoto + 1} / {allPhotos.length}
                    </div>
                  )}
                </div>

                {allPhotos.length > 1 && (
                  <div className="upm-thumbs">
                    {allPhotos.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`foto ${i + 1}`}
                        className={`upm-thumb ${activePhoto === i ? "active" : ""}`}
                        onClick={() => setActivePhoto(i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ BIO ══ */}
            <div className="upm-divider" />
            <div className="upm-section">
              <div className="upm-section-hdr">
                <div className="upm-section-hdr-dot" />
                <span className="upm-section-label">Sobre mí</span>
                <div className="upm-section-hdr-line" />
              </div>
              {user.bio
                ? <p className="upm-bio">{user.bio}</p>
                : <p className="upm-bio-empty">Sin descripción todavía.</p>
              }
            </div>

            {/* ══ INTERESES ══ */}
            {user.interests && user.interests.length > 0 && (
              <>
                <div className="upm-divider" />
                <div className="upm-section">
                  <div className="upm-section-hdr">
                    <div className="upm-section-hdr-dot" />
                    <span className="upm-section-label">Intereses</span>
                    <div className="upm-section-hdr-line" />
                  </div>
                  <div className="upm-tags">
                    {user.interests.map((tag, i) => (
                      <span key={i} className="upm-interest-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ══ BUSCANDO ══ */}
            {user.looking_for && user.looking_for.length > 0 && (
              <>
                <div className="upm-divider" />
                <div className="upm-section">
                  <div className="upm-section-hdr">
                    <div className="upm-section-hdr-dot" />
                    <span className="upm-section-label">Buscando</span>
                    <div className="upm-section-hdr-line" />
                  </div>
                  <div className="upm-tags">
                    {user.looking_for.map((item, i) => (
                      <span key={i} className="upm-looking-tag">{item}</span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="upm-footer">
              <div className="upm-footer-gem" />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}