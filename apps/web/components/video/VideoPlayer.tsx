"use client";

/**
 * VideoPlayer — Con fallback de perfil cuando no hay video
 *
 * CAMBIO PRINCIPAL:
 *   Antes: `remoteReady` dependía solo de `remoteStream` o `isConnected`.
 *   Si WebRTC tardaba o fallaba (sin cámara, NAT simétrico), la UI
 *   se quedaba en "ESTABLECIENDO ENLACE" indefinidamente.
 *
 *   Ahora: usamos `matchConfirmed` (viene del servidor, no de ICE).
 *   En cuanto el servidor dice "match-found", mostramos el perfil
 *   del usuario aunque el video no haya llegado todavía.
 *   Si el video llega después, se superpone normalmente.
 */

import { useState, useEffect } from "react";
import { useWebRTC } from "./useWebRTC";

interface Props {
  room: { id: string } | null;
  matchUser: any; // { name, age, avatar_url, ... }
  onNext: () => void;
  onLike: () => void;
  liked: boolean;
  searching?: boolean;
}

export default function VideoPlayer({
  room,
  matchUser,
  onNext,
  onLike,
  liked,
  searching,
}: Props) {
  const targetPartnerId = room?.id || null;

  const {
    localVideoRef,
    remoteVideoRef,
    isConnected,
    remoteStream,
    cameraError,
    matchConfirmed, // ← clave nueva
  } = useWebRTC(targetPartnerId);

  const [audioLocked, setAudioLocked] = useState(true);
  const [likeAnim,    setLikeAnim]    = useState(false);
  const [skipAnim,    setSkipAnim]    = useState(false);

  // remoteReady ahora también se activa con matchConfirmed
  // Esto evita el bloqueo en "ESTABLECIENDO ENLACE"
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
      setTimeout(() => setLikeAnim(false), 600);
      onLike();
    }
  };

  const handleSkip = () => {
    setSkipAnim(true);
    setTimeout(() => { setSkipAnim(false); onNext(); }, 400);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .vp-root { width:100%; height:100%; display:flex; flex-direction:column; background:#07070f; overflow:hidden; cursor:pointer; }
        .vp-videos { flex:1; display:flex; flex-direction:row; min-height:0; gap:3px; background:#07070f; }

        /* ── Video local ── */
        .vp-local-wrap { flex:4; position:relative; min-width:0; overflow:hidden; background:#080812; }
        .vp-local { width:100%; height:100%; object-fit:cover; display:block; transform:scaleX(-1); }
        .vp-local-label { position:absolute; top:14px; left:16px; z-index:10; font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(255,255,255,0.5); display:flex; align-items:center; gap:6px; text-transform:uppercase; letter-spacing:1.5px; pointer-events:none; }
        .vp-rec-dot { width:5px; height:5px; border-radius:50%; background:#22c55e; box-shadow:0 0 5px #22c55e; animation:recBlink 2s infinite; }
        @keyframes recBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* ── Sin cámara local ── */
        .vp-no-cam { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; background:#080812; }
        .vp-no-cam-icon { font-size:32px; opacity:0.4; }
        .vp-no-cam-text { font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:1px; }

        /* ── Divisor ── */
        .vp-divider { width:3px; flex-shrink:0; background:linear-gradient(to bottom,transparent 0%,rgba(255,45,107,0.5) 25%,rgba(255,107,53,0.7) 50%,rgba(255,45,107,0.5) 75%,transparent 100%); position:relative; z-index:5; }

        /* ── Video remoto ── */
        .vp-remote-wrap { flex:6; position:relative; min-width:0; overflow:hidden; background:#0a0a16; }
        .vp-remote { width:100%; height:100%; object-fit:cover; display:block; transition:opacity 0.8s ease; background:#000; }

        /* ── Radar (buscando) ── */
        .vp-placeholder { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:15px; z-index:5; background:#0a0a16; }
        .vp-radar { position:relative; width:80px; height:80px; }
        .vp-radar-ring { position:absolute; border-radius:50%; border:1.5px solid rgba(255,45,107,0.4); top:50%; left:50%; transform:translate(-50%,-50%); animation:radarExpand 2.4s ease-out infinite; }
        @keyframes radarExpand { 0%{width:24px;height:24px;opacity:1} 100%{width:100px;height:100px;opacity:0} }
        .vp-radar-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#ff2d6b,#c9193e); display:flex; align-items:center; justify-content:center; box-shadow:0 0 20px rgba(255,45,107,0.6); font-size:20px; }

        /* ── Perfil fallback (match sin video) ── */
        .vp-profile-card { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; z-index:4; background:linear-gradient(180deg,#0a0a16 0%,#120818 100%); }
        .vp-profile-avatar { width:88px; height:88px; border-radius:50%; object-fit:cover; border:3px solid rgba(255,45,107,0.6); box-shadow:0 0 24px rgba(255,45,107,0.3); }
        .vp-profile-avatar-placeholder { width:88px; height:88px; border-radius:50%; background:linear-gradient(135deg,#1a0a14,#2a0d1e); border:3px solid rgba(255,45,107,0.4); display:flex; align-items:center; justify-content:center; font-size:36px; box-shadow:0 0 24px rgba(255,45,107,0.2); }
        .vp-profile-name { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:white; text-align:center; }
        .vp-profile-status { display:flex; align-items:center; gap:6px; font-family:'DM Sans',sans-serif; font-size:12px; color:rgba(255,255,255,0.5); }
        .vp-profile-live-dot { width:6px; height:6px; border-radius:50%; background:#22c55e; box-shadow:0 0 6px #22c55e; animation:recBlink 2s infinite; }
        .vp-connecting-badge { background:rgba(255,45,107,0.15); border:1px solid rgba(255,45,107,0.3); border-radius:100px; padding:4px 12px; font-size:10px; color:rgba(255,45,107,0.9); font-family:'DM Sans',sans-serif; letter-spacing:1px; text-transform:uppercase; }

        /* ── Info overlay (cuando hay video) ── */
        .vp-match-info { position:absolute; bottom:14px; left:14px; z-index:10; display:flex; flex-direction:column; gap:3px; pointer-events:none; }
        .vp-match-name { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; color:white; text-shadow:0 2px 10px rgba(0,0,0,0.8); }
        .vp-match-live { display:flex; align-items:center; gap:5px; font-size:11px; color:rgba(255,255,255,0.7); }
        .vp-live-dot { width:5px; height:5px; border-radius:50%; background:#22c55e; box-shadow:0 0 5px #22c55e; }

        /* ── Audio hint ── */
        .vp-audio-hint { position:absolute; top:14px; right:14px; background:rgba(255,45,107,0.9); color:white; padding:6px 14px; border-radius:100px; font-size:11px; font-weight:bold; z-index:20; animation:pulse 1.5s infinite; }
        @keyframes pulse { 0%{transform:scale(1)} 50%{transform:scale(1.05)} 100%{transform:scale(1)} }

        /* ── Controles ── */
        .vp-controls { height:90px; display:flex; align-items:center; justify-content:center; gap:24px; background:#07070f; border-top:1px solid rgba(255,255,255,0.05); }
        .vp-ctrl-group { display:flex; flex-direction:column; align-items:center; gap:6px; }
        .vp-ctrl { border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .vp-ctrl-skip { width:54px; height:54px; background:rgba(255,255,255,0.08); color:white; border:1.5px solid rgba(255,255,255,0.1); font-size:18px; }
        .vp-ctrl-skip:hover { background:rgba(255,255,255,0.15); }
        .vp-ctrl-skip.anim { transform:scale(0.85); }
        .vp-ctrl-like { width:64px; height:64px; background:linear-gradient(135deg,#ff2d6b,#c9193e); color:white; font-size:26px; box-shadow:0 4px 15px rgba(255,45,107,0.3); }
        .vp-ctrl-like:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(255,45,107,0.4); }
        .vp-ctrl-like.anim { transform:scale(1.3); }
        .vp-ctrl-like.liked { filter:grayscale(1); opacity:0.5; cursor:not-allowed; transform:none; }
      `}</style>

      <div className="vp-root" onClick={unlockAudio}>
        <div className="vp-videos">

          {/* ── Panel izquierdo: TU cámara ─────────────────────────────── */}
          <div className="vp-local-wrap">
            <div className="vp-local-label">
              <div className="vp-rec-dot" /> Tú
            </div>
            <video ref={localVideoRef} autoPlay muted playsInline className="vp-local" />
            {cameraError && (
              <div className="vp-no-cam">
                <div className="vp-no-cam-icon">📷</div>
                <div className="vp-no-cam-text">Sin cámara</div>
              </div>
            )}
          </div>

          <div className="vp-divider" />

          {/* ── Panel derecho: USUARIO REMOTO ──────────────────────────── */}
          <div className="vp-remote-wrap">

            {/* Video real (oculto hasta que llegue stream) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="vp-remote"
              style={{ opacity: hasVideo ? 1 : 0 }}
            />

            {/* Estado 1: Buscando / sin match todavía */}
            {!remoteReady && (
              <div className="vp-placeholder">
                <div className="vp-radar">
                  <div className="vp-radar-ring" style={{ animationDelay: "0s" }} />
                  <div className="vp-radar-ring" style={{ animationDelay: "0.8s" }} />
                  <div className="vp-radar-center">{searching ? "🔥" : "👤"}</div>
                </div>
                <div
                  className="vp-match-name"
                  style={{ fontSize: "14px", color: "#ff2d6b", letterSpacing: "1px" }}
                >
                  {searching ? "BUSCANDO PAREJA..." : "ESTABLECIENDO ENLACE..."}
                </div>
              </div>
            )}

            {/* Estado 2: Match confirmado pero sin video → mostrar perfil */}
            {remoteReady && !hasVideo && matchUser && (
              <div className="vp-profile-card">
                {matchUser.avatar_url ? (
                  <img
                    src={matchUser.avatar_url}
                    alt={matchUser.name}
                    className="vp-profile-avatar"
                  />
                ) : (
                  <div className="vp-profile-avatar-placeholder">
                    {matchUser.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="vp-profile-name">
                  {matchUser.name}{matchUser.age ? `, ${matchUser.age}` : ""}
                </div>
                <div className="vp-profile-status">
                  <div className="vp-profile-live-dot" />
                  Conectado
                </div>
                <div className="vp-connecting-badge">
                  {isConnected ? "Video en camino..." : "Enlazando video..."}
                </div>
              </div>
            )}

            {/* Estado 2b: Match confirmado pero sin video Y sin perfil cargado */}
            {remoteReady && !hasVideo && !matchUser && (
              <div className="vp-profile-card">
                <div className="vp-profile-avatar-placeholder">👤</div>
                <div className="vp-profile-name" style={{ fontSize: "16px", opacity: 0.7 }}>
                  Cargando perfil...
                </div>
                <div className="vp-connecting-badge">Enlazando video...</div>
              </div>
            )}

            {/* Audio bloqueado por el navegador */}
            {remoteReady && hasVideo && audioLocked && (
              <div className="vp-audio-hint">🔊 CLIC PARA ESCUCHAR</div>
            )}

            {/* Info overlay cuando hay video real */}
            {hasVideo && matchUser && (
              <div className="vp-match-info">
                <div className="vp-match-name">
                  {matchUser.name}{matchUser.age ? `, ${matchUser.age}` : ""}
                </div>
                <div className="vp-match-live">
                  <div className="vp-live-dot" />
                  {isConnected ? "CONEXIÓN ESTABLE" : "EN VIVO"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Controles ────────────────────────────────────────────────── */}
        <div className="vp-controls">
          <div className="vp-ctrl-group">
            <button
              className={`vp-ctrl vp-ctrl-skip ${skipAnim ? "anim" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleSkip(); }}
            >
              ✕
            </button>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: "bold" }}>
              PASAR
            </span>
          </div>
          <div className="vp-ctrl-group">
            <button
              className={`vp-ctrl vp-ctrl-like ${likeAnim ? "anim" : ""} ${liked ? "liked" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleLike(); }}
              disabled={liked}
            >
              ♥
            </button>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: "bold" }}>
              LIKE
            </span>
          </div>
        </div>
      </div>
    </>
  );
}