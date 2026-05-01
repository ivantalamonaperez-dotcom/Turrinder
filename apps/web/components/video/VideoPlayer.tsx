"use client";

/**
 * VideoPlayer.tsx — v2
 * Recibe `isInitiator` como prop y lo pasa a useWebRTC.
 * Ya no hay lógica de match-found dentro de useWebRTC.
 */

import { useState, useEffect } from "react";
import { useWebRTC } from "./useWebRTC";
import UserChip from "@/components/user/UserChip";
import VideoControls from "./Videocontrols";
import liguesImg from "../../Images/ligues.png";

interface Props {
  room: { id: string } | null;
  isInitiator: boolean;
  matchUser: any;
  onNext: () => void;
  onLike: () => void;
  liked: boolean;
  searching?: boolean;
  skipBlocked?: boolean;
  customControls?: React.ReactNode;
  streamerModeExternal?: boolean;
}

export default function VideoPlayer({
  room,
  isInitiator,
  matchUser,
  onNext,
  onLike,
  liked,
  searching,
  skipBlocked,
  customControls,
  streamerModeExternal,
}: Props) {
  const targetPartnerId = room?.id || null;
  const { localVideoRef, remoteVideoRef, isConnected, remoteStream, cameraError, matchConfirmed } =
    useWebRTC({ currentRoomId: targetPartnerId, isInitiator });

  const [audioLocked,          setAudioLocked]          = useState(true);
  const [likeFlash,            setLikeFlash]            = useState(false);
  const [streamerModeInternal, setStreamerModeInternal] = useState(false);

  const streamerMode = streamerModeExternal !== undefined
    ? streamerModeExternal
    : streamerModeInternal;

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
    setLikeFlash(true);
    setTimeout(() => setLikeFlash(false), 600);
    onLike();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        .vp-root {
          --sky:      #54c7f8;
          --sky2:     #3b9eda;
          --sky3:     #1a6fa8;
          --sky-glow: rgba(84,199,248,0.38);
          --w:        #f5f8ff;
          --bg:       #030a14;
          --bg2:      #050f1e;
          --glass:    rgba(84,199,248,0.04);
          --glass-b:  rgba(84,199,248,0.12);
          --muted:    rgba(180,215,240,0.45);
        }

        .vp-root {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          overflow: hidden; position: relative;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
        }

        .vp-video-zone {
          flex: 1; min-height: 0;
          display: flex; flex-direction: row;
          position: relative; overflow: hidden;
        }

        .vp-panel {
          flex: 1; position: relative;
          overflow: hidden; min-width: 0;
        }
        .vp-panel-local  { background: #040c18; }
        .vp-panel-remote { background: #050f1e; }

        @media (max-width: 768px) {
          .vp-video-zone { flex-direction: column; }
          .vp-panel-remote { order: -1; flex: 1.1; min-height: 0; }
          .vp-panel-local  { order:  1; flex: 1; min-height: 0; }
          .vp-divider {
            left: 0; right: 0; top: 61.5%; bottom: auto;
            width: auto; height: 2px; transform: none;
            background: linear-gradient(to right, transparent 0%, rgba(84,199,248,0.0) 5%, rgba(84,199,248,0.7) 20%, rgba(84,199,248,1) 50%, rgba(84,199,248,0.7) 80%, rgba(84,199,248,0.0) 95%, transparent 100%);
            box-shadow: 0 0 12px rgba(84,199,248,0.45), 0 0 30px rgba(84,199,248,0.18);
          }
          .vp-divider-gem { left: 50%; top: 50%; transform: translate(-50%, -50%); }
          .vp-label { top: 10px; left: 10px; padding: 3px 10px 3px 7px; font-size: 9px; }
          .vp-streamer-badge { bottom: 10px; left: 50%; transform: translateX(-50%); }
        }

        .vp-video { width: 100%; height: 100%; object-fit: cover; display: block; }
        .vp-video-local  { transform: scaleX(-1); }
        .vp-video-remote { transition: opacity 1s ease; }

        .vp-panel::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(3,10,20,0.6) 100%);
          pointer-events: none; z-index: 2;
        }

        .vp-streamer-blur {
          position: absolute; inset: 0; z-index: 5;
          backdrop-filter: blur(28px) brightness(0.55);
          -webkit-backdrop-filter: blur(28px) brightness(0.55);
          transition: opacity 0.35s ease; pointer-events: none;
        }

        .vp-streamer-badge {
          position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
          z-index: 20; display: flex; align-items: center; gap: 6px;
          background: rgba(84,199,248,0.10); border: 1px solid rgba(84,199,248,0.28);
          backdrop-filter: blur(10px); border-radius: 100px; padding: 4px 12px;
          font-size: 9px; font-weight: 600; color: rgba(143,212,255,0.9);
          letter-spacing: 1.5px; text-transform: uppercase; white-space: nowrap;
          animation: streamerBadgePulse 3s ease-in-out infinite;
        }
        .vp-streamer-badge-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--sky); box-shadow: 0 0 5px var(--sky);
          animation: recBlink 2s infinite; flex-shrink: 0;
        }
        @keyframes streamerBadgePulse { 0%,100%{opacity:1} 50%{opacity:0.72} }

        .vp-label {
          position: absolute; top: 16px; left: 16px; z-index: 10;
          display: flex; align-items: center; gap: 7px;
          background: rgba(3,10,20,0.5); border: 1px solid var(--glass-b);
          backdrop-filter: blur(8px); border-radius: 100px;
          padding: 4px 12px 4px 8px;
          font-size: 10px; font-weight: 500; color: var(--muted);
          letter-spacing: 1.5px; text-transform: uppercase;
        }
        .vp-rec-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #22c55e; box-shadow: 0 0 6px #22c55e;
          animation: recBlink 2s infinite; flex-shrink: 0;
        }
        @keyframes recBlink { 0%,100%{opacity:1} 50%{opacity:0.25} }

        .vp-divider {
          position: absolute; left: 50%; top: 0; bottom: 0;
          transform: translateX(-50%); width: 2px; z-index: 30;
          background: linear-gradient(to bottom, transparent 0%, rgba(84,199,248,0.0) 5%, rgba(84,199,248,0.7) 20%, rgba(84,199,248,1) 50%, rgba(84,199,248,0.7) 80%, rgba(84,199,248,0.0) 95%, transparent 100%);
          box-shadow: 0 0 12px rgba(84,199,248,0.4), 0 0 30px rgba(84,199,248,0.15);
        }
        .vp-divider-gem {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
          width: 8px; height: 8px; background: var(--sky);
          border-radius: 2px; transform: translate(-50%,-50%) rotate(45deg);
          box-shadow: 0 0 10px var(--sky), 0 0 20px rgba(84,199,248,0.5);
        }

        .vp-placeholder {
          position: absolute; inset: 0; z-index: 3;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
          background: #050f1e;
        }
        .vp-radar {
          position: relative; width: 110px; height: 110px;
          display: flex; align-items: center; justify-content: center;
        }
        .vp-radar-ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid rgba(84,199,248,0.35);
          animation: radarPulse 2.7s ease-out infinite;
        }
        @keyframes radarPulse {
          0%   { width: 30px; height: 30px; opacity: 0.9; }
          100% { width: 110px; height: 110px; opacity: 0; }
        }
        .vp-radar-center {
          position: relative; z-index: 2;
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(84,199,248,0.08); border: 1.5px solid rgba(84,199,248,0.35);
          display: flex; align-items: center; justify-content: center; font-size: 16px;
        }
        .vp-radar-center--image {
          background: transparent; border: none;
          width: 72px; height: 72px;
        }
        .vp-ligues-img {
          width: 72px; height: 72px; object-fit: contain;
          filter: drop-shadow(0 0 12px rgba(84,199,248,0.9)) drop-shadow(0 0 28px rgba(84,199,248,0.5));
          animation: vp-levitate 2.6s ease-in-out infinite;
        }
        @keyframes vp-levitate {
          0%,100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-10px) scale(1.08); }
        }
        .vp-radar-text {
          font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700;
          color: var(--sky); letter-spacing: 3px; text-transform: uppercase; opacity: 0.9;
        }
        .vp-radar-sub { font-size: 10px; color: var(--muted); letter-spacing: 1px; margin-top: -12px; }

        .vp-profile-card {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
          z-index: 4;
          background: radial-gradient(ellipse at 50% 40%, rgba(84,199,248,0.06) 0%, #050f1e 60%);
        }
        .vp-avatar {
          width: 84px; height: 84px; border-radius: 50%; object-fit: cover;
          border: 2px solid rgba(84,199,248,0.45);
          box-shadow: 0 0 0 4px rgba(84,199,248,0.08), 0 0 30px rgba(84,199,248,0.2);
        }
        .vp-avatar-ph {
          width: 84px; height: 84px; border-radius: 50%;
          background: linear-gradient(135deg, #060f1e, #0a1a2e);
          border: 2px solid rgba(84,199,248,0.3);
          display: flex; align-items: center; justify-content: center; font-size: 34px;
          box-shadow: 0 0 0 4px rgba(84,199,248,0.06);
        }
        .vp-profile-name {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          color: var(--w); text-align: center;
        }
        .vp-profile-online { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); }
        .vp-online-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #22c55e; box-shadow: 0 0 6px #22c55e; animation: recBlink 2s infinite;
        }
        .vp-badge {
          background: rgba(84,199,248,0.08); border: 1px solid rgba(84,199,248,0.22);
          border-radius: 100px; padding: 3px 12px;
          font-size: 9px; color: rgba(143,212,255,0.8); letter-spacing: 1.5px; text-transform: uppercase;
        }

        .vp-audio-hint {
          position: absolute; top: 14px; right: 14px;
          background: rgba(84,199,248,0.82); backdrop-filter: blur(8px);
          color: #020d18; padding: 5px 13px; border-radius: 100px;
          font-size: 10px; font-weight: 600; z-index: 20; letter-spacing: 0.5px;
          animation: audioPulse 2s ease-in-out infinite;
        }
        @keyframes audioPulse { 0%,100%{opacity:1} 50%{opacity:0.65} }

        .vp-corner { position: absolute; width: 20px; height: 20px; z-index: 10; opacity: 0.3; }
        .vp-corner-tl { top:10px; left:10px;   border-top:1.5px solid var(--sky); border-left:1.5px solid var(--sky); }
        .vp-corner-tr { top:10px; right:10px;  border-top:1.5px solid var(--sky); border-right:1.5px solid var(--sky); }
        .vp-corner-bl { bottom:10px; left:10px;   border-bottom:1.5px solid var(--sky); border-left:1.5px solid var(--sky); }
        .vp-corner-br { bottom:10px; right:10px;  border-bottom:1.5px solid var(--sky); border-right:1.5px solid var(--sky); }

        .vp-no-cam {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px;
          background: #040c18; z-index: 3;
        }
        .vp-no-cam-icon { font-size: 32px; opacity: 0.4; }
        .vp-no-cam-text { font-size: 11px; color: var(--muted); letter-spacing: 1px; }

        .vp-like-flash {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(84,199,248,0.12);
          animation: likeFlash 0.6s ease forwards;
          pointer-events: none;
        }
        @keyframes likeFlash { 0%{opacity:1} 100%{opacity:0} }
      `}</style>

      {likeFlash && <div className="vp-like-flash" />}

      <div className="vp-root" onClick={unlockAudio}>

        <div className="vp-video-zone">

          {/* Panel local */}
          <div className="vp-panel vp-panel-local">
            <video ref={localVideoRef} autoPlay muted playsInline className="vp-video vp-video-local" />
            {cameraError && (
              <div className="vp-no-cam">
                <div className="vp-no-cam-icon">📷</div>
                <div className="vp-no-cam-text">Sin cámara</div>
              </div>
            )}
            <div className="vp-corner vp-corner-tl" />
            <div className="vp-corner vp-corner-bl" />
          </div>

          <div className="vp-divider">
            <div className="vp-divider-gem" />
          </div>

          {/* Panel remoto */}
          <div className="vp-panel vp-panel-remote">
            <video
              ref={remoteVideoRef} autoPlay playsInline
              className="vp-video vp-video-remote"
              style={{ opacity: hasVideo ? 1 : 0 }}
            />

            {streamerMode && hasVideo && <div className="vp-streamer-blur" />}
            {streamerMode && hasVideo && (
              <div className="vp-streamer-badge">
                <div className="vp-streamer-badge-dot" /> Modo streamer
              </div>
            )}

            {!remoteReady && (
              <div className="vp-placeholder">
                <div className="vp-radar">
                  <div className="vp-radar-ring" style={{ animationDelay: "0s" }} />
                  <div className="vp-radar-ring" style={{ animationDelay: "0.9s" }} />
                  <div className="vp-radar-ring" style={{ animationDelay: "1.8s" }} />
                  <div className={`vp-radar-center${searching ? " vp-radar-center--image" : ""}`}>
                    {searching
                      ? <img src={liguesImg.src} alt="ligues" className="vp-ligues-img" />
                      : "👤"}
                  </div>
                </div>
                <div className="vp-radar-text">{searching ? "Buscando..." : "Enlazando..."}</div>
                <div className="vp-radar-sub">{searching ? "Encontrando tu pareja" : "Estableciendo conexión"}</div>
              </div>
            )}

            {remoteReady && !hasVideo && matchUser && (
              <div className="vp-profile-card">
                {matchUser.avatar_url
                  ? <img src={matchUser.avatar_url} alt={matchUser.name} className="vp-avatar" />
                  : <div className="vp-avatar-ph">{matchUser.name?.[0]?.toUpperCase() ?? "?"}</div>}
                <div className="vp-profile-name">{matchUser.name}{matchUser.age ? `, ${matchUser.age}` : ""}</div>
                <div className="vp-profile-online"><div className="vp-online-dot" /> Conectado</div>
                <div className="vp-badge">{isConnected ? "Video en camino" : "Enlazando video"}</div>
              </div>
            )}

            {remoteReady && !hasVideo && !matchUser && (
              <div className="vp-profile-card">
                <div className="vp-avatar-ph">👤</div>
                <div className="vp-profile-name" style={{ opacity: 0.5, fontSize: 15 }}>Cargando perfil...</div>
                <div className="vp-badge">Enlazando video</div>
              </div>
            )}

            {remoteReady && hasVideo && audioLocked && (
              <div className="vp-audio-hint">🔊 Toca para escuchar</div>
            )}

            {hasVideo && matchUser && (
              <UserChip
                user={matchUser}
                isConnected={isConnected}
                style={{ position: "absolute", bottom: 16, left: 16, zIndex: 20 }}
              />
            )}

            <div className="vp-corner vp-corner-tr" />
            <div className="vp-corner vp-corner-br" />
          </div>

        </div>

        {customControls ?? (
          <VideoControls
            onSkip={onNext}
            onLike={handleLike}
            liked={liked}
            skipBlocked={skipBlocked}
            streamerMode={streamerMode}
            onStreamerToggle={() => setStreamerModeInternal(prev => !prev)}
          />
        )}

      </div>
    </>
  );
}