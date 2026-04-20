"use client";

/**
 * VideoControls.tsx
 *
 * Barra de controles reutilizable para VideoPlayer.
 *
 * Props:
 *   onSkip           — callback al pasar
 *   onLike           — callback al dar like
 *   liked            — si ya se dio like (deshabilita el botón)
 *   skipBlocked      — si el skip está bloqueado (anuncio)
 *   streamerMode     — estado actual del modo streamer
 *   onStreamerToggle — callback para togglear modo streamer
 *   hideStreamer      — ocultar el botón de modo streamer
 *   hideLike          — ocultar el botón de like (ej: en discover)
 */

import { useState } from "react";

export interface VideoControlsProps {
  onSkip: () => void;
  onLike: () => void;
  liked?: boolean;
  skipBlocked?: boolean;
  streamerMode?: boolean;
  onStreamerToggle?: () => void;
  /** Ocultar el botón de modo streamer */
  hideStreamer?: boolean;
  /** Ocultar el botón de like — en discover solo hay skip + streamer */
  hideLike?: boolean;
}

export default function VideoControls({
  onSkip,
  onLike,
  liked = false,
  skipBlocked = false,
  streamerMode = false,
  onStreamerToggle,
  hideStreamer = false,
  hideLike = false,
}: VideoControlsProps) {
  const [likeAnim, setLikeAnim] = useState(false);
  const [skipAnim, setSkipAnim] = useState(false);

  const handleLike = () => {
    if (liked) return;
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 700);
    onLike();
  };

  const handleSkip = () => {
    if (skipBlocked) return;
    setSkipAnim(true);
    setTimeout(() => { setSkipAnim(false); onSkip(); }, 350);
  };

  // Cuando no hay like, el skip y el streamer se centran de otro modo
  const noLike = hideLike;

  return (
    <>
      <style>{`
        .vc-root {
          --sky:      #54c7f8;
          --sky2:     #3b9eda;
          --sky3:     #1a6fa8;
          --sky-glow: rgba(84,199,248,0.38);
          --glass-b:  rgba(84,199,248,0.12);
          --muted:    rgba(180,215,240,0.45);
        }

        .vc-root {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          gap: 16px;
          padding: 8px 24px calc(30px + env(safe-area-inset-bottom, 20px));
          background: rgba(3,10,20,0.97);
          border-top: 1px solid var(--glass-b);
          backdrop-filter: blur(16px);
          z-index: 40;
          font-family: 'DM Sans', sans-serif;
        }

        /* Sin like: los botones se espacian más */
        .vc-root.no-like {
          gap: 32px;
        }

        .vc-slot {
          width: 50px;
          display: flex; align-items: center; justify-content: center;
        }

        .vc-slot-center {
          display: flex; align-items: center; justify-content: center;
        }

        .vc-btn {
          border-radius: 50%; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
          position: relative;
          -webkit-tap-highlight-color: transparent;
        }

        /* Skip */
        .vc-btn-skip {
          width: 50px; height: 50px;
          background: rgba(84,199,248,0.05);
          color: var(--muted);
          border: 1.5px solid var(--glass-b);
          font-size: 17px;
          backdrop-filter: blur(10px);
        }
        .vc-btn-skip:hover   { background: rgba(84,199,248,0.10); transform: scale(1.06); }
        .vc-btn-skip.anim    { transform: scale(0.82) rotate(-12deg); }
        .vc-btn-skip:disabled { opacity: 0.3; cursor: not-allowed; transform: none !important; }

        /* Like */
        .vc-btn-like {
          width: 62px; height: 62px;
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 50%, var(--sky3) 100%);
          color: #02080f;
          font-size: 24px;
          box-shadow: 0 4px 20px rgba(84,199,248,0.45);
        }
        .vc-btn-like:hover  { transform: translateY(-3px) scale(1.05); box-shadow: 0 8px 28px rgba(84,199,248,0.6); }
        .vc-btn-like.anim   { transform: scale(1.35); }
        .vc-btn-like.liked  { filter: grayscale(0.6); opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

        /* Streamer */
        .vc-btn-streamer {
          width: 50px; height: 50px;
          background: rgba(84,199,248,0.05);
          color: rgba(143,212,255,0.5);
          border: 1.5px solid var(--glass-b);
          font-size: 17px;
          backdrop-filter: blur(10px);
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), background 0.25s, border-color 0.25s, color 0.25s;
        }
        .vc-btn-streamer:hover { background: rgba(84,199,248,0.10); transform: scale(1.06); }
        .vc-btn-streamer.active {
          background: rgba(84,199,248,0.15);
          border-color: rgba(84,199,248,0.42);
          color: rgba(143,212,255,0.95);
          box-shadow: 0 0 14px rgba(84,199,248,0.28);
        }

        .vc-label {
          position: absolute;
          bottom: -18px; left: 50%;
          transform: translateX(-50%);
          font-size: 9px; font-weight: 500;
          color: rgba(143,212,255,0.28);
          letter-spacing: 1.5px; text-transform: uppercase; white-space: nowrap;
        }
      `}</style>

      <div className={`vc-root${noLike ? " no-like" : ""}`} onClick={(e) => e.stopPropagation()}>

        {/* Skip */}
        <div className="vc-slot">
          <div style={{ position: "relative" }}>
            <button
              className={`vc-btn vc-btn-skip ${skipAnim ? "anim" : ""}`}
              onClick={handleSkip}
              disabled={skipBlocked}
              title="Pasar"
            >
              ✕
            </button>
            <span className="vc-label">Pasar</span>
          </div>
        </div>

        {/* Like — opcional */}
        {!hideLike && (
          <div className="vc-slot-center">
            <div style={{ position: "relative" }}>
              <button
                className={`vc-btn vc-btn-like ${likeAnim ? "anim" : ""} ${liked ? "liked" : ""}`}
                onClick={handleLike}
                disabled={liked}
                title="Like"
              >
                ♥
              </button>
              <span className="vc-label">Like</span>
            </div>
          </div>
        )}

        {/* Streamer — opcional */}
        {!hideStreamer && (
          <div className="vc-slot">
            <div style={{ position: "relative" }}>
              <button
                className={`vc-btn vc-btn-streamer ${streamerMode ? "active" : ""}`}
                onClick={(e) => { e.stopPropagation(); onStreamerToggle?.(); }}
                title={streamerMode ? "Desactivar modo streamer" : "Activar modo streamer"}
              >
                {streamerMode ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
              <span
                className="vc-label"
                style={{ color: streamerMode ? "rgba(143,212,255,0.7)" : undefined }}
              >
                {streamerMode ? "Visible" : "Streamer"}
              </span>
            </div>
          </div>
        )}

      </div>
    </>
  );
}