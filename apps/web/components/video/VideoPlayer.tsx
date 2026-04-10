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
  const streamRef   = useRef<MediaStream | null>(null);
  // Promise que se resuelve cuando el stream está listo
  // Así el WebRTC espera a la cámara sin pedir getUserMedia de nuevo
  const streamReady = useRef<Promise<MediaStream | null>>(Promise.resolve(null));
  const streamResolve = useRef<((s: MediaStream | null) => void) | null>(null);

  const [audioLocked, setAudioLocked] = useState(true);
  const [remoteReady, setRemoteReady] = useState(false);
  const [likeAnim,    setLikeAnim]    = useState(false);
  const [skipAnim,    setSkipAnim]    = useState(false);

  // ── 1. Iniciar cámara UNA SOLA VEZ al montar ──────────────
  useEffect(() => {
    // Crear una promise que resuelve cuando el stream esté listo
    streamReady.current = new Promise<MediaStream | null>((resolve) => {
      streamResolve.current = resolve;
    });

    const startCam = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = s;
        if (localVideo.current) localVideo.current.srcObject = s;
        streamResolve.current?.(s); // ✅ notificar que el stream está listo
      } catch (err) {
        console.error("❌ Cámara no disponible:", err);
        streamResolve.current?.(null);
      }
    };

    startCam();

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  // ── 2. WebRTC — espera el stream antes de arrancar ────────
  useEffect(() => {
    if (!room) return;
    let userId: string, channel: any, isUser1: boolean;
    let cancelled = false;   // ← evita que Strict Mode corra dos instancias en paralelo

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      userId = data.user.id;
      isUser1 = room.user1 === userId;
      isConn.current = false;
      iceBuf.current  = [];

      // Esperar a que la cámara resuelva (con o sin stream)
      const stream = await streamReady.current;
      if (cancelled) return;

      // ✅ Si no hay cámara, WebRTC arranca igual en modo solo-recepción
      if (stream) {
        if (localVideo.current) localVideo.current.srcObject = stream;
      } else {
        console.warn("⚠️ Cámara no disponible — WebRTC arranca en modo solo-recepción");
      }

      pc.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      // Solo agregar tracks si tenemos stream local
      if (stream) {
        stream.getTracks().forEach(t => pc.current!.addTrack(t, stream!));
      }

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
        console.log("🔌 Connection state:", pc.current?.connectionState);
        if (pc.current?.connectionState === "connected") {
          isConn.current = true;
          setAudioLocked(false);
        }
      };

      pc.current.oniceconnectionstatechange = () => {
        console.log("🧊 ICE state:", pc.current?.iceConnectionState);
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
            if (cancelled) return;                          // ← Strict Mode: ignorar si ya desmontado
            if (isConn.current && sig.type !== "candidate") return;

            console.log("📨 Señal recibida:", sig.type);

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
          .subscribe(s => {
            console.log("📡 Canal WebRTC:", s);
            if (s === "SUBSCRIBED") resolve();
          });
      });

      if (isUser1) {
        await new Promise(r => setTimeout(r, 800));
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        await supabase.from("signals").insert({
          room_id: room.id, sender: userId, type: "offer", data: offer,
        });
        console.log("📤 Offer enviado");
      }
    };

    start();

    const roomId  = room.id;
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // F5 / cierre de pestaña — llamar al RPC end_room via fetch keepalive
    // El RPC marca ended=true Y borra las signals en una sola transaccion
    const handleUnload = () => {
      if (!roomId) return;
      // Necesitamos el userId — lo leemos del storage de Supabase sincrónicamente
      const sessionStr = localStorage.getItem(
        Object.keys(localStorage).find(k => k.includes("auth-token")) || ""
      ) || "{}";
      let userId = "";
      try { userId = JSON.parse(sessionStr)?.user?.id || ""; } catch {}

      fetch(`${supaUrl}/rest/v1/rpc/end_room`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": supaKey,
          "Authorization": `Bearer ${supaKey}`,
        },
        body: JSON.stringify({ p_room_id: roomId, p_user_id: userId }),
      });
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
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
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          background: #07070f; overflow: hidden;
        }

        .vp-videos {
          flex: 1; display: flex; flex-direction: row;
          min-height: 0; gap: 3px; background: #07070f;
        }

        .vp-local-wrap {
          flex: 6; position: relative; min-width: 0;
          overflow: hidden; background: #080812;
        }

        .vp-local {
          width: 100%; height: 100%; object-fit: cover;
          display: block; transform: scaleX(-1);
        }

        .vp-local-top {
          position: absolute; top: 0; left: 0; right: 0; height: 35%;
          background: linear-gradient(to bottom, rgba(7,7,15,0.7) 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }

        .vp-local-bottom {
          position: absolute; bottom: 0; left: 0; right: 0; height: 35%;
          background: linear-gradient(to top, rgba(7,7,15,0.8) 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }

        .vp-local-label {
          position: absolute; top: 14px; left: 16px; z-index: 3;
          font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          display: flex; align-items: center; gap: 6px;
        }

        .vp-rec-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #22c55e; box-shadow: 0 0 5px #22c55e;
          animation: recBlink 2s ease-in-out infinite;
        }

        @keyframes recBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        .vp-divider {
          width: 3px; flex-shrink: 0;
          background: linear-gradient(to bottom,
            transparent 0%, rgba(255,45,107,0.5) 25%,
            rgba(255,107,53,0.7) 50%, rgba(255,45,107,0.5) 75%, transparent 100%
          );
          position: relative; z-index: 5;
        }

        .vp-remote-wrap {
          flex: 6; position: relative; min-width: 0;
          overflow: hidden; background: #0a0a16;
        }

        .vp-remote {
          width: 100%; height: 100%; object-fit: cover;
          display: block; transition: opacity 0.6s ease;
        }

        .vp-remote-top {
          position: absolute; top: 0; left: 0; right: 0; height: 35%;
          background: linear-gradient(to bottom, rgba(7,7,15,0.7) 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }

        .vp-remote-bottom {
          position: absolute; bottom: 0; left: 0; right: 0; height: 35%;
          background: linear-gradient(to top, rgba(7,7,15,0.8) 0%, transparent 100%);
          pointer-events: none; z-index: 2;
        }

        .vp-match-info {
          position: absolute; bottom: 14px; left: 14px; z-index: 3;
          display: flex; flex-direction: column; gap: 3px;
        }

        .vp-match-name {
          font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800;
          color: white; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.6);
        }

        .vp-match-live {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: rgba(255,255,255,0.55); font-family: 'DM Sans', sans-serif;
        }

        .vp-live-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #22c55e; box-shadow: 0 0 5px #22c55e;
        }

        .vp-placeholder {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px; z-index: 4;
        }

        .vp-radar { position: relative; width: 80px; height: 80px; margin-bottom: 4px; }

        .vp-radar-ring {
          position: absolute; border-radius: 50%;
          border: 1.5px solid rgba(255,45,107,0.35);
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          animation: radarExpand 2.4s ease-out infinite;
        }

        .vp-radar-ring:nth-child(2) { animation-delay: 0.8s; }
        .vp-radar-ring:nth-child(3) { animation-delay: 1.6s; }

        @keyframes radarExpand {
          0%   { width: 24px; height: 24px; opacity: 0.9; border-color: rgba(255,45,107,0.7); }
          100% { width: 80px; height: 80px; opacity: 0;   border-color: rgba(255,45,107,0); }
        }

        .vp-radar-center {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          display: flex; align-items: center; justify-content: center; font-size: 16px;
          box-shadow: 0 0 20px rgba(255,45,107,0.6);
          animation: radarPulse 2.4s ease-in-out infinite;
        }

        @keyframes radarPulse {
          0%, 100% { box-shadow: 0 0 14px rgba(255,45,107,0.4); }
          50%       { box-shadow: 0 0 36px rgba(255,45,107,0.8); }
        }

        .vp-ph-title {
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800;
          color: white; letter-spacing: -0.3px; text-align: center;
        }

        .vp-ph-sub {
          font-size: 11px; color: rgba(255,255,255,0.28); text-align: center;
          max-width: 140px; line-height: 1.6; font-family: 'DM Sans', sans-serif;
        }

        .vp-search-dots { display: flex; gap: 5px; }

        .vp-search-dots span {
          width: 5px; height: 5px; border-radius: 50%; background: #ff2d6b;
          animation: dotBounce 1.2s ease-in-out infinite;
        }

        .vp-search-dots span:nth-child(2) { animation-delay: 0.2s; }
        .vp-search-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        .vp-audio-hint {
          position: absolute; top: 14px; right: 14px;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(10px);
          color: white; padding: 6px 14px; border-radius: 100px;
          font-size: 12px; font-weight: 600; font-family: 'DM Sans', sans-serif;
          pointer-events: none; z-index: 5; border: 1px solid rgba(255,255,255,0.08);
        }

        .vp-controls {
          flex-shrink: 0; height: 80px;
          display: flex; align-items: center; justify-content: center; gap: 16px;
          background: rgba(7,7,15,0.95); border-top: 1px solid rgba(255,255,255,0.05);
          position: relative; z-index: 10;
        }

        .vp-ctrl-group { display: flex; flex-direction: column; align-items: center; gap: 5px; }

        .vp-ctrl-label {
          font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 500;
          letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.2);
        }

        .vp-ctrl {
          border-radius: 50%; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); flex-shrink: 0;
        }

        .vp-ctrl-skip {
          width: 52px; height: 52px; font-size: 18px;
          background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
        }

        .vp-ctrl-skip:hover {
          background: rgba(255,77,77,0.15); border-color: rgba(255,77,77,0.3);
          color: #ff4d4d; transform: scale(1.08);
        }

        .vp-ctrl-skip.anim { transform: scale(0.88) rotate(-15deg); }

        .vp-ctrl-like {
          width: 62px; height: 62px; font-size: 24px;
          background: linear-gradient(135deg, #ff2d6b, #c9193e); color: white;
          box-shadow: 0 6px 24px rgba(255,45,107,0.5);
        }

        .vp-ctrl-like:hover:not(:disabled) {
          transform: scale(1.12); box-shadow: 0 10px 36px rgba(255,45,107,0.75);
        }

        .vp-ctrl-like.anim { transform: scale(1.3); box-shadow: 0 0 50px rgba(255,45,107,0.9); }

        .vp-ctrl-like.liked {
          background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,45,107,0.2);
          color: rgba(255,45,107,0.4); box-shadow: none;
          cursor: not-allowed; transform: none !important;
        }

        .vp-ctrl-chat {
          width: 52px; height: 52px; font-size: 18px;
          background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
        }

        .vp-ctrl-chat:hover { background: rgba(255,255,255,0.1); color: white; transform: scale(1.08); }
      `}</style>

      <div className="vp-root" onClick={unlockAudio}>
        <div className="vp-videos">

          {/* Tu cámara — izquierda 40% */}
          <div className="vp-local-wrap">
            <div className="vp-local-top" />
            <div className="vp-local-bottom" />
            <div className="vp-local-label">
              <div className="vp-rec-dot" />
              Tú
            </div>
            <video ref={localVideo} autoPlay muted playsInline className="vp-local" />
          </div>

          <div className="vp-divider" />

          {/* Cámara del match — derecha 60% */}
          <div className="vp-remote-wrap">
            <video
              ref={remoteVideo} autoPlay playsInline className="vp-remote"
              style={{ opacity: remoteReady ? 1 : 0 }}
            />

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
                    <div className="vp-search-dots"><span /><span /><span /></div>
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
                {audioLocked && <div className="vp-audio-hint">🔊 Tocá para audio</div>}
              </>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className="vp-controls">
          <div className="vp-ctrl-group">
            <button className={`vp-ctrl vp-ctrl-skip ${skipAnim ? "anim" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleSkip(); }}>✕</button>
            <span className="vp-ctrl-label">Pasar</span>
          </div>

          <div className="vp-ctrl-group">
            <button className={`vp-ctrl vp-ctrl-like ${likeAnim ? "anim" : ""} ${liked ? "liked" : ""}`}
              onClick={(e) => { e.stopPropagation(); handleLike(); }} disabled={liked}>♥</button>
            <span className="vp-ctrl-label">Like</span>
          </div>

          <div className="vp-ctrl-group">
            <button className="vp-ctrl vp-ctrl-chat"
              onClick={(e) => e.stopPropagation()}>💬</button>
            <span className="vp-ctrl-label">Chat</span>
          </div>
        </div>
      </div>
    </>
  );
}