"use client";

/**
 * DebateRoomsPage.tsx — v6 · PREMIUM REDESIGN
 * Lógica 100% intacta. Solo cambios de diseño y efectos.
 */

import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";

type Tag =
  | "Política" | "Tecnología" | "Ciencia" | "Deportes" | "Cultura"
  | "Economía" | "Filosofía" | "Gaming" | "Arte" | "Actualidad";

const ALL_TAGS: Tag[] = [
  "Política","Tecnología","Ciencia","Deportes","Cultura",
  "Economía","Filosofía","Gaming","Arte","Actualidad",
];

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface Room {
  id: string; title: string; description: string; tags: Tag[];
  max_people: number; participant_count: number;
  host_id: string; host_name: string; host_role?: string;
  created_at: string; is_live: boolean;
}

interface Participant {
  id: string; name: string; role: "streamer" | "viewer";
  hasVideo: boolean; hasAudio: boolean;
  mutedByHost: boolean;
  camOffByHost: boolean;
  isHost: boolean; stream?: MediaStream;
}

interface ChatMessage {
  id: string; userId: string; userName: string; text: string; ts: number;
}

function gridLayout(n: number): { cols: number; rows: number } {
  if (n <= 1) return { cols: 1, rows: 1 };
  if (n <= 2) return { cols: 2, rows: 1 };
  if (n <= 4) return { cols: 2, rows: 2 };
  if (n <= 6) return { cols: 3, rows: 2 };
  if (n <= 9) return { cols: 3, rows: 3 };
  if (n <= 12) return { cols: 4, rows: 3 };
  return { cols: 4, rows: Math.ceil(n / 4) };
}

// ─── useRooms ─────────────────────────────────────────────────────

