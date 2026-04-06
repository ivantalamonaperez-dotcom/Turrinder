"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/services/supabase.client";

interface Props {
  room: any;
  matchUser: any;
  onNext: () => void;
  onLike: () => void;
  liked: boolean;
  searching?: boolean;
}

export default function VideoPlayer({ room, matchUser, onNext, onLike, liked, searching }: Props) {
  const localVideo  = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pc          = useRef<RTCPeerConnection | null>(null);
  const iceBuf      = useRef<RTCIceCandidateInit[]>([]);
  const isConn      = useRef(false);

  const [audioLocked, setAudioLocked] = useState(true);
  const [remoteReady, setRemoteReady] = useState(false);
  const [likeAnim,    setLikeAnim]    = useState(false);
  const [skipAnim,    setSkipAnim]    = useState(false);

  // ── Un único stream global para toda la vida del componente ──────────────
  // Usamos una ref MODULE-level para que Strict Mode (doble montaje/desmontaje)
  // no cierre la cámara entre el primer cleanup y el segundo montaje.
  const localStream = useRef<MediaStream | null>(null);
  const camStarted  = useRef(false);

  // Cámara local — se abre una sola vez aunque Strict Mode monte dos veces
  useEffect(() => {
    if (camStarted.current) return;          // ya corriendo, no abrir de nuevo
    camStarted.current = true;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStream.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
      })
      .catch((err) => console.error("❌ Cámara no disponible:", err));

    return () => {
      // Solo detenemos al desmontar de verdad (no en el cleanup de Strict Mode)
      // Strict Mode llama cleanup + re-mount sincrónicamente; el segundo montaje
      // ve camStarted.current = true y no vuelve a pedir la cámara.
      // El verdadero desmontaje llega cuando el componente sale del árbol.
    };
  }, []);

  // Cleanup real de la cámara cuando el componente se destruye del todo
  useEffect(() => {
    return () => {
      localStream.current?.getTracks().forEach(t => t.stop());
      localStream.current = null;
      camStarted.current  = false;
    };
  }, []);

  // WebRTC — solo cuando hay room, reutiliza localStream sin volver a pedir cámara
  useEffect(() => {
    if (!room) return;
    let userId: string, channel: any, isUser1: boolean;
    let cancelled = false;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      userId = data.user.id;
      isUser1 = room.user1 === userId;
      isConn.current = false;
      iceBuf.current  = [];

      // Esperar hasta 3s a que la cámara esté lista (puede estar cargando)
      let stream = localStream.current;
      if (!stream) {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 100));
          stream = localStream.current;
          if (stream || cancelled) break;
        }
      }
      if (!stream || cancelled) return;

      pc.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      stream.getTracks().forEach(t => pc.current!.addTrack(t, stream));

      pc.current.ontrack = (e) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = e.streams[0];
          remoteVideo.current.muted = false;
          remoteVideo.current.play().catch(() => {});
          setRemoteReady(true);
        }
      };

      pc.current.onicecandidate = async (e) => {
        if (e.candidate) {
          await supabase.from("signals").insert({
            room_id: room.id, sender: userId,
            type: "candidate", data: e.candidate.toJSON(),
          });
        }
      };

      pc.current.onconnectionstatechange = () => {
        if (pc.current?.connectionState === "connected") {
          isConn.current = true;
          setAudioLocked(false);
        }
      };

      if (isUser1) {
        await supabase.from("signals").delete().eq("room_id", room.id);
      } else {
        await new Promise(r => setTimeout(r, 500));
      }

      const channelName = `webrtc-${room.id}-${Date.now()}`;
      await new Promise<void>(resolve => {
        channel = supabase.channel(channelName)
          .on("postgres_changes", {
            event: "INSERT", schema: "public", table: "signals",
            filter: `room_id=eq.${room.id}`,
          }, async (payload) => {
            const sig = payload.new;
            if (sig.sender === userId) return;
            if (isConn.current && sig.type !== "candidate") return;

            if (sig.type === "offer" && !isUser1) {
              if (pc.current!.signalingState !== "stable") return;
              await pc.current!.setRemoteDescription(new RTCSessionDescription(sig.data));
              for (const c of iceBuf.current) { try { await pc.current!.addIceCandidate(c); } catch {} }
              iceBuf.current = [];
              const ans = await pc.current!.createAnswer();
              await pc.current!.setLocalDescription(ans);
              await supabase.from("signals").insert({ room_id: room.id, sender: userId, type: "answer", data: ans });
            }

            if (sig.type === "answer" && isUser1) {
              if (pc.current!.signalingState !== "have-local-offer") return;
              await pc.current!.setRemoteDescription(new RTCSessionDescription(sig.data));
              for (const c of iceBuf.current) { try { await pc.current!.addIceCandidate(c); } catch {} }
              iceBuf.current = [];
            }

            if (sig.type === "candidate") {
              if (pc.current!.remoteDescription) {
                try { await pc.current!.addIceCandidate(new RTCIceCandidate(sig.data)); } catch {}
              } else {
                iceBuf.current.push(sig.data);
              }
            }
          })
          .subscribe(s => { if (s === "SUBSCRIBED") resolve(); });
      });

      if (isUser1) {
        await new Promise(r => setTimeout(r, 800));
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        await supabase.from("signals").insert({ room_id: room.id, sender: userId, type: "offer", data: offer });
      }
    };

    start();

    return () => {
      cancelled = true;
      pc.current?.close();
      pc.current = null;
      iceBuf.current = [];
      isConn.current = false;
      setRemoteReady(false);
      if (channel) supabase.removeChannel(channel);
    };
  }, [room]);

  const unlockAudio = () => {
    if (remoteVideo.current) {
      remoteVideo.current.muted = false;
      remoteVideo.current.play().catch(() => {});
      setAudioLocked(false);
    }
  };

  const handleLike = () => {
    if (liked) return;
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 600);
    onLike();
  };

  const handleSkip = () => {
    setSkipAnim(true);
    setTimeout(() => setSkipAnim(false), 400);
    onNext();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .vp-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #07070f;
          overflow: hidden;
        }

        /* ── Fila de videos ── */
        .vp-videos {
          flex: 1;
          display: flex;
          flex-direction: row;
          min-height: 0;
          gap: 3px;
          background: #07070f;
        }

        /* ── Tu cámara — izquierda (40%) ── */
        .vp-local-wrap {
          flex: 6;
          position: relative;
          min-width: 0;
          overflow: hidden;
          background: #080812;
          border-radius: 0 0 0 0;
        }

        .vp-local {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: scaleX(-1);
        }

        /* Gradiente top del local */
        .vp-local-top {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 35%;
          background: linear-gradient(to bottom, rgba(7,7,15,0.7) 0%, transparent 100%);
          pointer-events: none;
          z-index: 2;
        }

        /* Gradiente bottom del local */
        .vp-local-bottom {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 35%;
          background: linear-gradient(to top, rgba(7,7,15,0.8) 0%, transparent 100%);
          pointer-events: none;
          z-index: 2;
        }

        .vp-local-label {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 3;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .vp-rec-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 5px #22c55e;
          animation: recBlink 2s ease-in-out infinite;
        }

        @keyframes recBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Divisor vertical central */
        .vp-divider {
          width: 3px;
          flex-shrink: 0;
          background: linear-gradient(to bottom,
            transparent 0%,
            rgba(255,45,107,0.5) 25%,
            rgba(255,107,53,0.7) 50%,
            rgba(255,45,107,0.5) 75%,
            transparent 100%
          );
          position: relative;
          z-index: 5;
        }

        /* ── Cámara del match — derecha (60%) ── */
        .vp-remote-wrap {
          flex: 6;
          position: relative;
          min-width: 0;
          overflow: hidden;
          background: #0a0a16;
        }

        .vp-remote {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: opacity 0.6s ease;
        }

        .vp-remote-top {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 35%;
          background: linear-gradient(to bottom, rgba(7,7,15,0.7) 0%, transparent 100%);
          pointer-events: none;
          z-index: 2;
        }

        .vp-remote-bottom {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 35%;
          background: linear-gradient(to top, rgba(7,7,15,0.8) 0%, transparent 100%);
          pointer-events: none;
          z-index: 2;
        }

        /* Info del match */
        .vp-match-info {
          position: absolute;
          bottom: 14px;
          left: 14px;
          z-index: 3;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .vp-match-name {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.6);
        }

        .vp-match-live {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: rgba(255,255,255,0.55);
          font-family: 'DM Sans', sans-serif;
        }

        .vp-live-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 5px #22c55e;
        }

        /* Placeholder buscando / conectando */
        .vp-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 4;
        }

        .vp-radar {
          position: relative;
          width: 80px; height: 80px;
          margin-bottom: 4px;
        }

        .vp-radar-ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid rgba(255,45,107,0.35);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: radarExpand 2.4s ease-out infinite;
        }

        .vp-radar-ring:nth-child(2) { animation-delay: 0.8s; }
        .vp-radar-ring:nth-child(3) { animation-delay: 1.6s; }

        @keyframes radarExpand {
          0%   { width: 24px; height: 24px; opacity: 0.9; border-color: rgba(255,45,107,0.7); }
          100% { width: 80px; height: 80px;  opacity: 0;   border-color: rgba(255,45,107,0); }
        }

        .vp-radar-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 36px; height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          box-shadow: 0 0 20px rgba(255,45,107,0.6);
          animation: radarPulse 2.4s ease-in-out infinite;
        }

        @keyframes radarPulse {
          0%, 100% { box-shadow: 0 0 14px rgba(255,45,107,0.4); }
          50%       { box-shadow: 0 0 36px rgba(255,45,107,0.8); }
        }

        .vp-ph-title {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.3px;
          text-align: center;
        }

        .vp-ph-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.28);
          text-align: center;
          max-width: 140px;
          line-height: 1.6;
          font-family: 'DM Sans', sans-serif;
        }

        .vp-search-dots {
          display: flex;
          gap: 5px;
        }

        .vp-search-dots span {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #ff2d6b;
          animation: dotBounce 1.2s ease-in-out infinite;
        }

        .vp-search-dots span:nth-child(2) { animation-delay: 0.2s; }
        .vp-search-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        /* Hint de audio */
        .vp-audio-hint {
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(10px);
          color: white;
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          pointer-events: none;
          z-index: 5;
          border: 1px solid rgba(255,255,255,0.08);
        }

        /* ── Barra de controles — siempre visible ── */
        .vp-controls {
          flex-shrink: 0;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: rgba(7,7,15,0.95);
          border-top: 1px solid rgba(255,255,255,0.05);
          position: relative;
          z-index: 10;
        }

        /* Hint labels */
        .vp-ctrl-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .vp-ctrl-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.2);
        }

        .vp-ctrl {
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          flex-shrink: 0;
        }

        /* Skip */
        .vp-ctrl-skip {
          width: 52px; height: 52px;
          font-size: 18px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
        }

        .vp-ctrl-skip:hover {
          background: rgba(255,77,77,0.15);
          border-color: rgba(255,77,77,0.3);
          color: #ff4d4d;
          transform: scale(1.08);
        }

        .vp-ctrl-skip.anim {
          transform: scale(0.88) rotate(-15deg);
        }

        /* Like */
        .vp-ctrl-like {
          width: 62px; height: 62px;
          font-size: 24px;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          color: white;
          box-shadow: 0 6px 24px rgba(255,45,107,0.5);
        }

        .vp-ctrl-like:hover:not(:disabled) {
          transform: scale(1.12);
          box-shadow: 0 10px 36px rgba(255,45,107,0.75);
        }

        .vp-ctrl-like.anim {
          transform: scale(1.3);
          box-shadow: 0 0 50px rgba(255,45,107,0.9);
        }

        .vp-ctrl-like.liked {
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,45,107,0.2);
          color: rgba(255,45,107,0.4);
          box-shadow: none;
          cursor: not-allowed;
          transform: none !important;
        }

        /* Chat */
        .vp-ctrl-chat {
          width: 52px; height: 52px;
          font-size: 18px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
        }

        .vp-ctrl-chat:hover {
          background: rgba(255,255,255,0.1);
          color: white;
          transform: scale(1.08);
        }
      `}</style>

      <div className="vp-root" onClick={unlockAudio}>

        {/* ── Fila de videos lado a lado ── */}
        <div className="vp-videos">

          {/* Tu cámara — izquierda 40% */}
          <div className="vp-local-wrap">
            <div className="vp-local-top" />
            <div className="vp-local-bottom" />
            <div className="vp-local-label">
              <div className="vp-rec-dot" />
              Tú
            </div>
            <video
              ref={localVideo}
              autoPlay
              muted
              playsInline
              className="vp-local"
            />
          </div>

          {/* Divisor vertical */}
          <div className="vp-divider" />

          {/* Cámara del match — derecha 60% */}
          <div className="vp-remote-wrap">
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className="vp-remote"
              style={{ opacity: remoteReady ? 1 : 0 }}
            />

            {/* Placeholder */}
            {!remoteReady && (
              <div className="vp-placeholder">
                {searching ? (
                  <>
                    <div className="vp-radar">
                      <div className="vp-radar-ring" />
                      <div className="vp-radar-ring" />
                      <div className="vp-radar-ring" />
                      <div className="vp-radar-center">🔥</div>
                    </div>
                    <div className="vp-ph-title">Buscando...</div>
                    <p className="vp-ph-sub">Conectando con alguien del mundo</p>
                    <div className="vp-search-dots">
                      <span /><span /><span />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="vp-radar">
                      <div className="vp-radar-ring" />
                      <div className="vp-radar-center">👤</div>
                    </div>
                    <div className="vp-ph-title">Conectando...</div>
                  </>
                )}
              </div>
            )}

            {remoteReady && (
              <>
                <div className="vp-remote-top" />
                <div className="vp-remote-bottom" />
                {matchUser && (
                  <div className="vp-match-info">
                    <div className="vp-match-name">{matchUser.name}, {matchUser.age}</div>
                    <div className="vp-match-live">
                      <div className="vp-live-dot" />
                      En vivo
                    </div>
                  </div>
                )}
                {audioLocked && (
                  <div className="vp-audio-hint">🔊 Tocá para audio</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Controles — siempre visibles ── */}
        <div className="vp-controls">
          <div className="vp-ctrl-group">
            <button
              className={`vp-ctrl vp-ctrl-skip ${skipAnim ? "anim" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleSkip(); }}
              title="Pasar"
            >
              ✕
            </button>
            <span className="vp-ctrl-label">Pasar</span>
          </div>

          <div className="vp-ctrl-group">
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

          <div className="vp-ctrl-group">
            <button
              className="vp-ctrl vp-ctrl-chat"
              onClick={(e) => e.stopPropagation()}
              title="Chat"
            >
              💬
            </button>
            <span className="vp-ctrl-label">Chat</span>
          </div>
        </div>
      </div>
    </>
  );
}