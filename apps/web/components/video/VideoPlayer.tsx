"use client";

import { useState, useEffect } from "react";
import { useWebRTC } from "./useWebRTC";

interface Props {
  room: { id: string } | null;
  matchUser: any;
  onNext: () => void;
  onLike: () => void;
  liked: boolean;
  searching?: boolean;
}

export default function VideoPlayer({ room, matchUser, onNext, onLike, liked, searching }: Props) {
  const targetPartnerId = room?.id || null;
  const { localVideoRef, remoteVideoRef, isConnected, remoteStream, cameraError, matchConfirmed } =
    useWebRTC(targetPartnerId);

  const [audioLocked, setAudioLocked] = useState(true);
  const [likeAnim,    setLikeAnim]    = useState(false);
  const [skipAnim,    setSkipAnim]    = useState(false);
  const [likeFlash,   setLikeFlash]   = useState(false);

  const hasVideo    = !!remoteStream || (isConnected && !!targetPartnerId);
  const remoteReady = hasVideo || matchConfirmed;

  useEffect(() => { setAudioLocked(true); }, [targetPartnerId]);

  const unlockAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.play().catch(() => {});
      setAudioLocked(false);
    }
  };

  const handleLike = () => {
    if (!liked) {
      setLikeAnim(true);
      setLikeFlash(true);
      setTimeout(() => setLikeAnim(false), 700);
      setTimeout(() => setLikeFlash(false), 600);
      onLike();
    }
  };

  const handleSkip = () => {
    setSkipAnim(true);
    setTimeout(() => { setSkipAnim(false); onNext(); }, 350);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        /* ── ROOT ── */
        .vp-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: row;
          overflow: hidden;
          position: relative;
          background: #04040c;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── PANELES 50/50 ── */
        .vp-panel {
          flex: 1;
          position: relative;
          overflow: hidden;
          min-width: 0;
        }
        .vp-panel-local  { background: #060610; }
        .vp-panel-remote { background: #08060e; }

        /* ── VIDEOS ── */
        .vp-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .vp-video-local  { transform: scaleX(-1); }
        .vp-video-remote { transition: opacity 1s ease; }

        /* ── VIGNETTE en cada panel ── */
        .vp-panel::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(4,4,12,0.55) 100%);
          pointer-events: none;
          z-index: 2;
        }

        /* ── ETIQUETA LOCAL ── */
        .vp-label {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(8px);
          border-radius: 100px;
          padding: 4px 12px 4px 8px;
          font-size: 10px;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .vp-rec-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: recBlink 2s infinite;
          flex-shrink: 0;
        }
        @keyframes recBlink { 0%,100%{opacity:1} 50%{opacity:0.25} }

        /* ── DIVISOR CENTRAL ── */
        .vp-divider {
          position: absolute;
          left: 50%;
          top: 0; bottom: 0;
          transform: translateX(-50%);
          width: 2px;
          z-index: 30;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(255,45,107,0.0) 5%,
            rgba(255,45,107,0.7) 20%,
            rgba(255,107,53,1)   50%,
            rgba(255,45,107,0.7) 80%,
            rgba(255,45,107,0.0) 95%,
            transparent 100%
          );
          box-shadow: 0 0 12px rgba(255,70,80,0.5), 0 0 30px rgba(255,45,107,0.2);
        }
        /* Punto central en el divisor */
        .vp-divider-gem {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 10px; height: 10px;
          border-radius: 50%;
          background: radial-gradient(circle, #ff6b35 0%, #ff2d6b 100%);
          box-shadow: 0 0 16px rgba(255,45,107,0.9), 0 0 40px rgba(255,45,107,0.4);
          z-index: 31;
          animation: gemPulse 3s ease-in-out infinite;
        }
        @keyframes gemPulse {
          0%,100% { box-shadow: 0 0 16px rgba(255,45,107,0.9), 0 0 40px rgba(255,45,107,0.3); transform: translate(-50%,-50%) scale(1); }
          50%      { box-shadow: 0 0 24px rgba(255,107,53,1),   0 0 60px rgba(255,45,107,0.5); transform: translate(-50%,-50%) scale(1.25); }
        }

        /* ── CONTROLES FLOTANTES — encima del divisor ── */
        .vp-controls {
          position: absolute;
          left: 50%;
          bottom: 28px;
          transform: translateX(-50%);
          z-index: 40;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .vp-ctrl {
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
          position: relative;
          -webkit-tap-highlight-color: transparent;
        }

        .vp-ctrl-skip {
          width: 50px; height: 50px;
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.7);
          border: 1.5px solid rgba(255,255,255,0.12);
          font-size: 17px;
          backdrop-filter: blur(10px);
        }
        .vp-ctrl-skip:hover { background: rgba(255,255,255,0.13); transform: scale(1.06); }
        .vp-ctrl-skip.anim  { transform: scale(0.82) rotate(-12deg); }

        .vp-ctrl-like {
          width: 62px; height: 62px;
          background: linear-gradient(135deg, #ff2d6b 0%, #c9193e 100%);
          color: white;
          font-size: 24px;
          box-shadow: 0 4px 20px rgba(255,45,107,0.4), 0 0 0 0 rgba(255,45,107,0.3);
        }
        .vp-ctrl-like:hover  { transform: translateY(-3px) scale(1.05); box-shadow: 0 8px 28px rgba(255,45,107,0.55); }
        .vp-ctrl-like.anim   { transform: scale(1.35); box-shadow: 0 0 0 12px rgba(255,45,107,0); }
        .vp-ctrl-like.liked  { filter: grayscale(0.7); opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

        .vp-ctrl-label {
          position: absolute;
          bottom: -18px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          font-weight: 500;
          color: rgba(255,255,255,0.3);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        /* ── LIKE FLASH ── */
        .vp-like-flash {
          position: absolute;
          inset: 0;
          z-index: 50;
          pointer-events: none;
          background: radial-gradient(ellipse at center, rgba(255,45,107,0.18) 0%, transparent 70%);
          animation: likeFlash 0.6s ease-out forwards;
        }
        @keyframes likeFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }

        /* ── SIN CÁMARA ── */
        .vp-no-cam {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #060610;
          z-index: 3;
        }
        .vp-no-cam-icon { font-size: 28px; opacity: 0.25; }
        .vp-no-cam-text {
          font-size: 10px;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        /* ── RADAR (buscando) ── */
        .vp-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          z-index: 5;
          background: #08060e;
        }
        .vp-radar {
          position: relative;
          width: 80px; height: 80px;
        }
        .vp-radar-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255,45,107,0.35);
          top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          animation: radarExpand 2.6s ease-out infinite;
        }
        @keyframes radarExpand {
          0%   { width: 20px; height: 20px; opacity: 0.9; }
          100% { width: 110px; height: 110px; opacity: 0; }
        }
        .vp-radar-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          width: 42px; height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 0 24px rgba(255,45,107,0.7);
          animation: radarCenterPulse 2.6s ease-in-out infinite;
        }
        @keyframes radarCenterPulse {
          0%,100% { box-shadow: 0 0 24px rgba(255,45,107,0.7); }
          50%      { box-shadow: 0 0 40px rgba(255,45,107,1), 0 0 70px rgba(255,45,107,0.3); }
        }
        .vp-radar-text {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #ff2d6b;
          letter-spacing: 3px;
          text-transform: uppercase;
          opacity: 0.9;
        }
        .vp-radar-sub {
          font-size: 10px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 1px;
          margin-top: -12px;
        }

        /* ── PERFIL FALLBACK ── */
        .vp-profile-card {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 4;
          background: radial-gradient(ellipse at 50% 40%, rgba(255,45,107,0.06) 0%, #08060e 60%);
        }
        .vp-avatar {
          width: 84px; height: 84px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255,45,107,0.5);
          box-shadow: 0 0 0 4px rgba(255,45,107,0.1), 0 0 30px rgba(255,45,107,0.25);
        }
        .vp-avatar-ph {
          width: 84px; height: 84px;
          border-radius: 50%;
          background: linear-gradient(135deg, #180a12, #280d1e);
          border: 2px solid rgba(255,45,107,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          box-shadow: 0 0 0 4px rgba(255,45,107,0.07);
        }
        .vp-profile-name {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: white;
          text-align: center;
        }
        .vp-profile-online {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; color: rgba(255,255,255,0.4);
        }
        .vp-online-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #22c55e; box-shadow: 0 0 6px #22c55e;
          animation: recBlink 2s infinite;
        }
        .vp-badge {
          background: rgba(255,45,107,0.1);
          border: 1px solid rgba(255,45,107,0.25);
          border-radius: 100px;
          padding: 3px 12px;
          font-size: 9px;
          color: rgba(255,45,107,0.8);
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        /* ── INFO OVERLAY (con video activo) ── */
        .vp-info {
          position: absolute;
          bottom: 80px; /* sobre los controles */
          left: 14px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 4px;
          pointer-events: none;
        }
        .vp-info-name {
          font-family: 'Syne', sans-serif;
          font-size: 17px;
          font-weight: 800;
          color: white;
          text-shadow: 0 2px 12px rgba(0,0,0,0.9);
        }
        .vp-info-status {
          display: flex; align-items: center; gap: 5px;
          font-size: 10px; color: rgba(255,255,255,0.6);
          letter-spacing: 0.5px;
        }
        .vp-live-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #22c55e; box-shadow: 0 0 5px #22c55e;
        }
        .vp-ice-badge {
          font-size: 9px;
          background: rgba(34,197,94,0.15);
          border: 1px solid rgba(34,197,94,0.25);
          color: rgba(34,197,94,0.9);
          border-radius: 100px;
          padding: 1px 8px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* ── AUDIO HINT ── */
        .vp-audio-hint {
          position: absolute;
          top: 14px; right: 14px;
          background: rgba(255,45,107,0.85);
          backdrop-filter: blur(8px);
          color: white;
          padding: 5px 13px;
          border-radius: 100px;
          font-size: 10px;
          font-weight: 600;
          z-index: 20;
          letter-spacing: 0.5px;
          animation: audioPulse 2s ease-in-out infinite;
        }
        @keyframes audioPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.65; }
        }

        /* ── CORNER DECORATION ── */
        .vp-corner {
          position: absolute;
          width: 20px; height: 20px;
          z-index: 10;
          opacity: 0.35;
        }
        .vp-corner-tl { top: 10px; left: 10px; border-top: 1.5px solid #ff2d6b; border-left: 1.5px solid #ff2d6b; }
        .vp-corner-tr { top: 10px; right: 10px; border-top: 1.5px solid #ff2d6b; border-right: 1.5px solid #ff2d6b; }
        .vp-corner-bl { bottom: 10px; left: 10px; border-bottom: 1.5px solid #ff2d6b; border-left: 1.5px solid #ff2d6b; }
        .vp-corner-br { bottom: 10px; right: 10px; border-bottom: 1.5px solid #ff2d6b; border-right: 1.5px solid #ff2d6b; }
      `}</style>

      {/* Like flash overlay */}
      {likeFlash && <div className="vp-like-flash" />}

      <div className="vp-root" onClick={unlockAudio}>

        {/* ════════════════ PANEL IZQUIERDO — TÚ ════════════════ */}
        <div className="vp-panel vp-panel-local">
          <video ref={localVideoRef} autoPlay muted playsInline className="vp-video vp-video-local" />

          {cameraError && (
            <div className="vp-no-cam">
              <div className="vp-no-cam-icon">📷</div>
              <div className="vp-no-cam-text">Sin cámara</div>
            </div>
          )}

          {/* Etiqueta "Tú" */}
          <div className="vp-label" style={{ zIndex: 10 }}>
            <div className="vp-rec-dot" /> Tú
          </div>

          {/* Corner brackets decorativos */}
          <div className="vp-corner vp-corner-tl" />
          <div className="vp-corner vp-corner-bl" />
        </div>

        {/* ════════════════ DIVISOR CENTRAL ════════════════ */}
        <div className="vp-divider">
          <div className="vp-divider-gem" />
        </div>

        {/* ════════════════ PANEL DERECHO — PAREJA ════════════════ */}
        <div className="vp-panel vp-panel-remote">

          {/* Video remoto */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="vp-video vp-video-remote"
            style={{ opacity: hasVideo ? 1 : 0 }}
          />

          {/* Estado: buscando */}
          {!remoteReady && (
            <div className="vp-placeholder">
              <div className="vp-radar">
                <div className="vp-radar-ring" style={{ animationDelay: "0s" }} />
                <div className="vp-radar-ring" style={{ animationDelay: "0.9s" }} />
                <div className="vp-radar-ring" style={{ animationDelay: "1.8s" }} />
                <div className="vp-radar-center">{searching ? "🔥" : "👤"}</div>
              </div>
              <div className="vp-radar-text">
                {searching ? "Buscando..." : "Enlazando..."}
              </div>
              <div className="vp-radar-sub">
                {searching ? "Encontrando tu pareja" : "Estableciendo conexión"}
              </div>
            </div>
          )}

          {/* Estado: match sin video — perfil */}
          {remoteReady && !hasVideo && matchUser && (
            <div className="vp-profile-card">
              {matchUser.avatar_url
                ? <img src={matchUser.avatar_url} alt={matchUser.name} className="vp-avatar" />
                : <div className="vp-avatar-ph">{matchUser.name?.[0]?.toUpperCase() ?? "?"}</div>
              }
              <div className="vp-profile-name">
                {matchUser.name}{matchUser.age ? `, ${matchUser.age}` : ""}
              </div>
              <div className="vp-profile-online">
                <div className="vp-online-dot" /> Conectado
              </div>
              <div className="vp-badge">
                {isConnected ? "Video en camino" : "Enlazando video"}
              </div>
            </div>
          )}

          {/* Estado: match sin video, sin perfil */}
          {remoteReady && !hasVideo && !matchUser && (
            <div className="vp-profile-card">
              <div className="vp-avatar-ph">👤</div>
              <div className="vp-profile-name" style={{ opacity: 0.5, fontSize: 15 }}>
                Cargando perfil...
              </div>
              <div className="vp-badge">Enlazando video</div>
            </div>
          )}

          {/* Audio hint */}
          {remoteReady && hasVideo && audioLocked && (
            <div className="vp-audio-hint">🔊 Toca para escuchar</div>
          )}

          {/* Info overlay con video activo */}
          {hasVideo && matchUser && (
            <div className="vp-info">
              <div className="vp-info-name">
                {matchUser.name}{matchUser.age ? `, ${matchUser.age}` : ""}
              </div>
              <div className="vp-info-status">
                <div className="vp-live-dot" />
                <span className="vp-ice-badge">{isConnected ? "Estable" : "En vivo"}</span>
              </div>
            </div>
          )}

          {/* Corner brackets */}
          <div className="vp-corner vp-corner-tr" />
          <div className="vp-corner vp-corner-br" />
        </div>

        {/* ════════════════ CONTROLES FLOTANTES ════════════════ */}
        <div className="vp-controls">
          <div style={{ position: "relative" }}>
            <button
              className={`vp-ctrl vp-ctrl-skip ${skipAnim ? "anim" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleSkip(); }}
              title="Pasar"
            >
              ✕
            </button>
            <span className="vp-ctrl-label">Pasar</span>
          </div>

          <div style={{ position: "relative" }}>
            <button
              className={`vp-ctrl vp-ctrl-like ${likeAnim ? "anim" : ""} ${liked ? "liked" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleLike(); }}
              disabled={liked}
              title="Like"
            >
              ♥
            </button>
            <span className="vp-ctrl-label">Like</span>
          </div>
        </div>

      </div>
    </>
  );
}