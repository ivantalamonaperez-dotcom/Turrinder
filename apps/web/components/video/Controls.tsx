"use client";

import { useState } from "react";

type Props = {
  onNext: () => void | Promise<void>;
  onLike: () => void | Promise<void>;
  liked?: boolean; // 🔥 agregado
};

export default function Controls({ onNext, onLike, liked }: Props) {
  const [likeAnim, setLikeAnim] = useState(false);
  const [passAnim, setPassAnim] = useState(false);

  const handleLike = () => {
    if (liked) return; // 🔥 evita spam

    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    onLike();
  };

  const handlePass = () => {
    setPassAnim(true);
    setTimeout(() => setPassAnim(false), 400);
    onNext();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500&display=swap');

        .controls-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 16px 24px 32px;
          font-family: 'DM Sans', sans-serif;
        }

        .ctrl-hint {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          flex: 1;
          max-width: 80px;
        }

        .hint-label {
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          font-weight: 500;
        }

        .ctrl-btn {
          width: 64px; height: 64px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s;
          position: relative;
          flex-shrink: 0;
        }

        .ctrl-btn::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .btn-pass {
          background: rgba(255,77,77,0.12);
          border: 1.5px solid rgba(255,77,77,0.25);
          color: #ff4d4d;
        }

        .btn-pass::after {
          background: radial-gradient(circle, rgba(255,77,77,0.2), transparent 70%);
        }

        .btn-pass:hover {
          background: rgba(255,77,77,0.2);
          border-color: rgba(255,77,77,0.5);
          transform: scale(1.08);
          box-shadow: 0 8px 30px rgba(255,77,77,0.3);
        }

        .btn-pass.anim {
          transform: scale(0.88) rotate(-15deg);
        }

        .btn-pass.anim::after { opacity: 1; }

        .btn-like {
          background: rgba(255,45,107,0.12);
          border: 1.5px solid rgba(255,45,107,0.25);
          color: #ff2d6b;
        }

        .btn-like::after {
          background: radial-gradient(circle, rgba(255,45,107,0.2), transparent 70%);
        }

        .btn-like:hover {
          background: rgba(255,45,107,0.2);
          border-color: rgba(255,45,107,0.5);
          transform: scale(1.08);
          box-shadow: 0 8px 30px rgba(255,45,107,0.35);
        }

        .btn-like.anim {
          transform: scale(1.25);
          box-shadow: 0 0 40px rgba(255,45,107,0.5);
        }

        .btn-like.anim::after { opacity: 1; }

        /* 🔥 estado deshabilitado */
        .btn-like.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .btn-center {
          width: 52px; height: 52px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.4);
          font-size: 18px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .btn-center:hover {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.7);
          border-color: rgba(255,255,255,0.2);
        }

        .spacer { flex: 1; max-width: 80px; }
      `}</style>

      <div className="controls-container">
        <div className="ctrl-hint">
          <span className="hint-label">Pasar</span>
        </div>

        <button
          className={`ctrl-btn btn-pass ${passAnim ? "anim" : ""}`}
          onClick={handlePass}
          title="Pasar"
        >
          ✕
        </button>

        <button className="btn-center" title="Chat">
          💬
        </button>

        <button
          className={`ctrl-btn btn-like ${likeAnim ? "anim" : ""} ${
            liked ? "disabled" : ""
          }`}
          onClick={handleLike}
          title="Like"
          disabled={liked}
        >
          ♥
        </button>

        <div className="ctrl-hint" style={{ alignItems: "flex-end" }}>
          <span className="hint-label">Like</span>
        </div>
      </div>
    </>
  );
}