function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("rooms").select("*").eq("is_live", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setRooms(data as Room[]); setLoading(false); });

    const ch = supabase.channel("rooms-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, p => {
        if (p.eventType === "INSERT") setRooms(prev => [p.new as Room, ...prev]);
        else if (p.eventType === "UPDATE") setRooms(prev => prev.map(r => r.id === p.new.id ? p.new as Room : r));
        else if (p.eventType === "DELETE") setRooms(prev => prev.filter(r => r.id !== p.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const createRoom = useCallback(async (data: Omit<Room, "id"|"participant_count"|"created_at"|"is_live">) => {
    const { data: room, error } = await supabase.from("rooms")
      .insert({ ...data, participant_count: 1, is_live: true }).select().single();
    if (error) throw error;
    return room as Room;
  }, []);

  const closeRoom = useCallback(async (roomId: string) => {
    await supabase.from("rooms").update({ is_live: false }).eq("id", roomId);
  }, []);

  const setCount = useCallback(async (roomId: string, count: number) => {
    await supabase.from("rooms").update({ participant_count: count }).eq("id", roomId);
  }, []);

  return { rooms, loading, createRoom, closeRoom, setCount };
}

// ─── Ban helpers ──────────────────────────────────────────────────

async function checkBan(roomId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("room_bans")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

async function insertBan(roomId: string, userId: string): Promise<void> {
  await supabase.from("room_bans").upsert({ room_id: roomId, user_id: userId });
}

// ─── useDebateMedia ───────────────────────────────────────────────

function useDebateMedia(
  roomId: string | null,
  isHost: boolean,
  userId: string,
  userName: string,
  userRole: "streamer" | "viewer",
  onToast: (msg: string, type?: "info"|"warn"|"error") => void,
) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [blockedByHost, setBlockedByHost] = useState({ mic: false, cam: false });
  const [presenceCount, setPresenceCount] = useState(1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const localRef = useRef<MediaStream | null>(null);
  const peerConns = useRef<Map<string, RTCPeerConnection>>(new Map());
  const sigCh = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createPC = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    localRef.current?.getTracks().forEach(t => pc.addTrack(t, localRef.current!));

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !sigCh.current) return;
      sigCh.current.send({ type:"broadcast", event:"ice",
        payload:{ from:userId, to:peerId, candidate:candidate.toJSON() } });
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      setParticipants(prev => {
        const ex = prev.find(p => p.id === peerId);
        if (ex) return prev.map(p => p.id === peerId
          ? { ...p, stream, hasVideo:true, hasAudio:true } : p);
        return [...prev, {
          id:peerId, name:peerId, role:"viewer",
          hasVideo:true, hasAudio:true,
          mutedByHost:false, camOffByHost:false,
          isHost:false, stream,
        }];
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setParticipants(prev => prev.filter(p => p.id !== peerId));
        peerConns.current.delete(peerId);
      }
    };

    peerConns.current.set(peerId, pc);
    return pc;
  }, [userId]);

  const sendJoin = useCallback((channel: ReturnType<typeof supabase.channel>) => {
    channel.send({ type:"broadcast", event:"join",
      payload:{ from:userId, name:userName, role:userRole } });
  }, [userId, userName, userRole]);

  const setupSignaling = useCallback(() => {
    if (!roomId) return;

    const channel = supabase.channel(`debate-${roomId}`, {
      config: { broadcast:{ self:false }, presence:{ key:userId } },
    });

    channel.on("presence", { event:"sync" }, () => {
      setPresenceCount(Object.keys(channel.presenceState()).length);
    });

    channel
      .on("broadcast", { event:"join" }, async ({ payload }) => {
        if (!isHost) return;
        const isBanned = await checkBan(roomId, payload.from);
        if (isBanned) {
          channel.send({ type:"broadcast", event:"banned", payload:{ to: payload.from } });
          return;
        }
        setParticipants(prev => {
          const ex = prev.find(p => p.id === payload.from);
          if (ex) return prev.map(p => p.id === payload.from
            ? { ...p, name:payload.name, role:payload.role ?? "viewer" } : p);
          return [...prev, {
            id:payload.from, name:payload.name, role:payload.role ?? "viewer",
            hasVideo:false, hasAudio:false,
            mutedByHost:false, camOffByHost:false, isHost:false,
          }];
        });
        const pc = createPC(payload.from);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({ type:"broadcast", event:"offer",
          payload:{ from:userId, to:payload.from, sdp:offer } });
      })

      .on("broadcast", { event:"offer" }, async ({ payload }) => {
        if (isHost || payload.to !== userId) return;
        if (retryTimerRef.current) { clearInterval(retryTimerRef.current); retryTimerRef.current = null; }
        setParticipants(prev => {
          if (prev.find(p => p.id === payload.from)) return prev;
          return [...prev, {
            id:payload.from, name:"Host", role:"streamer",
            hasVideo:false, hasAudio:false,
            mutedByHost:false, camOffByHost:false, isHost:true,
          }];
        });
        const pc = createPC(payload.from);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({ type:"broadcast", event:"answer",
          payload:{ from:userId, to:payload.from, sdp:answer } });
      })

      .on("broadcast", { event:"answer" }, async ({ payload }) => {
        if (!isHost || payload.to !== userId) return;
        const pc = peerConns.current.get(payload.from);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      })

      .on("broadcast", { event:"ice" }, async ({ payload }) => {
        if (payload.to !== userId) return;
        const pc = peerConns.current.get(payload.from);
        if (pc && payload.candidate) {
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
        }
      })

      .on("broadcast", { event:"host-ready" }, () => {
        if (!isHost && peerConns.current.size === 0) sendJoin(channel);
      })

      .on("broadcast", { event:"banned" }, ({ payload }) => {
        if (payload.to !== userId) return;
        onToast("🚫 Estás baneado de esta sala", "error");
        setTimeout(() => window.location.reload(), 2200);
      })

      .on("broadcast", { event:"moderate" }, ({ payload }) => {
        if (payload.to !== userId) return;
        if (payload.action === "mute") {
          const t = localRef.current?.getAudioTracks()[0];
          if (t) { t.enabled = false; setAudioOn(false); }
          setBlockedByHost(b => ({ ...b, mic:true }));
          onToast("🔇 El host silenció tu micrófono", "warn");
        }
        if (payload.action === "unmute") {
          setBlockedByHost(b => ({ ...b, mic:false }));
          onToast("🎙️ El host reactivó tu micrófono", "info");
        }
        if (payload.action === "camoff") {
          const t = localRef.current?.getVideoTracks()[0];
          if (t) { t.enabled = false; setVideoOn(false); }
          setBlockedByHost(b => ({ ...b, cam:true }));
          onToast("📵 El host apagó tu cámara", "warn");
        }
        if (payload.action === "camon") {
          setBlockedByHost(b => ({ ...b, cam:false }));
          onToast("📹 El host reactivó tu cámara", "info");
        }
        if (payload.action === "kick") {
          onToast("🚪 Fuiste expulsado de la sala", "error");
          setTimeout(() => window.location.reload(), 2200);
        }
        if (payload.action === "ban") {
          onToast("🚫 Fuiste baneado de la sala", "error");
          setTimeout(() => window.location.reload(), 2200);
        }
      })

      .on("broadcast", { event:"mod-state" }, ({ payload }) => {
        setParticipants(prev => prev.map(p => p.id === payload.targetId
          ? { ...p,
              mutedByHost: payload.mutedByHost ?? p.mutedByHost,
              camOffByHost: payload.camOffByHost ?? p.camOffByHost,
              hasAudio: payload.mutedByHost ? false : p.hasAudio,
              hasVideo: payload.camOffByHost ? false : p.hasVideo,
            }
          : p));
      })

      .on("broadcast", { event:"room-closed" }, () => {
        if (!isHost) { onToast("🔴 El host cerró la sala", "error"); setTimeout(() => window.location.reload(), 2200); }
      })

      .on("broadcast", { event:"chat" }, ({ payload }) => {
        setChatMessages(prev => [...prev, payload as ChatMessage].slice(-200));
      })

      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId, name:userName, role:userRole });

          if (isHost) {
            channel.send({ type:"broadcast", event:"host-ready", payload:{ hostId:userId } });
          } else {
            sendJoin(channel);
            retryTimerRef.current = setInterval(() => {
              if (peerConns.current.size === 0) {
                sendJoin(channel);
              } else {
                if (retryTimerRef.current) { clearInterval(retryTimerRef.current); retryTimerRef.current = null; }
              }
            }, 3000);
            setTimeout(() => {
              if (retryTimerRef.current) { clearInterval(retryTimerRef.current); retryTimerRef.current = null; }
            }, 60000);
          }
        }
      });

    sigCh.current = channel;

    if (!isHost && roomId) {
      let alreadyLeft = false;

      const watchdogCh = supabase
        .channel(`room-watchdog-${roomId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
          (payload) => {
            if (payload.new && (payload.new as any).is_live === false && !alreadyLeft) {
              alreadyLeft = true;
              onToast("🔴 El host cerró la sala", "error");
              setTimeout(() => window.location.reload(), 2200);
            }
          }
        ).subscribe();

      const pollingInterval = setInterval(async () => {
        const { data } = await supabase.from("rooms").select("is_live").eq("id", roomId).single();
        if (data && !data.is_live && !alreadyLeft) {
          alreadyLeft = true;
          clearInterval(pollingInterval);
          onToast("🔴 El host cerró la sala", "error");
          setTimeout(() => window.location.reload(), 2200);
        }
      }, 5000);

      (sigCh.current as any)._watchdog = watchdogCh;
      (sigCh.current as any)._polling = pollingInterval;
    }

  }, [roomId, isHost, userId, userName, userRole, createPC, sendJoin, onToast]);

  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      localRef.current = stream;
      setLocalStream(stream); setVideoOn(true); setAudioOn(true);
    } catch (e) { console.error("Media error:", e); }
  }, []);

  const stopMedia = useCallback(() => {
    localRef.current?.getTracks().forEach(t => t.stop());
    setLocalStream(null); setVideoOn(false); setAudioOn(false);
  }, []);

  const toggleVideo = useCallback(() => {
    if (blockedByHost.cam) { onToast("📵 Tu cámara fue bloqueada por el host", "warn"); return; }
    const t = localRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setVideoOn(t.enabled); onToast(t.enabled ? "📹 Cámara encendida" : "📵 Cámara apagada", "info"); }
  }, [blockedByHost.cam, onToast]);

  const toggleAudio = useCallback(() => {
    if (blockedByHost.mic) { onToast("🔇 Tu micrófono fue bloqueado por el host", "warn"); return; }
    const t = localRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setAudioOn(t.enabled); onToast(t.enabled ? "🎙️ Micrófono activado" : "🔇 Micrófono silenciado", "info"); }
  }, [blockedByHost.mic, onToast]);

  const moderate = useCallback((id: string, action: string) => {
    sigCh.current?.send({ type:"broadcast", event:"moderate", payload:{ to:id, action } });
  }, []);

  const muteParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.map(p => p.id===id ? {...p, mutedByHost:true, hasAudio:false} : p));
    moderate(id, "mute");
    sigCh.current?.send({ type:"broadcast", event:"mod-state", payload:{ targetId:id, mutedByHost:true } });
  }, [moderate]);

  const unmuteParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.map(p => p.id===id ? {...p, mutedByHost:false, hasAudio:true} : p));
    moderate(id, "unmute");
    sigCh.current?.send({ type:"broadcast", event:"mod-state", payload:{ targetId:id, mutedByHost:false } });
  }, [moderate]);

  const camOffParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.map(p => p.id===id ? {...p, camOffByHost:true, hasVideo:false} : p));
    moderate(id, "camoff");
    sigCh.current?.send({ type:"broadcast", event:"mod-state", payload:{ targetId:id, camOffByHost:true } });
  }, [moderate]);

  const camOnParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.map(p => p.id===id ? {...p, camOffByHost:false, hasVideo:true} : p));
    moderate(id, "camon");
    sigCh.current?.send({ type:"broadcast", event:"mod-state", payload:{ targetId:id, camOffByHost:false } });
  }, [moderate]);

  const kickParticipant = useCallback((id: string) => {
    setParticipants(prev => prev.filter(p => p.id!==id));
    moderate(id, "kick");
    peerConns.current.get(id)?.close(); peerConns.current.delete(id);
  }, [moderate]);

  const banParticipant = useCallback(async (id: string) => {
    if (roomId) await insertBan(roomId, id);
    setParticipants(prev => prev.filter(p => p.id!==id));
    moderate(id, "ban");
    peerConns.current.get(id)?.close(); peerConns.current.delete(id);
  }, [moderate, roomId]);

  const notifyRoomClosed = useCallback(() => {
    sigCh.current?.send({ type:"broadcast", event:"room-closed", payload:{} });
  }, []);

  const sendChat = useCallback((text: string) => {
    const msg: ChatMessage = { id:Date.now().toString(), userId, userName, text, ts:Date.now() };
    setChatMessages(prev => [...prev, msg].slice(-200));
    sigCh.current?.send({ type:"broadcast", event:"chat", payload:msg });
  }, [userId, userName]);

  useEffect(() => {
    if (!roomId) return;
    startMedia().then(() => setupSignaling());

    if (isHost && roomId) {
      heartbeatRef.current = setInterval(async () => {
        await supabase.from("rooms").update({ updated_at: new Date().toISOString() }).eq("id", roomId).eq("is_live", true);
      }, 8000);
    }

    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      stopMedia();
      peerConns.current.forEach(pc => pc.close()); peerConns.current.clear();
      if ((sigCh.current as any)?._polling) clearInterval((sigCh.current as any)._polling);
      if ((sigCh.current as any)?._watchdog) supabase.removeChannel((sigCh.current as any)._watchdog);
      if (sigCh.current) supabase.removeChannel(sigCh.current);
    };
  }, [roomId, isHost]);

  return {
    participants, localStream, videoOn, audioOn, blockedByHost, presenceCount,
    chatMessages, stopMedia, toggleVideo, toggleAudio,
    muteParticipant, unmuteParticipant,
    camOffParticipant, camOnParticipant,
    kickParticipant, banParticipant,
    notifyRoomClosed, sendChat,
  };
}

// ─── Toast ────────────────────────────────────────────────────────

function Toast({ message, type = "info", onDone }: {
  message: string; type?: "info"|"warn"|"error"; onDone: () => void;
}) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return <div className={`dr-toast dr-toast-${type}`}>{message}</div>;
}

function TagBadge({ tag, selected, onClick }: { tag: Tag; selected?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`dr-tag ${selected?"selected":""}`}
      style={{ cursor: onClick?"pointer":"default" }}>{tag}</button>
  );
}

// ─── RoomCard ─────────────────────────────────────────────────────

function RoomCard({ room, userId, onJoin }: { room: Room; userId: string; onJoin: (r: Room) => void }) {
  const pct = Math.round((room.participant_count / room.max_people) * 100);
  const full = room.participant_count >= room.max_people;
  const [banned, setBanned] = useState(false);
  const [checkingBan, setCheckingBan] = useState(false);

  const handleJoin = useCallback(async () => {
    if (full || checkingBan) return;
    setCheckingBan(true);
    const isBanned = await checkBan(room.id, userId);
    setCheckingBan(false);
    if (isBanned) { setBanned(true); return; }
    onJoin(room);
  }, [full, checkingBan, room, userId, onJoin]);

  return (
    <div className="dr-card" onClick={handleJoin}>
      {/* Glow layers */}
      <div className="dr-card-orb" />
      <div className="dr-card-shimmer" />

      <div className="dr-card-body">
        <div className="dr-card-top">
          <div className="dr-live-pill">
            <span className="dr-live-dot" />
            <span className="dr-live-label">EN VIVO</span>
          </div>
          <div className="dr-card-host-info">
            <span className="dr-card-role-badge">
              <span className="dr-role-crown">👑</span> STREAMER
            </span>
            <span className="dr-card-host-name">{room.host_name}</span>
          </div>
        </div>

        <h3 className="dr-card-title">{room.title}</h3>
        {room.description && <p className="dr-card-desc">{room.description}</p>}
        <div className="dr-card-tags">{room.tags.map(t => <TagBadge key={t} tag={t} />)}</div>
      </div>

      <div className="dr-card-footer">
        <div className="dr-capacity">
          <div className="dr-capacity-header">
            <span className="dr-capacity-icon">👥</span>
            <span className="dr-capacity-label">{room.participant_count} / {room.max_people}{full ? " · LLENA" : ""}</span>
          </div>
          <div className="dr-capacity-bar">
            <div className="dr-capacity-fill" style={{ width:`${pct}%`, background: full ? "linear-gradient(90deg,#f87171,#fb923c)" : "linear-gradient(90deg,#54c7f8,#3b9eda)" }} />
            <div className="dr-capacity-glow" style={{ width:`${pct}%`, opacity: full ? 0 : 1 }} />
          </div>
        </div>

        {banned ? (
          <div className="dr-banned-msg">🚫 Estás baneado de esta sala</div>
        ) : !full ? (
          <button className="dr-join-btn" disabled={checkingBan}>
            <span>{checkingBan ? "Verificando..." : "Unirse"}</span>
            {!checkingBan && <span className="dr-join-arrow">→</span>}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── VideoTile ────────────────────────────────────────────────────

function VideoTile({
  participant, isLocalSelf, isPinned, canModerate, onPin,
  onMute, onUnmute, onCamOff, onCamOn, onKick, onBan,
}: {
  participant: Participant; isLocalSelf?: boolean; isPinned?: boolean;
  canModerate?: boolean; onPin?: () => void;
  onMute?: () => void; onUnmute?: () => void;
  onCamOff?: () => void; onCamOn?: () => void;
  onKick?: () => void; onBan?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }
    }
  }, [participant.stream]);

  const initials = participant.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
  const micOff = participant.mutedByHost || !participant.hasAudio;
  const camOff = participant.camOffByHost || !participant.hasVideo;

  return (
    <div className={`dr-tile ${isPinned?"dr-tile-pinned":""} ${isLocalSelf?"dr-tile-self":""}`}>
      <video ref={videoRef} autoPlay playsInline muted={isLocalSelf || participant.isHost}
        className="dr-tile-video" style={{ display: camOff ? "none" : "block" }} />
      {camOff && (
        <div className="dr-tile-avatar">
          <div className="dr-tile-avatar-ring" />
          <span className="dr-tile-initials">{initials}</span>
          {participant.mutedByHost && <span className="dr-tile-blocked-badge">🔇</span>}
          {participant.camOffByHost && <span className="dr-tile-blocked-badge" style={{right:22}}>📵</span>}
        </div>
      )}

      <div className="dr-tile-info">
        <div className="dr-tile-info-left">
          {participant.isHost && <span className="dr-host-badge">HOST</span>}
          {participant.role==="streamer" && !participant.isHost && <span className="dr-streamer-badge">STR</span>}
          {isLocalSelf && <span className="dr-you-badge">TÚ</span>}
          <span className="dr-tile-name">{participant.name}</span>
        </div>
        <div className="dr-tile-icons">
          <span className={micOff ? "dr-icon-off" : "dr-icon-on"}>🎙️</span>
          <span className={camOff ? "dr-icon-off" : "dr-icon-on"}>📹</span>
        </div>
      </div>

      <button className={`dr-pin-btn ${isPinned?"active":""}`} onClick={onPin} title={isPinned?"Desfijar":"Fijar"}>
        {isPinned ? "📌" : "📍"}
      </button>

      {canModerate && !participant.isHost && !isLocalSelf && (
        <div className="dr-menu-wrap">
          <button className="dr-menu-btn" onClick={() => setMenuOpen(o => !o)}>⋯</button>
          {menuOpen && (
            <div className="dr-menu-dropdown" onMouseLeave={() => setMenuOpen(false)}>
              {participant.mutedByHost
                ? <button onClick={() => { onUnmute?.(); setMenuOpen(false); }}>🎙️ Reactivar mic</button>
                : <button onClick={() => { onMute?.(); setMenuOpen(false); }}>🔇 Silenciar</button>
              }
              {participant.camOffByHost
                ? <button onClick={() => { onCamOn?.(); setMenuOpen(false); }}>📹 Reactivar cámara</button>
                : <button onClick={() => { onCamOff?.(); setMenuOpen(false); }}>📵 Apagar cámara</button>
              }
              <div className="dr-menu-divider" />
              <button onClick={() => { onKick?.(); setMenuOpen(false); }}>🚪 Expulsar</button>
              <button className="dr-menu-ban" onClick={() => { onBan?.(); setMenuOpen(false); }}>🚫 Banear permanente</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────

function ChatPanel({ messages, onSend, onClose, userId }: {
  messages: ChatMessage[]; onSend: (t:string)=>void; onClose:()=>void; userId: string;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const handleSend = () => { const t=input.trim(); if(!t) return; onSend(t); setInput(""); };

  return (
    <div className="dr-chat">
      <div className="dr-chat-header">
        <div className="dr-chat-header-left">
          <div className="dr-chat-dot" />
          <span>Chat en vivo</span>
        </div>
        <button onClick={onClose} className="dr-chat-close">✕</button>
      </div>
      <div className="dr-chat-messages">
        {messages.length === 0 && <div className="dr-chat-empty">Todavía no hay mensajes</div>}
        {messages.map(m => (
          <div key={m.id} className={`dr-chat-msg ${m.userId===userId?"own":""}`}>
            <span className="dr-chat-author">{m.userId===userId?"Tú":m.userName}</span>
            <span className="dr-chat-text">{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="dr-chat-input-row">
        <input className="dr-chat-input" placeholder="Escribir..." value={input}
          onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSend()} maxLength={300} />
        <button className="dr-chat-send" onClick={handleSend}>→</button>
      </div>
    </div>
  );
}

// ─── CreateRoomModal ──────────────────────────────────────────────

function CreateRoomModal({ hostId, hostName, hostRole, onClose, onCreated }: {
  hostId:string; hostName:string; hostRole:string;
  onClose:()=>void; onCreated:(r:Room)=>void;
}) {
  const { createRoom } = useRooms();
  const [title,setTitle]=useState(""); const [description,setDescription]=useState("");
  const [tags,setTags]=useState<Tag[]>([]); const [maxPeople,setMaxPeople]=useState<number|"">(50);
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");

  const toggleTag=(tag:Tag)=>setTags(prev=>prev.includes(tag)?prev.filter(t=>t!==tag):[...prev,tag].slice(0,4));

  const handleCreate=async()=>{
    if(!title.trim()){setError("El título es obligatorio");return;}
    if(tags.length===0){setError("Elegí al menos un tema");return;}
    if(!maxPeople||maxPeople<2){setError("La capacidad mínima es 2");return;}
    setError("");setLoading(true);
    try {
      const room=await createRoom({
        title:title.trim(), description:description.trim(), tags,
        max_people:maxPeople as number, host_id:hostId, host_name:hostName, host_role:hostRole,
      });
      onCreated(room);
    } catch(e:any){setError(e.message??"Error al crear la sala");}
    finally{setLoading(false);}
  };

  return (
    <div className="crm-overlay" onClick={onClose}>
      <div className="crm-sheet" onClick={e=>e.stopPropagation()}>
        {/* Decorative top beam */}
        <div className="crm-beam" />
        <div className="crm-beam-glow" />

       

        <div className="crm-header">
          <div className="crm-header-left">
            <div className="crm-crown-wrap">
              <div className="crm-crown-ring" />
              <span className="crm-crown-icon">👑</span>
            </div>
            <div>
              <p className="crm-eyebrow">Exclusivo para Streamer</p>
              <h2 className="crm-title">Crear debate</h2>
            </div>
          </div>
          <button className="crm-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="crm-body">
          <div className="crm-field">
            <label className="crm-label">Título <span className="crm-required">*</span></label>
            <div className="crm-input-wrap">
              <input className="crm-input" placeholder="¿De qué van a debatir?" value={title}
                onChange={e=>setTitle(e.target.value)} maxLength={80} autoFocus/>
              <span className="crm-char-count">{title.length}/80</span>
            </div>
          </div>

          <div className="crm-field">
            <label className="crm-label">Descripción <span className="crm-hint">opcional</span></label>
            <div className="crm-input-wrap">
              <textarea className="crm-input crm-textarea" placeholder="Contexto, reglas del debate..." value={description}
                onChange={e=>setDescription(e.target.value)} maxLength={280} rows={3}/>
              <span className="crm-char-count crm-char-count-ta">{description.length}/280</span>
            </div>
          </div>

          <div className="crm-field">
            <label className="crm-label">Tema <span className="crm-required">*</span><span className="crm-hint">hasta 4</span></label>
            <div className="crm-tags-grid">
              {ALL_TAGS.map(tag=>(
                <button key={tag} type="button" className={`crm-tag ${tags.includes(tag)?"crm-tag-on":""}`}
                  onClick={()=>toggleTag(tag)}>
                  {tags.includes(tag) && <span className="crm-tag-check">✓</span>}
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="crm-field">
            <label className="crm-label">Capacidad <span className="crm-hint">2–500 personas</span></label>
            <div className="crm-capacity-row">
              <div className="crm-number-wrap">
                <button className="crm-num-btn" type="button" onClick={()=>setMaxPeople(p=>Math.max(2,(p||2)-1))}>−</button>
                <input className="crm-number-input" type="number" min={2} max={500} value={maxPeople}
                  onChange={e=>{const n=parseInt(e.target.value,10);if(!isNaN(n))setMaxPeople(Math.min(500,Math.max(2,n)));}}/>
                <button className="crm-num-btn" type="button" onClick={()=>setMaxPeople(p=>Math.min(500,(p||2)+1))}>+</button>
              </div>
              <div className="crm-capacity-presets">
                {[10,25,50,100].map(n=>(
                  <button key={n} type="button" className={`crm-preset ${maxPeople===n?"crm-preset-on":""}`}
                    onClick={()=>setMaxPeople(n)}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="crm-error">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#f87171" strokeWidth="1.5"/>
                <path d="M7 4v3.5M7 9.5v.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="crm-footer">
          <button className="crm-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="crm-btn-create" onClick={handleCreate} disabled={loading}>
            {loading
              ? <span className="crm-loading-dots"><span/><span/><span/></span>
              : <><span>Iniciar sala</span><span className="crm-arrow">→</span></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RoomView ─────────────────────────────────────────────────────

function RoomView({ room, currentUserId, currentUserName, currentUserRole, onLeave, closeRoom, setCount }: {
  room: Room; currentUserId: string; currentUserName: string;
  currentUserRole: "streamer"|"viewer";
  onLeave: ()=>void; closeRoom: (id:string)=>Promise<void>;
  setCount: (id:string, n:number)=>Promise<void>;
}) {
  const isHost = room.host_id === currentUserId;
  const [toasts, setToasts] = useState<{id:string; msg:string; type:"info"|"warn"|"error"}[]>([]);
  const [pinnedId, setPinnedId] = useState<string|null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const onToast = useCallback((msg:string, type:"info"|"warn"|"error" = "info") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg, type }]);
  }, []);

  const {
    participants, localStream, videoOn, audioOn, blockedByHost, presenceCount,
    chatMessages, stopMedia, toggleVideo, toggleAudio,
    muteParticipant, unmuteParticipant,
    camOffParticipant, camOnParticipant,
    kickParticipant, banParticipant,
    notifyRoomClosed, sendChat,
  } = useDebateMedia(room.id, isHost, currentUserId, currentUserName, currentUserRole, onToast);

  const selfViewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { setCount(room.id, presenceCount); }, [presenceCount]);

  useEffect(() => {
    if (!isHost) return;
    const handleUnload = () => {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rooms?id=eq.${room.id}`, {
        method: "PATCH", keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ is_live: false }),
      });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      notifyRoomClosed();
      closeRoom(room.id);
    };
  }, [isHost, room.id, closeRoom, notifyRoomClosed]);

  useEffect(() => {
    if (selfViewRef.current && localStream) selfViewRef.current.srcObject = localStream;
  }, [localStream]);

  const handleLeaveOrClose = useCallback(async () => {
    if (isHost) { notifyRoomClosed(); await closeRoom(room.id); }
    stopMedia(); onLeave();
  }, [isHost, room.id, closeRoom, stopMedia, onLeave, notifyRoomClosed]);

  const togglePin = useCallback((id:string) => setPinnedId(prev => prev===id ? null : id), []);

  const selfParticipant: Participant = useMemo(() => ({
    id: currentUserId, name: currentUserName, role: currentUserRole,
    hasVideo: videoOn, hasAudio: audioOn,
    mutedByHost: blockedByHost.mic, camOffByHost: blockedByHost.cam,
    isHost, stream: localStream ?? undefined,
  }), [currentUserId, currentUserName, currentUserRole, videoOn, audioOn, blockedByHost, isHost, localStream]);

  const allParticipants: Participant[] = useMemo(() => [selfParticipant, ...participants], [selfParticipant, participants]);
  const pinnedParticipant = pinnedId ? allParticipants.find(p => p.id === pinnedId) : null;
  const gridParticipants  = pinnedId ? allParticipants.filter(p => p.id !== pinnedId) : allParticipants;
  const { cols } = useMemo(() => gridLayout(gridParticipants.length), [gridParticipants.length]);
  const needsScroll = gridParticipants.length > 16;

  return (
    <div className="dr-room-view">
      <div className="dr-toasts-stack">
        {toasts.map(t => (
          <Toast key={t.id} message={t.msg} type={t.type}
            onDone={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>

      <div className="dr-room-header">
        <div className="dr-room-meta">
          <div className="dr-room-logo-mini">
            <span className="dr-room-logo-t">T</span>
          </div>
          <span className="dr-live-dot" />
          <span className="dr-room-title-text">{room.title}</span>
          <div className="dr-room-tags">{room.tags.map(t=><TagBadge key={t} tag={t}/>)}</div>
        </div>
        <div className="dr-room-header-right">
          <div className="dr-room-count-pill">
            <span className="dr-room-count-dot" />
            <span>{presenceCount}/{room.max_people}</span>
          </div>
          <button className="dr-chat-toggle-btn" onClick={()=>setChatOpen(o=>!o)}>
            💬
            {chatMessages.length>0 && <span className="dr-chat-badge">{chatMessages.length}</span>}
          </button>
          <button className="dr-leave-btn" onClick={handleLeaveOrClose}>
            {isHost ? "🚪 Cerrar sala" : "← Salir"}
          </button>
        </div>
      </div>

      <div className="dr-room-body">
        {pinnedParticipant ? (
          <div className="dr-pinned-layout">
            <div className="dr-pinned-stage">
              <VideoTile participant={pinnedParticipant} isLocalSelf={pinnedParticipant.id===currentUserId}
                isPinned canModerate={isHost} onPin={() => togglePin(pinnedParticipant.id)}
                onMute={() => muteParticipant(pinnedParticipant.id)} onUnmute={() => unmuteParticipant(pinnedParticipant.id)}
                onCamOff={() => camOffParticipant(pinnedParticipant.id)} onCamOn={() => camOnParticipant(pinnedParticipant.id)}
                onKick={() => kickParticipant(pinnedParticipant.id)} onBan={() => banParticipant(pinnedParticipant.id)} />
            </div>
            <div className="dr-pinned-rail">
              {gridParticipants.map(p => (
                <VideoTile key={p.id} participant={p} isLocalSelf={p.id===currentUserId} isPinned={false}
                  canModerate={isHost} onPin={() => togglePin(p.id)}
                  onMute={() => muteParticipant(p.id)} onUnmute={() => unmuteParticipant(p.id)}
                  onCamOff={() => camOffParticipant(p.id)} onCamOn={() => camOnParticipant(p.id)}
                  onKick={() => kickParticipant(p.id)} onBan={() => banParticipant(p.id)} />
              ))}
            </div>
          </div>
        ) : (
          <div className={`dr-meet-grid ${needsScroll?"scrollable":""}`}
            style={{ "--grid-cols": cols } as React.CSSProperties}>
            {gridParticipants.map(p => (
              <VideoTile key={p.id} participant={p} isLocalSelf={p.id===currentUserId} isPinned={false}
                canModerate={isHost} onPin={() => togglePin(p.id)}
                onMute={() => muteParticipant(p.id)} onUnmute={() => unmuteParticipant(p.id)}
                onCamOff={() => camOffParticipant(p.id)} onCamOn={() => camOnParticipant(p.id)}
                onKick={() => kickParticipant(p.id)} onBan={() => banParticipant(p.id)} />
            ))}
          </div>
        )}

        {chatOpen && (
          <ChatPanel messages={chatMessages} onSend={sendChat} onClose={()=>setChatOpen(false)} userId={currentUserId}/>
        )}
      </div>

      <div className="dr-self-pip">
        <video ref={selfViewRef} autoPlay playsInline muted className="dr-self-pip-video"/>
        {(!videoOn || blockedByHost.cam) && (
          <div className="dr-self-pip-avatar">
            <span className="dr-self-pip-initials">
              {currentUserName.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
            </span>
          </div>
        )}
        <div className="dr-self-pip-info">
          <span className="dr-self-pip-name">{currentUserName}</span>
          <div className="dr-self-pip-icons">
            <span className={audioOn&&!blockedByHost.mic?"dr-icon-on":"dr-icon-off"}>🎙️</span>
            <span className={videoOn&&!blockedByHost.cam?"dr-icon-on":"dr-icon-off"}>📹</span>
          </div>
        </div>
        {(blockedByHost.mic || blockedByHost.cam) && (
          <div className="dr-self-pip-blocked">
            {blockedByHost.mic && <span title="Mic bloqueado por host">🔒🎙️</span>}
            {blockedByHost.cam && <span title="Cam bloqueada por host">🔒📹</span>}
          </div>
        )}
      </div>

      <div className="dr-controls">
        <button className={`dr-ctrl-btn ${audioOn&&!blockedByHost.mic?"active":"off"}`}
          onClick={toggleAudio} title={blockedByHost.mic ? "Bloqueado por host" : (audioOn?"Silenciar":"Activar mic")}>
          {audioOn && !blockedByHost.mic ? "🎙️" : "🔇"}
        </button>
        <button className={`dr-ctrl-btn ${videoOn&&!blockedByHost.cam?"active":"off"}`}
          onClick={toggleVideo} title={blockedByHost.cam ? "Bloqueado por host" : (videoOn?"Apagar cam":"Encender cam")}>
          {videoOn && !blockedByHost.cam ? "📹" : "📵"}
        </button>
        <button className="dr-ctrl-btn neutral" onClick={()=>setChatOpen(o=>!o)} title="Chat">💬</button>
        {isHost && <div className="dr-ctrl-host-badge" title="Modo host">👑</div>}
        {(blockedByHost.mic || blockedByHost.cam) && (
          <div className="dr-ctrl-blocked-warn" title="El host bloqueó alguno de tus dispositivos">🔒</div>
        )}
      </div>

      {room.description && (
        <div className="dr-room-desc-bar">
          <span>💬</span><span>{room.description}</span>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────

export default function DebateRoomsPage() {
  const router = useRouter();
  const profile = useProfile();

  const userId:   string = (profile as any)?.id   ?? "";
  const userName: string = (profile as any)?.name ?? (profile as any)?.full_name ?? "Usuario";
  const userRole: "streamer"|"viewer" = (profile as any)?.role ?? "viewer";
  const isStreamer = userRole === "streamer";

  const { rooms, loading, closeRoom, setCount } = useRooms();
  const [activeRoom, setActiveRoom] = useState<Room|null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterTag, setFilterTag] = useState<Tag|null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({data}) => { if(!data.user) router.push("/"); });
  }, [router]);

  const filteredRooms = useMemo(() => rooms.filter(r => {
    const matchTag = !filterTag || r.tags.includes(filterTag);
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  }), [rooms, filterTag, search]);

  if (activeRoom) {
    return (
      <><GlobalStyles/>
        <div className="dr-root">
          <div className="dr-aurora"/><div className="dr-flag"/>
          <RoomView
            room={activeRoom} currentUserId={userId} currentUserName={userName} currentUserRole={userRole}
            onLeave={() => setActiveRoom(null)} closeRoom={closeRoom} setCount={setCount}
          />
        </div>
      </>
    );
  }

  return (
    <><GlobalStyles/>
      {showCreate && isStreamer && (
        <CreateRoomModal
          hostId={userId} hostName={userName} hostRole={userRole}
          onClose={() => setShowCreate(false)}
          onCreated={room => { setShowCreate(false); setActiveRoom(room); }}
        />
      )}
      <div className="dr-root">
        <div className="dr-aurora"/>
        <div className="dr-flag"/>

        {/* ── HEADER PREMIUM ── */}
        <header className="dr-header">
          {/* Logo integrado */}
          <div className="dr-logo-full">
            <div className="dr-logo-icon-wrap">
              <div className="dr-logo-icon-halo" />
              {/* Reemplazar con: <img src={img.src} className="dr-logo-img" alt="Turrinder" /> */}
              <div className="dr-logo-img-placeholder">T</div>
            </div>
            <div className="dr-logo-text-group">
              <div className="dr-logo-wordmark">
                Turr<em>inder</em>
              </div>
              <div className="dr-logo-section-tag">
                <span className="dr-section-dot" />
                Debates
              </div>
            </div>
          </div>

          

          <div className="dr-header-right">
            <div className="dr-role-badge" data-role={userRole}>
              {userRole==="streamer" ? "👑 Streamer" : "👁 Viewer"}
            </div>
            {isStreamer && (
              <button className="dr-create-btn" onClick={() => setShowCreate(true)}>
                <span className="dr-create-btn-plus">+</span>
                <span>Crear sala</span>
              </button>
            )}
          </div>
        </header>

        {/* ── FILTROS PREMIUM ── */}
        <div className="dr-filters">
          <div className="dr-search-wrap">
            <svg className="dr-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input className="dr-search" placeholder="Buscar debate..." value={search}
              onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="dr-filter-tags">
            <button className={`dr-filter-tag ${!filterTag?"active":""}`}
              onClick={() => setFilterTag(null)}>Todos</button>
            {ALL_TAGS.map(tag => (
              <button key={tag}
                className={`dr-filter-tag ${filterTag===tag?"active":""}`}
                onClick={() => setFilterTag(prev => prev===tag ? null : tag)}>{tag}</button>
            ))}
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <main className="dr-main">
          {loading ? (
            <div className="dr-loading">
              <div className="dr-spinner-wrap">
                <div className="dr-spinner"/>
                <div className="dr-spinner-inner"/>
              </div>
              <span>Cargando salas...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="dr-empty">
              <div className="dr-empty-orb" />
              <div className="dr-empty-icon">🎙️</div>
              <h3>No hay debates activos</h3>
              <p>{isStreamer ? "¡Creá la primera sala y empezá el debate!" : "Esperá a que un Streamer cree una sala."}</p>
              {isStreamer && (
                <button className="dr-empty-create-btn" onClick={() => setShowCreate(true)}>
                  + Crear primera sala
                </button>
              )}
            </div>
          ) : (
            <div className="dr-rooms-grid">
              {filteredRooms.map(room => (
                <RoomCard key={room.id} room={room} userId={userId} onJoin={setActiveRoom}/>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Clash+Display:wght@500;600;700&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      .dr-root {
        --sky: #54c7f8;
        --sky2: #3b9eda;
        --sky3: #1a6fa8;
        --sky-glow: rgba(84,199,248,0.38);
        --white: #f5f8ff;
        --bg: #030a14;
        --bg2: #050f1e;
        --glass: rgba(84,199,248,0.04);
        --glass-b: rgba(84,199,248,0.11);
        --glass-b2: rgba(84,199,248,0.22);
        --muted: rgba(180,215,240,0.45);
        --danger: #f87171;
        --warn: #fbbf24;
        --violet: #a78bfa;
        --green: #4ade80;
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        background: var(--bg);
        font-family: 'DM Sans', sans-serif;
        -webkit-font-smoothing: antialiased;
        color: var(--white);
        position: relative;
      }

      /* Noise overlay */
      .dr-root::before {
        content: '';
        position: fixed; inset: 0; pointer-events: none; z-index: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
        opacity: 0.25;
      }

      /* ── AURORA ── */
      .dr-aurora {
        position: fixed; inset: 0; pointer-events: none; z-index: 0;
        background:
          radial-gradient(ellipse 80% 50% at 5% 10%, rgba(84,199,248,0.18) 0%, transparent 60%),
          radial-gradient(ellipse 60% 45% at 95% 85%, rgba(59,158,218,0.13) 0%, transparent 58%),
          radial-gradient(ellipse 45% 40% at 70% 5%, rgba(26,111,168,0.10) 0%, transparent 55%),
          radial-gradient(ellipse 55% 35% at 20% 95%, rgba(143,212,255,0.07) 0%, transparent 52%),
          radial-gradient(ellipse 35% 30% at 50% 50%, rgba(84,199,248,0.04) 0%, transparent 60%);
        animation: dr-aurora 22s ease-in-out infinite alternate;
      }
      @keyframes dr-aurora {
        0%   { opacity: 0.7; transform: scale(1) rotate(0deg); }
        50%  { opacity: 1;   transform: scale(1.06) rotate(0.3deg); }
        100% { opacity: 0.85; transform: scale(1.09) rotate(-0.2deg); }
      }

      /* ── FLAG STRIPE ── */
      .dr-flag {
        position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 60; opacity: 0.7;
        background: linear-gradient(90deg, var(--sky) 33%, rgba(245,248,255,0.88) 33% 66%, var(--sky) 66%);
      }

      /* ══════════════════════════════════════
         HEADER PREMIUM
      ══════════════════════════════════════ */
      .dr-header {
        position: sticky; top: 3px; z-index: 50;
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 28px;
        background: rgba(3,10,20,0.75);
        backdrop-filter: blur(24px);
        border-bottom: 1px solid var(--glass-b);
        gap: 16px;
      }

      /* Logo completo */
      .dr-logo-full {
        display: flex; align-items: center; gap: 13px;
        cursor: default; user-select: none;
        flex-shrink: 0;
      }
      .dr-logo-icon-wrap {
        position: relative; width: 40px; height: 40px; flex-shrink: 0;
      }
      .dr-logo-icon-halo {
        position: absolute; inset: 0; border-radius: 12px;
        background: linear-gradient(145deg, rgba(84,199,248,0.2), rgba(59,158,218,0.08));
        border: 1px solid rgba(84,199,248,0.3);
        box-shadow: 0 0 0 1px rgba(84,199,248,0.06), 0 4px 20px rgba(84,199,248,0.18), inset 0 1px 0 rgba(255,255,255,0.1);
        animation: logo-halo 3.5s ease-in-out infinite alternate;
      }
      @keyframes logo-halo {
        from { box-shadow: 0 0 0 1px rgba(84,199,248,0.06), 0 4px 20px rgba(84,199,248,0.18), inset 0 1px 0 rgba(255,255,255,0.1); }
        to   { box-shadow: 0 0 0 1px rgba(84,199,248,0.15), 0 6px 32px rgba(84,199,248,0.38), inset 0 1px 0 rgba(255,255,255,0.15); }
      }
      /* REEMPLAZAR CON: img.dr-logo-img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:6px; filter:drop-shadow(0 0 7px rgba(84,199,248,0.6)) brightness(1.08); } */
      .dr-logo-img-placeholder {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 900;
        background: linear-gradient(135deg, var(--sky), var(--sky2));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .dr-logo-text-group { display: flex; flex-direction: column; gap: 2px; line-height: 1; }
      .dr-logo-wordmark {
        font-family: 'Syne', sans-serif; font-size: 19px; font-weight: 800;
        letter-spacing: -0.8px; color: var(--white); line-height: 1;
      }
      .dr-logo-wordmark em {
        font-style: normal;
        background: linear-gradient(120deg, var(--sky) 0%, #c8f2ff 55%, var(--sky2) 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .dr-logo-section-tag {
        display: flex; align-items: center; gap: 5px;
        font-size: 9px; font-weight: 600; letter-spacing: 2.5px;
        text-transform: uppercase; color: rgba(84,199,248,0.45); line-height: 1;
      }
      .dr-section-dot {
        width: 4px; height: 4px; border-radius: 50%; background: var(--sky);
        opacity: 0.65; flex-shrink: 0;
        box-shadow: 0 0 5px rgba(84,199,248,0.8);
        animation: sky-pulse 2s infinite;
      }
      @keyframes sky-pulse {
        0%  { box-shadow: 0 0 0 0 rgba(84,199,248,0.6); }
        70% { box-shadow: 0 0 0 5px rgba(84,199,248,0); }
        100%{ box-shadow: 0 0 0 0 rgba(84,199,248,0); }
      }

      /* Header center indicator */
      .dr-header-center { flex: 1; display: flex; justify-content: center; }
      .dr-header-live-indicator {
        display: flex; align-items: center; gap: 7px;
        font-size: 11px; color: var(--muted); font-weight: 500;
        background: rgba(84,199,248,0.04); border: 1px solid var(--glass-b);
        border-radius: 100px; padding: 5px 14px;
      }

      .dr-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

      .dr-role-badge {
        font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 100px;
        border: 1px solid var(--glass-b); background: var(--glass); color: var(--muted);
        letter-spacing: 0.3px;
      }
      .dr-role-badge[data-role="streamer"] {
        border-color: rgba(251,191,36,0.4); background: rgba(251,191,36,0.07); color: var(--warn);
      }

      .dr-create-btn {
        display: flex; align-items: center; gap: 7px;
        font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
        padding: 9px 20px; border-radius: 100px;
        border: 1px solid rgba(84,199,248,0.35);
        background: linear-gradient(135deg, rgba(84,199,248,0.14), rgba(59,158,218,0.07));
        color: var(--sky); cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        position: relative; overflow: hidden;
      }
      .dr-create-btn::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent 55%);
      }
      .dr-create-btn:hover {
        border-color: rgba(84,199,248,0.6);
        background: linear-gradient(135deg, rgba(84,199,248,0.22), rgba(59,158,218,0.14));
        box-shadow: 0 0 24px rgba(84,199,248,0.28), 0 4px 16px rgba(84,199,248,0.15);
        transform: translateY(-1px);
      }
      .dr-create-btn-plus {
        font-size: 16px; font-weight: 300; line-height: 1;
        background: linear-gradient(135deg, var(--sky), var(--sky2));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }

      /* ══════════════════════════════════════
         FILTROS PREMIUM
      ══════════════════════════════════════ */
      .dr-filters {
        position: relative; z-index: 2;
        padding: 16px 28px 8px;
        display: flex; flex-direction: column; gap: 12px;
      }

      .dr-search-wrap {
        position: relative; display: flex; align-items: center;
      }
      .dr-search-icon {
        position: absolute; left: 14px; color: var(--muted); pointer-events: none; flex-shrink: 0;
      }
      .dr-search {
        width: 100%; max-width: 360px;
        background: rgba(5,14,28,0.8); border: 1px solid var(--glass-b);
        border-radius: 14px; padding: 11px 16px 11px 38px;
        color: var(--white); font-size: 14px; font-family: 'DM Sans', sans-serif;
        outline: none; transition: all 0.2s ease;
      }
      .dr-search::placeholder { color: rgba(143,212,255,0.22); }
      .dr-search:focus {
        border-color: rgba(84,199,248,0.4);
        background: rgba(84,199,248,0.04);
        box-shadow: 0 0 0 3px rgba(84,199,248,0.08);
      }

      .dr-filter-tags {
        display: flex; gap: 6px; flex-wrap: wrap;
      }
      .dr-filter-tag {
        font-size: 11px; font-weight: 500; padding: 5px 14px; border-radius: 100px;
        border: 1px solid var(--glass-b); background: rgba(4,12,26,0.7);
        color: var(--muted); cursor: pointer;
        transition: all 0.18s cubic-bezier(0.16,1,0.3,1); white-space: nowrap;
        letter-spacing: 0.3px;
      }
      .dr-filter-tag:hover { border-color: rgba(84,199,248,0.3); color: rgba(143,212,255,0.85); }
      .dr-filter-tag.active {
        border-color: rgba(84,199,248,0.55); background: rgba(84,199,248,0.1);
        color: var(--sky); box-shadow: 0 0 12px rgba(84,199,248,0.15);
      }

      /* ══════════════════════════════════════
         MAIN / GRID
      ══════════════════════════════════════ */
      .dr-main {
        flex: 1; position: relative; z-index: 1;
        padding: 16px 28px 40px; overflow-y: auto;
      }

      /* Loading */
      .dr-loading {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 16px; padding: 100px 20px; color: var(--muted);
      }
      .dr-spinner-wrap { position: relative; width: 40px; height: 40px; }
      .dr-spinner {
        position: absolute; inset: 0;
        border: 2px solid rgba(84,199,248,0.1); border-top-color: var(--sky);
        border-radius: 50%; animation: dr-spin 0.8s linear infinite;
      }
      .dr-spinner-inner {
        position: absolute; inset: 6px;
        border: 2px solid rgba(84,199,248,0.06); border-bottom-color: rgba(84,199,248,0.4);
        border-radius: 50%; animation: dr-spin 1.4s linear infinite reverse;
      }
      @keyframes dr-spin { to { transform: rotate(360deg); } }

      /* Empty state */
      .dr-empty {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 14px; padding: 100px 20px;
        text-align: center; position: relative;
      }
      .dr-empty-orb {
        position: absolute; width: 300px; height: 300px; border-radius: 50%;
        background: radial-gradient(circle, rgba(84,199,248,0.07) 0%, transparent 70%);
        pointer-events: none;
        animation: orb-breathe 4s ease-in-out infinite;
      }
      @keyframes orb-breathe {
        0%,100% { transform: scale(1); opacity: 0.6; }
        50%     { transform: scale(1.1); opacity: 1; }
      }
      .dr-empty-icon { font-size: 52px; position: relative; z-index: 1; }
      .dr-empty h3 {
        font-family:sans-serif; font-size: 20px; font-weight: 800;
        color: var(--white); position: relative; z-index: 1; letter-spacing: -0.3px;
      }
      .dr-empty p { font-size: 14px; color: var(--muted); max-width: 300px; line-height: 1.6; position: relative; z-index: 1; }
      .dr-empty-create-btn {
        margin-top: 8px; padding: 12px 28px; border-radius: 100px;
        background: linear-gradient(135deg, var(--sky), var(--sky2));
        border: none; color: #020d18;
        font-family: sans-serif; font-size: 14px; font-weight: 800;
        cursor: pointer; position: relative; z-index: 1;
        box-shadow: 0 8px 32px rgba(84,199,248,0.4);
        transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
      }
      .dr-empty-create-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 44px rgba(84,199,248,0.55); }

      /* ══════════════════════════════════════
         CARDS PREMIUM
      ══════════════════════════════════════ */
      .dr-rooms-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
        gap: 18px;
      }

      .dr-card {
        position: relative;
        background: linear-gradient(160deg, rgba(6,16,32,0.92), rgba(3,10,22,0.95));
        border: 1px solid var(--glass-b);
        border-radius: 20px; overflow: hidden; cursor: pointer;
        transition: border-color 0.3s, transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s;
        backdrop-filter: blur(16px);
        display: flex; flex-direction: column;
        animation: card-in 0.4s cubic-bezier(0.16,1,0.3,1) both;
      }
      @keyframes card-in {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .dr-card:hover {
        border-color: rgba(84,199,248,0.32);
        transform: translateY(-4px);
        box-shadow: 0 12px 48px rgba(84,199,248,0.14), 0 2px 8px rgba(0,0,0,0.4);
      }
      .dr-card:hover .dr-card-orb { opacity: 1; }
      .dr-card:hover .dr-card-shimmer { opacity: 1; }

      /* Orb glow */
      .dr-card-orb {
        position: absolute; top: -60px; left: -60px;
        width: 160px; height: 160px;
        background: radial-gradient(circle, rgba(84,199,248,0.14) 0%, transparent 70%);
        pointer-events: none; opacity: 0;
        transition: opacity 0.4s; border-radius: 50%;
      }
      /* Shimmer line */
      .dr-card-shimmer {
        position: absolute; top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(84,199,248,0.5) 50%, transparent);
        opacity: 0; transition: opacity 0.4s;
      }

      .dr-card-body { padding: 18px 20px 14px; flex: 1; }
      .dr-card-footer {
        padding: 14px 20px 18px;
        border-top: 1px solid rgba(84,199,248,0.07);
        background: rgba(3,10,20,0.3);
      }

      .dr-card-top {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 12px;
      }
      .dr-live-pill {
        display: flex; align-items: center; gap: 6px;
        background: rgba(84,199,248,0.08); border: 1px solid rgba(84,199,248,0.18);
        border-radius: 100px; padding: 3px 10px 3px 7px;
      }
      .dr-live-dot {
        width: 6px; height: 6px; border-radius: 50%; background: var(--sky); flex-shrink: 0;
        box-shadow: 0 0 6px var(--sky);
        animation: live-pulse 1.8s ease-in-out infinite;
      }
      @keyframes live-pulse {
        0%,100% { opacity: 1; box-shadow: 0 0 6px var(--sky); }
        50%     { opacity: 0.6; box-shadow: 0 0 14px var(--sky); }
      }
      .dr-live-label {
        font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
        color: var(--sky); text-transform: uppercase;
      }

      .dr-card-host-info { display: flex; align-items: center; gap: 6px; }
      .dr-card-role-badge {
        display: flex; align-items: center; gap: 3px;
        font-size: 8px; font-weight: 800; letter-spacing: 1px;
        color: var(--violet);
        border: 1px solid rgba(167,139,250,0.35); background: rgba(167,139,250,0.09);
        border-radius: 5px; padding: 2px 7px; text-transform: uppercase;
      }
      .dr-role-crown { font-size: 9px; }
      .dr-card-host-name { font-size: 11px; color: var(--muted); }

      .dr-card-title {
        font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800;
        color: var(--white); line-height: 1.25; margin-bottom: 8px;
        letter-spacing: -0.3px;
      }
      .dr-card-desc {
        font-size: 12px; color: var(--muted); line-height: 1.55; margin-bottom: 12px;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .dr-card-tags { display: flex; flex-wrap: wrap; gap: 5px; }

      .dr-tag {
        font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 100px;
        border: 1px solid var(--glass-b); background: rgba(4,12,26,0.7);
        color: rgba(143,212,255,0.4); text-transform: uppercase; letter-spacing: 0.5px;
        transition: all 0.15s;
      }
      .dr-tag.selected, .dr-tag:hover {
        border-color: rgba(84,199,248,0.4); background: rgba(84,199,248,0.08); color: var(--sky);
      }

      /* Capacity */
      .dr-capacity { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
      .dr-capacity-header { display: flex; align-items: center; gap: 6px; }
      .dr-capacity-icon { font-size: 11px; }
      .dr-capacity-label { font-size: 10px; color: var(--muted); font-weight: 500; }
      .dr-capacity-bar {
        height: 3px; background: rgba(84,199,248,0.08); border-radius: 2px;
        overflow: visible; position: relative;
      }
      .dr-capacity-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; position: relative; }
      .dr-capacity-glow {
        position: absolute; top: -2px; right: 0; width: 20px; height: 7px;
        background: radial-gradient(circle, rgba(84,199,248,0.9), transparent 70%);
        border-radius: 50%; pointer-events: none; transition: opacity 0.4s;
        filter: blur(2px);
      }

      .dr-join-btn {
        width: 100%; padding: 11px 16px;
        display: flex; align-items: center; justify-content: space-between;
        border-radius: 12px; border: 1px solid rgba(84,199,248,0.25);
        background: linear-gradient(135deg, rgba(84,199,248,0.1), rgba(59,158,218,0.05));
        color: var(--sky); font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
        cursor: pointer; transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
        position: relative; overflow: hidden;
      }
      .dr-join-btn::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.06), transparent 55%);
      }
      .dr-join-btn:hover:not(:disabled) {
        border-color: rgba(84,199,248,0.5);
        background: linear-gradient(135deg, rgba(84,199,248,0.18), rgba(59,158,218,0.10));
        box-shadow: 0 0 20px rgba(84,199,248,0.2), inset 0 0 20px rgba(84,199,248,0.03);
        transform: translateY(-1px);
      }
      .dr-join-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .dr-join-arrow {
        font-size: 16px; transition: transform 0.2s;
        background: linear-gradient(135deg, var(--sky), var(--sky2));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .dr-join-btn:hover .dr-join-arrow { transform: translateX(4px); }

      .dr-banned-msg {
        width: 100%; padding: 10px 16px; border-radius: 12px;
        border: 1px solid rgba(248,113,113,0.25); background: rgba(248,113,113,0.06);
        color: var(--danger); font-size: 12px; font-weight: 600; text-align: center;
      }

      /* ══════════════════════════════════════
         ROOM VIEW
      ══════════════════════════════════════ */
      .dr-room-view {
        position: relative; z-index: 1; display: flex; flex-direction: column;
        height: 100dvh; overflow: hidden; background: #020810;
      }

      .dr-room-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 18px;
        background: rgba(2,8,16,0.97);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--glass-b);
        gap: 10px; flex-wrap: wrap; flex-shrink: 0; z-index: 10;
      }
      .dr-room-meta { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; flex: 1; min-width: 0; }

      /* Mini logo dentro de la sala */
      .dr-room-logo-mini {
        width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
        background: linear-gradient(145deg, rgba(84,199,248,0.18), rgba(59,158,218,0.08));
        border: 1px solid rgba(84,199,248,0.28);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 10px rgba(84,199,248,0.2);
      }
      .dr-room-logo-t {
        font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 900;
        background: linear-gradient(135deg, var(--sky), var(--sky2));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }

      .dr-room-title-text {
        font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800;
        letter-spacing: -0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .dr-room-tags { display: flex; gap: 4px; flex-wrap: wrap; }
      .dr-room-header-right { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }

      .dr-room-count-pill {
        display: flex; align-items: center; gap: 6px;
        font-size: 11px; color: var(--muted); font-weight: 500;
        background: var(--glass); border: 1px solid var(--glass-b);
        border-radius: 100px; padding: 4px 12px;
      }
      .dr-room-count-dot {
        width: 5px; height: 5px; border-radius: 50%; background: var(--green);
        box-shadow: 0 0 6px rgba(74,222,128,0.8); animation: sky-pulse 2s infinite;
      }

      .dr-leave-btn {
        padding: 6px 14px; border-radius: 100px;
        border: 1px solid rgba(248,113,113,0.35); background: rgba(248,113,113,0.07);
        color: var(--danger); font-size: 11px; font-weight: 600; cursor: pointer;
        transition: all 0.2s; white-space: nowrap;
      }
      .dr-leave-btn:hover { background: rgba(248,113,113,0.16); }

      .dr-chat-toggle-btn {
        position: relative; padding: 6px 13px; border-radius: 100px;
        border: 1px solid var(--glass-b); background: var(--glass);
        color: var(--sky); font-size: 13px; cursor: pointer;
        transition: all 0.2s; white-space: nowrap;
      }
      .dr-chat-toggle-btn:hover { background: rgba(84,199,248,0.1); border-color: rgba(84,199,248,0.3); }
      .dr-chat-badge {
        position: absolute; top: -5px; right: -5px; background: var(--danger);
        color: #fff; font-size: 9px; font-weight: 700; border-radius: 100px; padding: 1px 5px;
        border: 1px solid var(--bg);
      }

      /* Room body */
      .dr-room-body { flex: 1; display: flex; min-height: 0; overflow: hidden; position: relative; }
      .dr-meet-grid {
        flex: 1; display: grid;
        grid-template-columns: repeat(var(--grid-cols,1), 1fr);
        gap: 4px; padding: 4px;
        align-content: center; overflow: hidden;
      }
      .dr-meet-grid.scrollable { align-content: start; overflow-y: auto; }
      .dr-meet-grid .dr-tile { aspect-ratio: 16/9; height: auto; }

      .dr-pinned-layout { flex: 1; display: flex; overflow: hidden; }
      .dr-pinned-stage { flex: 1; min-width: 0; position: relative; }
      .dr-pinned-stage .dr-tile { width: 100%; height: 100%; border-radius: 0; border: none; aspect-ratio: auto; }
      .dr-pinned-rail {
        width: 185px; flex-shrink: 0;
        background: rgba(2,8,16,0.85); border-left: 1px solid var(--glass-b);
        overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 6px;
      }
      .dr-pinned-rail .dr-tile { width: 100%; aspect-ratio: 16/9; }

      /* Tiles */
      .dr-tile {
        position: relative; background: #040c1a; border: 1px solid var(--glass-b);
        border-radius: 10px; overflow: hidden;
        display: flex; align-items: center; justify-content: center; transition: border-color 0.2s;
      }
      .dr-tile-pinned { border-color: rgba(84,199,248,0.6)!important; box-shadow: 0 0 24px rgba(84,199,248,0.18); }
      .dr-tile-self { border-color: rgba(167,139,250,0.4); }
      .dr-tile-video { width: 100%; height: 100%; object-fit: cover; display: block; }

      .dr-tile-avatar {
        position: absolute; inset: 0; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 8px;
        background: linear-gradient(135deg, rgba(84,199,248,0.06), rgba(59,158,218,0.03));
      }
      .dr-tile-avatar-ring {
        position: absolute; width: 72px; height: 72px; border-radius: 50%;
        border: 1px solid rgba(84,199,248,0.15);
        box-shadow: 0 0 30px rgba(84,199,248,0.08);
      }
      .dr-tile-initials {
        font-family: 'Syne', sans-serif; font-size: clamp(18px,3vw,36px); font-weight: 900;
        background: linear-gradient(135deg, var(--sky), #c8f2ff, var(--sky2));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        position: relative; z-index: 1;
      }
      .dr-tile-blocked-badge { position: absolute; bottom: 30px; right: 6px; font-size: 12px; }

      .dr-tile-info {
        position: absolute; bottom: 0; left: 0; right: 0; padding: 5px 8px;
        background: linear-gradient(to top, rgba(2,8,16,0.95) 0%, transparent 100%);
        display: flex; align-items: center; justify-content: space-between; gap: 4px;
      }
      .dr-tile-info-left { display: flex; align-items: center; gap: 3px; min-width: 0; flex: 1; }

      .dr-host-badge {
        font-size: 7px; font-weight: 700; letter-spacing: 1px; color: var(--sky);
        border: 1px solid rgba(84,199,248,0.3); background: rgba(84,199,248,0.1);
        border-radius: 4px; padding: 1px 5px; text-transform: uppercase; flex-shrink: 0;
      }
      .dr-streamer-badge {
        font-size: 7px; font-weight: 700; letter-spacing: 1px; color: var(--violet);
        border: 1px solid rgba(167,139,250,0.3); background: rgba(167,139,250,0.1);
        border-radius: 4px; padding: 1px 5px; text-transform: uppercase; flex-shrink: 0;
      }
      .dr-you-badge {
        font-size: 7px; font-weight: 700; letter-spacing: 1px; color: var(--green);
        border: 1px solid rgba(74,222,128,0.3); background: rgba(74,222,128,0.1);
        border-radius: 4px; padding: 1px 5px; text-transform: uppercase; flex-shrink: 0;
      }
      .dr-tile-name { font-size: 11px; color: var(--white); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
      .dr-tile-icons { display: flex; gap: 2px; flex-shrink: 0; }
      .dr-icon-on  { font-size: 11px; opacity: 1; }
      .dr-icon-off { font-size: 11px; opacity: 0.22; filter: grayscale(1); }

      .dr-pin-btn {
        position: absolute; top: 6px; left: 6px;
        background: rgba(2,8,16,0.85); border: 1px solid var(--glass-b);
        border-radius: 7px; font-size: 12px; padding: 2px 6px;
        cursor: pointer; opacity: 0; transition: opacity 0.2s; z-index: 5;
      }
      .dr-tile:hover .dr-pin-btn, .dr-pinned-stage:hover .dr-pin-btn { opacity: 1; }
      .dr-pin-btn.active { opacity: 1; border-color: var(--sky); background: rgba(84,199,248,0.1); }

      .dr-menu-wrap { position: absolute; top: 6px; right: 6px; z-index: 10; }
      .dr-menu-btn {
        background: rgba(2,8,16,0.9); border: 1px solid var(--glass-b);
        border-radius: 7px; color: var(--muted); font-size: 14px; padding: 1px 8px;
        cursor: pointer; line-height: 1.5; opacity: 0; transition: opacity 0.15s;
      }
      .dr-tile:hover .dr-menu-btn { opacity: 1; }
      .dr-menu-dropdown {
        position: absolute; top: 30px; right: 0; min-width: 172px;
        background: rgba(4,11,24,0.99); border: 1px solid var(--glass-b2);
        border-radius: 12px; overflow: hidden;
        box-shadow: 0 12px 40px rgba(0,0,0,0.75);
        animation: dr-fadein 0.15s ease; z-index: 20;
      }
      .dr-menu-dropdown button {
        display: block; width: 100%; text-align: left; padding: 10px 16px;
        font-size: 12px; font-weight: 500; color: var(--muted);
        background: transparent; border: none; cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .dr-menu-dropdown button:hover { background: rgba(84,199,248,0.08); color: var(--white); }
      .dr-menu-divider { height: 1px; background: var(--glass-b); margin: 3px 0; }
      .dr-menu-ban { color: var(--danger)!important; }
      .dr-menu-ban:hover { background: rgba(248,113,113,0.1)!important; }

      /* PiP */
      .dr-self-pip {
        position: fixed; bottom: 72px; right: 14px; width: 142px; height: 106px;
        border-radius: 14px; overflow: hidden;
        border: 1.5px solid rgba(167,139,250,0.45);
        box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(167,139,250,0.1);
        z-index: 30; background: rgba(4,12,28,0.95);
      }
      .dr-self-pip-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .dr-self-pip-avatar {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, rgba(84,199,248,0.06), rgba(59,158,218,0.03));
      }
      .dr-self-pip-initials {
        font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 900;
        background: linear-gradient(135deg, var(--sky), #c8f2ff, var(--sky2));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .dr-self-pip-info {
        position: absolute; bottom: 0; left: 0; right: 0; padding: 4px 7px;
        background: rgba(2,8,16,0.9); display: flex; align-items: center; justify-content: space-between;
      }
      .dr-self-pip-name { font-size: 10px; font-weight: 600; color: var(--white); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
      .dr-self-pip-icons { display: flex; gap: 2px; flex-shrink: 0; }
      .dr-self-pip-blocked { position: absolute; top: 4px; left: 4px; display: flex; gap: 3px; font-size: 12px; }

      /* Chat */
      .dr-chat {
        width: 275px; flex-shrink: 0;
        background: rgba(3,9,20,0.98); border-left: 1px solid var(--glass-b);
        display: flex; flex-direction: column;
      }
      .dr-chat-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 13px 16px; border-bottom: 1px solid var(--glass-b);
        font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
        color: var(--white); flex-shrink: 0;
      }
      .dr-chat-header-left { display: flex; align-items: center; gap: 8px; }
      .dr-chat-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sky); box-shadow: 0 0 6px var(--sky); animation: live-pulse 2s infinite; }
      .dr-chat-close { background: transparent; border: none; color: var(--muted); font-size: 16px; cursor: pointer; line-height: 1; padding: 2px; }
      .dr-chat-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
      .dr-chat-empty { font-size: 12px; color: var(--muted); text-align: center; padding: 24px 0; font-style: italic; }
      .dr-chat-msg { display: flex; flex-direction: column; gap: 2px; max-width: 92%; }
      .dr-chat-msg.own { align-self: flex-end; align-items: flex-end; }
      .dr-chat-author { font-size: 9px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; }
      .dr-chat-msg.own .dr-chat-author { color: rgba(84,199,248,0.6); }
      .dr-chat-text {
        font-size: 12px; color: var(--white); background: rgba(84,199,248,0.06);
        border: 1px solid var(--glass-b); border-radius: 10px; padding: 6px 10px;
        line-height: 1.5; word-break: break-word;
      }
      .dr-chat-msg.own .dr-chat-text { background: rgba(84,199,248,0.13); border-color: rgba(84,199,248,0.22); }
      .dr-chat-input-row { display: flex; gap: 7px; padding: 10px; border-top: 1px solid var(--glass-b); flex-shrink: 0; }
      .dr-chat-input {
        flex: 1; background: rgba(4,12,26,0.9); border: 1px solid var(--glass-b); border-radius: 10px;
        padding: 8px 10px; color: var(--white); font-size: 12px; outline: none; font-family: 'DM Sans', sans-serif;
      }
      .dr-chat-input:focus { border-color: rgba(84,199,248,0.35); }
      .dr-chat-send {
        padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(84,199,248,0.3);
        background: rgba(84,199,248,0.1); color: var(--sky); font-size: 14px; cursor: pointer; transition: all 0.15s;
      }
      .dr-chat-send:hover { background: rgba(84,199,248,0.2); }

      /* Toasts */
      .dr-toasts-stack {
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        z-index: 999; display: flex; flex-direction: column; gap: 7px;
        align-items: center; pointer-events: none;
      }
      .dr-toast {
        padding: 11px 22px; border-radius: 14px; font-size: 13px; font-weight: 600;
        color: var(--white); box-shadow: 0 8px 28px rgba(0,0,0,0.55);
        animation: toast-in 0.28s cubic-bezier(0.16,1,0.3,1);
        white-space: nowrap; border: 1px solid var(--glass-b2);
        backdrop-filter: blur(16px); font-family: 'Syne', sans-serif;
      }
      .dr-toast-info  { background: rgba(4,11,28,0.97); }
      .dr-toast-warn  { background: rgba(28,18,4,0.97); border-color: rgba(251,191,36,0.3); color: var(--warn); }
      .dr-toast-error { background: rgba(28,4,4,0.97); border-color: rgba(248,113,113,0.35); color: var(--danger); }
      @keyframes toast-in { from { opacity:0; transform:translateY(-12px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }

      /* Controls */
      .dr-controls {
        display: flex; align-items: center; justify-content: center; gap: 10px;
        padding: 11px 18px;
        background: rgba(2,8,16,0.98);
        border-top: 1px solid var(--glass-b); flex-shrink: 0; z-index: 10;
      }
      .dr-ctrl-btn {
        width: 48px; height: 48px; border-radius: 14px; border: 1px solid var(--glass-b);
        background: var(--glass); font-size: 20px; cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        display: flex; align-items: center; justify-content: center;
      }
      .dr-ctrl-btn.active { border-color: rgba(84,199,248,0.35); background: rgba(84,199,248,0.1); box-shadow: 0 0 14px rgba(84,199,248,0.15); }
      .dr-ctrl-btn.off { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.06); }
      .dr-ctrl-btn.neutral { border-color: var(--glass-b); }
      .dr-ctrl-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
      .dr-ctrl-host-badge, .dr-ctrl-blocked-warn {
        width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px;
      }
      .dr-ctrl-host-badge   { border: 1px solid rgba(251,191,36,0.3); background: rgba(251,191,36,0.07); }
      .dr-ctrl-blocked-warn { border: 1px solid rgba(248,113,113,0.3); background: rgba(248,113,113,0.07); }

      .dr-room-desc-bar {
        display: flex; align-items: center; gap: 8px; padding: 6px 18px;
        background: rgba(2,8,16,0.9); border-top: 1px solid var(--glass-b);
        font-size: 11px; color: var(--muted); flex-shrink: 0;
      }

      /* ══════════════════════════════════════
         MODAL CREAR SALA — PREMIUM
      ══════════════════════════════════════ */
      .crm-overlay {
        position: fixed; inset: 0; background: rgba(1,4,10,0.88);
        backdrop-filter: blur(18px); z-index: 200;
        display: flex; align-items: center; justify-content: center;
        padding: 20px; animation: crm-in 0.22s ease;
      }
      @keyframes crm-in { from { opacity:0; } to { opacity:1; } }

      .crm-sheet {
        width: 100%; max-width: 490px; max-height: 92dvh; overflow-y: auto;
        background: linear-gradient(165deg, rgba(6,14,30,0.99), rgba(3,9,20,0.99));
        border: 1px solid rgba(84,199,248,0.16); border-radius: 26px;
        box-shadow: 0 40px 100px rgba(0,0,0,0.65), 0 0 80px rgba(84,199,248,0.04);
        position: relative;
        animation: crm-up 0.32s cubic-bezier(0.34,1.4,0.64,1);
      }
      .crm-sheet::-webkit-scrollbar { display: none; }
      @keyframes crm-up {
        from { transform: translateY(32px) scale(0.96); opacity: 0; }
        to   { transform: translateY(0) scale(1); opacity: 1; }
      }

      /* Top beam */
      .crm-beam {
        position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(84,199,248,0.65), transparent);
      }
      .crm-beam-glow {
        position: absolute; top: -8px; left: 25%; right: 25%; height: 16px;
        background: radial-gradient(ellipse, rgba(84,199,248,0.18) 0%, transparent 70%);
        filter: blur(4px); pointer-events: none;
      }

      /* Logo row en modal */
      .crm-logo-row {
        display: flex; align-items: center; gap: 12px;
        padding: 22px 26px 0;
      }
      .crm-logo-icon {
        position: relative; width: 36px; height: 36px; flex-shrink: 0;
      }
      .crm-logo-icon-ring {
        position: absolute; inset: 0; border-radius: 10px;
        background: linear-gradient(145deg, rgba(84,199,248,0.2), rgba(59,158,218,0.06));
        border: 1px solid rgba(84,199,248,0.3);
        box-shadow: 0 0 16px rgba(84,199,248,0.2);
        animation: logo-halo 3.5s ease-in-out infinite alternate;
      }
      /* REEMPLAZAR CON img cuando tengas el logo real */
      .crm-logo-placeholder {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 900;
        background: linear-gradient(135deg, var(--sky), var(--sky2));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .crm-logo-wordmark {
        font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800;
        letter-spacing: -0.6px; color: var(--white); line-height: 1;
      }
      .crm-logo-wordmark em {
        font-style: normal;
        background: linear-gradient(120deg, var(--sky) 0%, #c8f2ff 55%, var(--sky2) 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .crm-logo-section {
        font-size: 9px; font-weight: 600; letter-spacing: 2px;
        text-transform: uppercase; color: rgba(84,199,248,0.4);
        margin-top: 3px; line-height: 1;
      }

      .crm-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 26px 18px; border-bottom: 1px solid rgba(84,199,248,0.07);
      }
      .crm-header-left { display: flex; align-items: center; gap: 14px; }
      .crm-crown-wrap {
        position: relative; width: 44px; height: 44px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
      }
      .crm-crown-ring {
        position: absolute; inset: 0; border-radius: 13px;
        background: linear-gradient(135deg, rgba(251,191,36,0.14), rgba(251,191,36,0.04));
        border: 1px solid rgba(251,191,36,0.28);
        box-shadow: 0 0 16px rgba(251,191,36,0.12);
      }
      .crm-crown-icon { font-size: 22px; position: relative; z-index: 1; }

      .crm-eyebrow {
        font-size: 10px; font-weight: 600; letter-spacing: 1.8px; text-transform: sans-serif;
        color: rgba(251,191,36,0.65); margin-bottom: 4px;
      }
      .crm-title {
        font-family: sans-serif; font-size: 22px; font-weight: 800;
        letter-spacing: -0.5px; color: #f0f6ff;
      }
      .crm-close {
        width: 34px; height: 34px; border-radius: 10px;
        border: 1px solid rgba(84,199,248,0.1); background: rgba(84,199,248,0.04);
        color: rgba(180,215,240,0.35); display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.18s;
      }
      .crm-close:hover { border-color: rgba(84,199,248,0.25); color: rgba(180,215,240,0.9); background: rgba(84,199,248,0.07); }

      .crm-body { padding: 22px 26px; display: flex; flex-direction: column; gap: 20px; }

      .crm-field { display: flex; flex-direction: column; gap: 8px; }
      .crm-label {
        font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: sans-serif;
        color: rgba(180,215,240,0.45); display: flex; align-items: center; gap: 6px;
      }
      .crm-required { color: rgba(84,199,248,0.7); font-size: 13px; }
      .crm-hint { font-weight: 400; letter-spacing: 0; text-transform: none; font-size: 11px; color: rgba(180,215,240,0.25); }

      .crm-input-wrap { position: relative; }
      .crm-input {
        width: 100%;
        background: rgba(3,10,22,0.8);
        border: 1px solid rgba(84,199,248,0.1);
        border-radius: 13px; padding: 12px 16px;
        color: #e8f2ff; font-size: 14px; font-family: 'DM Sans', sans-serif;
        outline: none; transition: border-color 0.2s, box-shadow 0.2s; resize: none;
      }
      .crm-input::placeholder { color: rgba(180,215,240,0.18); }
      .crm-input:focus {
        border-color: rgba(84,199,248,0.38);
        box-shadow: 0 0 0 3px rgba(84,199,248,0.07);
        background: rgba(84,199,248,0.03);
      }
      .crm-textarea { min-height: 80px; }
      .crm-char-count {
        position: absolute; bottom: 10px; right: 13px;
        font-size: 10px; color: rgba(180,215,240,0.18); pointer-events: none;
      }
      .crm-char-count-ta { bottom: 10px; }

      .crm-tags-grid { display: flex; flex-wrap: wrap; gap: 7px; }
      .crm-tag {
        display: flex; align-items: center; gap: 5px;
        font-size: 12px; font-weight: 500; padding: 7px 14px; border-radius: 100px;
        border: 1px solid rgba(84,199,248,0.09); background: rgba(84,199,248,0.03);
        color: rgba(180,215,240,0.45); cursor: pointer;
        transition: all 0.18s cubic-bezier(0.16,1,0.3,1); white-space: nowrap;
      }
      .crm-tag:hover { border-color: rgba(84,199,248,0.22); color: rgba(180,215,240,0.82); }
      .crm-tag-on {
        border-color: rgba(84,199,248,0.5)!important;
        background: rgba(84,199,248,0.11)!important;
        color: #54c7f8!important;
        box-shadow: 0 0 12px rgba(84,199,248,0.12);
      }
      .crm-tag-check { font-size: 10px; font-weight: 800; color: var(--sky); }

      .crm-capacity-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
      .crm-number-wrap {
        display: flex; align-items: center;
        background: rgba(3,10,22,0.8); border: 1px solid rgba(84,199,248,0.1);
        border-radius: 13px; overflow: hidden;
      }
      .crm-num-btn {
        width: 42px; height: 46px; background: rgba(84,199,248,0.04); border: none;
        color: rgba(180,215,240,0.45); font-size: 18px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; transition: all 0.15s;
      }
      .crm-num-btn:hover { background: rgba(84,199,248,0.1); color: var(--sky); }
      .crm-number-input {
        width: 74px; height: 46px; background: transparent; border: none;
        border-left: 1px solid rgba(84,199,248,0.08); border-right: 1px solid rgba(84,199,248,0.08);
        color: #e8f2ff; font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700;
        text-align: center; outline: none; -moz-appearance: textfield;
      }
      .crm-number-input::-webkit-outer-spin-button, .crm-number-input::-webkit-inner-spin-button { -webkit-appearance: none; }

      .crm-capacity-presets { display: flex; gap: 6px; flex-wrap: wrap; }
      .crm-preset {
        font-size: 12px; font-weight: 500; padding: 6px 14px; border-radius: 100px;
        border: 1px solid rgba(84,199,248,0.09); background: rgba(84,199,248,0.02);
        color: rgba(180,215,240,0.4); cursor: pointer; transition: all 0.15s;
      }
      .crm-preset:hover { border-color: rgba(84,199,248,0.2); color: rgba(180,215,240,0.75); }
      .crm-preset-on {
        border-color: rgba(84,199,248,0.5)!important; background: rgba(84,199,248,0.1)!important;
        color: var(--sky)!important;
      }

      .crm-error {
        display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--danger);
        background: rgba(248,113,113,0.05); border: 1px solid rgba(248,113,113,0.18);
        border-radius: 12px; padding: 11px 15px;
      }

      .crm-footer {
        display: flex; justify-content: flex-end; gap: 10px;
        padding: 14px 26px 24px; border-top: 1px solid rgba(84,199,248,0.07);
      }
      .crm-btn-cancel {
        padding: 12px 24px; border-radius: 13px;
        border: 1px solid rgba(84,199,248,0.1); background: transparent;
        color: rgba(180,215,240,0.38); font-size: 13px; cursor: pointer;
        transition: all 0.18s; font-family: 'DM Sans', sans-serif;
      }
      .crm-btn-cancel:hover { border-color: rgba(84,199,248,0.22); color: rgba(180,215,240,0.75); }

      .crm-btn-create {
        display: flex; align-items: center; gap: 8px; padding: 12px 26px; border-radius: 13px;
        border: 1px solid rgba(84,199,248,0.38);
        background: linear-gradient(135deg, rgba(84,199,248,0.16), rgba(59,158,218,0.08));
        color: var(--sky); font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
        cursor: pointer; transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
        position: relative; overflow: hidden;
      }
      .crm-btn-create::before {
        content: ''; position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent 55%);
      }
      .crm-btn-create:hover:not(:disabled) {
        border-color: rgba(84,199,248,0.65);
        background: linear-gradient(135deg, rgba(84,199,248,0.24), rgba(59,158,218,0.14));
        box-shadow: 0 0 28px rgba(84,199,248,0.22), 0 4px 16px rgba(84,199,248,0.12);
        transform: translateY(-1px);
      }
      .crm-btn-create:disabled { opacity: 0.42; cursor: not-allowed; }
      .crm-arrow { font-size: 16px; transition: transform 0.22s; }
      .crm-btn-create:hover .crm-arrow { transform: translateX(4px); }

      .crm-loading-dots { display: flex; gap: 4px; align-items: center; }
      .crm-loading-dots span {
        width: 5px; height: 5px; border-radius: 50%; background: var(--sky);
        animation: crm-dot 1.2s ease-in-out infinite;
      }
      .crm-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
      .crm-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes crm-dot {
        0%,80%,100% { opacity: 0.25; transform: scale(0.8); }
        40%         { opacity: 1; transform: scale(1); }
      }

      /* ── Scrollbars ── */
      ::-webkit-scrollbar { width: 3px; height: 3px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(84,199,248,0.18); border-radius: 2px; }

      @keyframes dr-fadein { from { opacity:0; } to { opacity:1; } }

      /* ── Responsive ── */
      @media (max-width: 900px) {
        .dr-header { padding: 12px 18px; }
        .dr-header-center { display: none; }
        .dr-filters { padding: 12px 18px 6px; }
        .dr-main { padding: 12px 18px 30px; }
      }
      @media (max-width: 560px) {
        .dr-logo-wordmark { font-size: 16px; }
        .dr-logo-section-tag { display: none; }
        .dr-create-btn { padding: 8px 14px; font-size: 12px; }
        .dr-search { max-width: 100%; }
        .crm-sheet { border-radius: 20px; }
        .crm-logo-row { padding: 18px 20px 0; }
        .crm-header { padding: 14px 20px 16px; }
        .crm-body { padding: 18px 20px; }
        .crm-footer { padding: 12px 20px 20px; }
      }
    `}</style>
  );
}