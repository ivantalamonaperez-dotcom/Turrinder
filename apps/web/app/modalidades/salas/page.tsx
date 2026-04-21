"use client";

/**
 * DebateRoomsPage.tsx — v3
 *
 * NUEVO:
 *  • RoomCard: STREAMER en violeta + nombre real (no "Anónimo")
 *  • participant_count en tiempo real via Supabase Presence (sin F5)
 *  • Controles de sala: solo emojis 🎙️ 📹 (sin texto)
 *  • 👥 count en tiempo real dentro de sala
 *  • Viewer ve a todos los conectados
 *  • Viewer se ve a sí mismo (self-view flotante esquina)
 *  • Menú ⋯ por tile (solo host): Mutear / Sacar cámara / Expulsar / Banear
 *  • Toast de notificación al viewer cuando es moderado
 *  • Pin / Unpin para fijar cualquier tile grande
 *  • Chat en tiempo real desplegable (Supabase Realtime)
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
  isMuted: boolean; isCamOff: boolean;
  isHost: boolean; stream?: MediaStream;
}

interface ChatMessage {
  id: string; userId: string; userName: string; text: string; ts: number;
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

// ─── useDebateMedia ───────────────────────────────────────────────

function useDebateMedia(
  roomId: string | null,
  isHost: boolean,
  userId: string,
  userName: string,
  userRole: "streamer" | "viewer",
  onToast: (msg: string) => void,
) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"idle"|"connecting"|"connected">("idle");
  const [presenceCount, setPresenceCount] = useState(1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const localRef = useRef<MediaStream | null>(null);
  const peerConns = useRef<Map<string, RTCPeerConnection>>(new Map());
  const sigCh = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const banned = useRef<Set<string>>(new Set());

  const createPC = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    localRef.current?.getTracks().forEach(t => pc.addTrack(t, localRef.current!));

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !sigCh.current) return;
      sigCh.current.send({ type:"broadcast", event:"ice", payload:{ from:userId, to:peerId, candidate:candidate.toJSON() } });
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      setParticipants(prev => {
        const ex = prev.find(p => p.id === peerId);
        if (ex) return prev.map(p => p.id === peerId ? { ...p, stream, hasVideo:true, hasAudio:true } : p);
        return [...prev, { id:peerId, name:peerId, role:"viewer", hasVideo:true, hasAudio:true, isMuted:false, isCamOff:false, isHost:false, stream }];
      });
      setConnectionStatus("connected");
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
        if (!isHost || banned.current.has(payload.from)) return;
        setParticipants(prev => {
          const ex = prev.find(p => p.id === payload.from);
          if (ex) return prev.map(p => p.id === payload.from ? { ...p, name:payload.name, role:payload.role } : p);
          return [...prev, { id:payload.from, name:payload.name, role:payload.role??"viewer", hasVideo:false, hasAudio:false, isMuted:false, isCamOff:false, isHost:false }];
        });
        const pc = createPC(payload.from);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({ type:"broadcast", event:"offer", payload:{ from:userId, to:payload.from, sdp:offer } });
      })
      .on("broadcast", { event:"offer" }, async ({ payload }) => {
        if (isHost || payload.to !== userId) return;
        setConnectionStatus("connecting");
        setParticipants(prev => {
          if (prev.find(p => p.id === payload.from)) return prev;
          return [...prev, { id:payload.from, name:"Host", role:"streamer", hasVideo:false, hasAudio:false, isMuted:false, isCamOff:false, isHost:true }];
        });
        const pc = createPC(payload.from);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({ type:"broadcast", event:"answer", payload:{ from:userId, to:payload.from, sdp:answer } });
      })
      .on("broadcast", { event:"answer" }, async ({ payload }) => {
        if (!isHost || payload.to !== userId) return;
        const pc = peerConns.current.get(payload.from);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      })
      .on("broadcast", { event:"ice" }, async ({ payload }) => {
        if (payload.to !== userId) return;
        const pc = peerConns.current.get(payload.from);
        if (pc && payload.candidate) { try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {} }
      })
      .on("broadcast", { event:"moderate" }, ({ payload }) => {
        if (payload.to !== userId) return;
        if (payload.action === "mute") {
          const t = localRef.current?.getAudioTracks()[0];
          if (t) { t.enabled = false; setAudioOn(false); }
          onToast("🔇 El host silenció tu micrófono");
        }
        if (payload.action === "camoff") {
          const t = localRef.current?.getVideoTracks()[0];
          if (t) { t.enabled = false; setVideoOn(false); }
          onToast("📵 El host apagó tu cámara");
        }
        if (payload.action === "kick") { onToast("🚪 Fuiste expulsado de la sala"); setTimeout(() => window.location.reload(), 2200); }
        if (payload.action === "ban")  { onToast("🚫 Fuiste baneado de la sala");   setTimeout(() => window.location.reload(), 2200); }
      })
      .on("broadcast", { event:"room-closed" }, () => {
        if (!isHost) { onToast("🔴 El host cerró la sala"); setTimeout(() => window.location.reload(), 2200); }
      })
      .on("broadcast", { event:"chat" }, ({ payload }) => {
        setChatMessages(prev => [...prev, payload as ChatMessage].slice(-200));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId, name:userName, role:userRole });
          if (!isHost) {
            channel.send({ type:"broadcast", event:"join", payload:{ from:userId, name:userName, role:userRole } });
          }
        }
      });

    sigCh.current = channel;
  }, [roomId, isHost, userId, userName, userRole, createPC, onToast]);

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
    const t = localRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setVideoOn(t.enabled); }
  }, []);

  const toggleAudio = useCallback(() => {
    const t = localRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setAudioOn(t.enabled); }
  }, []);

  const moderate = useCallback((id: string, action: string) => {
    sigCh.current?.send({ type:"broadcast", event:"moderate", payload:{ to:id, action } });
  }, []);

  const muteParticipant  = useCallback((id: string) => { setParticipants(prev => prev.map(p => p.id===id?{...p,isMuted:true}:p)); moderate(id,"mute"); }, [moderate]);
  const camOffParticipant= useCallback((id: string) => { setParticipants(prev => prev.map(p => p.id===id?{...p,isCamOff:true}:p)); moderate(id,"camoff"); }, [moderate]);
  const kickParticipant  = useCallback((id: string) => { setParticipants(prev => prev.filter(p => p.id!==id)); moderate(id,"kick"); peerConns.current.get(id)?.close(); peerConns.current.delete(id); }, [moderate]);
  const banParticipant   = useCallback((id: string) => { banned.current.add(id); setParticipants(prev => prev.filter(p => p.id!==id)); moderate(id,"ban"); peerConns.current.get(id)?.close(); peerConns.current.delete(id); }, [moderate]);

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
    return () => {
      stopMedia();
      peerConns.current.forEach(pc => pc.close()); peerConns.current.clear();
      if (sigCh.current) supabase.removeChannel(sigCh.current);
    };
  }, [roomId]);

  return {
    participants, localStream, videoOn, audioOn, connectionStatus, presenceCount,
    chatMessages, stopMedia, toggleVideo, toggleAudio,
    muteParticipant, camOffParticipant, kickParticipant, banParticipant,
    notifyRoomClosed, sendChat,
  };
}

// ─── Toast ────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  return <div className="dr-toast">{message}</div>;
}

// ─── TagBadge ─────────────────────────────────────────────────────

function TagBadge({ tag, selected, onClick }: { tag: Tag; selected?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className={`dr-tag ${selected?"selected":""}`} style={{ cursor: onClick?"pointer":"default" }}>{tag}</button>;
}

// ─── RoomCard ─────────────────────────────────────────────────────

function RoomCard({ room, onJoin }: { room: Room; onJoin: (r: Room) => void }) {
  const pct = Math.round((room.participant_count / room.max_people) * 100);
  const full = room.participant_count >= room.max_people;

  return (
    <div className="dr-card" onClick={() => !full && onJoin(room)}>
      <div className="dr-card-glow" />
      <div className="dr-card-body">
        <div className="dr-card-top">
          <span className="dr-live-dot" /><span className="dr-live-label">EN VIVO</span>
          <div className="dr-card-host-info">
            <span className="dr-card-role-badge">STREAMER</span>
            <span className="dr-card-host-name">{room.host_name}</span>
          </div>
        </div>
        <h3 className="dr-card-title">{room.title}</h3>
        {room.description && <p className="dr-card-desc">{room.description}</p>}
        <div className="dr-card-tags">{room.tags.map(t => <TagBadge key={t} tag={t} />)}</div>
      </div>
      <div className="dr-card-footer">
        <div className="dr-capacity">
          <div className="dr-capacity-bar">
            <div className="dr-capacity-fill" style={{ width:`${pct}%`, background: full?"#f87171":"var(--sky)" }} />
          </div>
          <span className="dr-capacity-label">{room.participant_count}/{room.max_people} {full?"· LLENA":""}</span>
        </div>
        {!full && <button className="dr-join-btn">Unirse →</button>}
      </div>
    </div>
  );
}

// ─── VideoTile ────────────────────────────────────────────────────

function VideoTile({ participant, isLocalSelf, isPinned, canModerate, size, onPin, onMute, onCamOff, onKick, onBan }: {
  participant: Participant; isLocalSelf?: boolean; isPinned?: boolean;
  canModerate?: boolean; size?: "sm"|"lg";
  onPin?: () => void; onMute?: () => void; onCamOff?: () => void; onKick?: () => void; onBan?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (videoRef.current && participant.stream) videoRef.current.srcObject = participant.stream;
  }, [participant.stream]);

  const initials = participant.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();

  return (
    <div className={`dr-tile ${size==="lg"?"dr-tile-lg":"dr-tile-sm"} ${isPinned?"dr-tile-pinned":""} ${isLocalSelf?"dr-tile-self":""}`}>
      {participant.hasVideo && !participant.isCamOff && participant.stream
        ? <video ref={videoRef} autoPlay playsInline muted={isLocalSelf||participant.isHost} className="dr-tile-video" />
        : <div className="dr-tile-avatar"><span>{initials}</span></div>
      }
      <div className="dr-tile-info">
        <div className="dr-tile-info-left">
          {participant.isHost && <span className="dr-host-badge">HOST</span>}
          {participant.role==="streamer" && !participant.isHost && <span className="dr-streamer-badge">STR</span>}
          <span className="dr-tile-name">{isLocalSelf ? "Tú" : participant.name}</span>
        </div>
        <div className="dr-tile-media-icons">
          <span className={participant.isMuted||!participant.hasAudio?"dr-icon-off":"dr-icon-on"}>🎙️</span>
          <span className={participant.isCamOff||!participant.hasVideo?"dr-icon-off":"dr-icon-on"}>📹</span>
        </div>
      </div>
      {/* Pin */}
      <button className={`dr-pin-btn ${isPinned?"pinned":""}`} onClick={onPin} title={isPinned?"Desfijar":"Fijar"}>
        {isPinned?"📌":"📍"}
      </button>
      {/* Menú 3 puntos — solo host */}
      {canModerate && !participant.isHost && !isLocalSelf && (
        <div className="dr-menu-wrap">
          <button className="dr-menu-btn" onClick={() => setMenuOpen(o=>!o)}>⋯</button>
          {menuOpen && (
            <div className="dr-menu-dropdown" onMouseLeave={() => setMenuOpen(false)}>
              <button onClick={() => { onMute?.(); setMenuOpen(false); }}>🔇 Mutear</button>
              <button onClick={() => { onCamOff?.(); setMenuOpen(false); }}>📵 Sacar cámara</button>
              <button onClick={() => { onKick?.(); setMenuOpen(false); }}>🚪 Expulsar</button>
              <button className="dr-menu-ban" onClick={() => { onBan?.(); setMenuOpen(false); }}>🚫 Banear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────

function ChatPanel({ messages, onSend, onClose, userId }: {
  messages: ChatMessage[]; onSend: (t:string)=>void; onClose: ()=>void; userId: string;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const handleSend = () => {
    const t = input.trim(); if (!t) return;
    onSend(t); setInput("");
  };

  return (
    <div className="dr-chat">
      <div className="dr-chat-header"><span>💬 Chat en vivo</span><button onClick={onClose} className="dr-chat-close">✕</button></div>
      <div className="dr-chat-messages">
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
  hostId:string; hostName:string; hostRole:string; onClose:()=>void; onCreated:(r:Room)=>void;
}) {
  const { createRoom } = useRooms();
  const [title,setTitle] = useState(""); const [description,setDescription]=useState("");
  const [tags,setTags]=useState<Tag[]>([]); const [maxPeople,setMaxPeople]=useState<number|"">(50);
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");

  const toggleTag=(tag:Tag)=>setTags(prev=>prev.includes(tag)?prev.filter(t=>t!==tag):[...prev,tag].slice(0,4));

  const handleCreate=async()=>{
    if(!title.trim()){setError("El título es obligatorio");return;}
    if(tags.length===0){setError("Elegí al menos un tema");return;}
    if(!maxPeople||maxPeople<2){setError("La capacidad mínima es 2");return;}
    setError("");setLoading(true);
    try{
      const room=await createRoom({title:title.trim(),description:description.trim(),tags,max_people:maxPeople as number,host_id:hostId,host_name:hostName,host_role:hostRole});
      onCreated(room);
    }catch(e:any){setError(e.message??"Error al crear la sala");}
    finally{setLoading(false);}
  };

  return(
    <div className="crm-overlay" onClick={onClose}>
      <div className="crm-sheet" onClick={e=>e.stopPropagation()}>
        <div className="crm-topline"/>
        <div className="crm-header">
          <div className="crm-header-left">
            <div className="crm-crown">👑</div>
            <div><p className="crm-eyebrow">Streamer · Nueva sala</p><h2 className="crm-title">Crear debate</h2></div>
          </div>
          <button className="crm-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        </div>
        <div className="crm-body">
          <div className="crm-field">
            <label className="crm-label">Título <span className="crm-required">*</span></label>
            <div className="crm-input-wrap">
              <input className="crm-input" placeholder="¿De qué van a debatir?" value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} autoFocus/>
              <span className="crm-char-count">{title.length}/80</span>
            </div>
          </div>
          <div className="crm-field">
            <label className="crm-label">Descripción</label>
            <div className="crm-input-wrap">
              <textarea className="crm-input crm-textarea" placeholder="Contexto, reglas..." value={description} onChange={e=>setDescription(e.target.value)} maxLength={280} rows={3}/>
              <span className="crm-char-count crm-char-count-ta">{description.length}/280</span>
            </div>
          </div>
          <div className="crm-field">
            <label className="crm-label">Tema <span className="crm-required">*</span><span className="crm-hint">hasta 4</span></label>
            <div className="crm-tags-grid">
              {ALL_TAGS.map(tag=>(
                <button key={tag} type="button" className={`crm-tag ${tags.includes(tag)?"crm-tag-on":""}`} onClick={()=>toggleTag(tag)}>
                  {tags.includes(tag)&&<span className="crm-tag-check">✓</span>}{tag}
                </button>
              ))}
            </div>
          </div>
          <div className="crm-field">
            <label className="crm-label">Capacidad <span className="crm-hint">2–500</span></label>
            <div className="crm-capacity-row">
              <div className="crm-number-wrap">
                <button className="crm-num-btn" type="button" onClick={()=>setMaxPeople(p=>Math.max(2,(p||2)-1))}>−</button>
                <input className="crm-number-input" type="number" min={2} max={500} value={maxPeople} onChange={e=>{const n=parseInt(e.target.value,10);if(!isNaN(n))setMaxPeople(Math.min(500,Math.max(2,n)));}}/>
                <button className="crm-num-btn" type="button" onClick={()=>setMaxPeople(p=>Math.min(500,(p||2)+1))}>+</button>
              </div>
              <div className="crm-capacity-presets">
                {[10,25,50,100].map(n=><button key={n} type="button" className={`crm-preset ${maxPeople===n?"crm-preset-on":""}`} onClick={()=>setMaxPeople(n)}>{n}</button>)}
              </div>
            </div>
          </div>
          {error&&<div className="crm-error"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#f87171" strokeWidth="1.5"/><path d="M7 4v3.5M7 9.5v.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/></svg>{error}</div>}
        </div>
        <div className="crm-footer">
          <button className="crm-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="crm-btn-create" onClick={handleCreate} disabled={loading}>
            {loading?<span className="crm-loading-dots"><span/><span/><span/></span>:<>Iniciar sala <span className="crm-arrow">→</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RoomView ─────────────────────────────────────────────────────

function RoomView({ room, currentUserId, currentUserName, currentUserRole, onLeave, closeRoom, setCount }: {
  room:Room; currentUserId:string; currentUserName:string; currentUserRole:"streamer"|"viewer";
  onLeave:()=>void; closeRoom:(id:string)=>Promise<void>; setCount:(id:string,n:number)=>Promise<void>;
}) {
  const isHost = room.host_id === currentUserId;
  const [toast, setToast] = useState<string|null>(null);
  const [pinnedId, setPinnedId] = useState<string|null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const onToast = useCallback((msg:string)=>setToast(msg),[]);

  const {
    participants, localStream, videoOn, audioOn, presenceCount,
    chatMessages, stopMedia, toggleVideo, toggleAudio,
    muteParticipant, camOffParticipant, kickParticipant, banParticipant,
    notifyRoomClosed, sendChat,
  } = useDebateMedia(room.id, isHost, currentUserId, currentUserName, currentUserRole, onToast);

  const localVideoRef   = useRef<HTMLVideoElement>(null);
  const selfViewRef     = useRef<HTMLVideoElement>(null);

  // presenceCount → actualizar BD en tiempo real
  useEffect(() => { setCount(room.id, presenceCount); }, [presenceCount]);

  // beforeunload → cerrar sala si host
  useEffect(() => {
    if (!isHost) return;
    const h = () => navigator.sendBeacon("/api/close-room", JSON.stringify({ roomId:room.id }));
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isHost, room.id]);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
    if (selfViewRef.current  && localStream) selfViewRef.current.srcObject  = localStream;
  }, [localStream]);

  const handleLeaveOrClose = useCallback(async () => {
    if (isHost) { notifyRoomClosed(); await closeRoom(room.id); }
    stopMedia(); onLeave();
  }, [isHost, room.id, closeRoom, stopMedia, onLeave, notifyRoomClosed]);

  const togglePin = useCallback((id:string)=>setPinnedId(prev=>prev===id?null:id),[]);

  // Determinar qué mostrar en stage
  const pinnedParticipant = pinnedId
    ? (pinnedId===currentUserId ? null : participants.find(p=>p.id===pinnedId))
    : null;
  const pinnedIsSelf = pinnedId === currentUserId;

  const hostParticipant = participants.find(p=>p.isHost);
  const otherParticipants = participants.filter(p=>p.id!==pinnedId);

  const gridCols = useMemo(()=>{
    const n=Math.min(otherParticipants.length,12);
    if(n<=1)return 1; if(n<=4)return 2; if(n<=9)return 3; return 4;
  },[otherParticipants.length]);

  return (
    <div className="dr-room-view">
      {toast && <Toast message={toast} onDone={()=>setToast(null)}/>}

      {/* Header */}
      <div className="dr-room-header">
        <div className="dr-room-meta">
          <span className="dr-live-dot"/>
          <span className="dr-room-title-text">{room.title}</span>
          <div className="dr-room-tags">{room.tags.map(t=><TagBadge key={t} tag={t}/>)}</div>
        </div>
        <div className="dr-room-header-right">
          <span className="dr-room-count">👥 {presenceCount}/{room.max_people}</span>
          <button className="dr-chat-toggle-btn" onClick={()=>setChatOpen(o=>!o)}>
            💬{chatMessages.length>0&&<span className="dr-chat-badge">{chatMessages.length}</span>}
          </button>
          <button className="dr-leave-btn" onClick={handleLeaveOrClose}>{isHost?"Cerrar sala":"Salir"}</button>
        </div>
      </div>

      {/* Body */}
      <div className="dr-room-body">
        {/* Stage */}
        <div className="dr-stage">
          {/* Pinned self */}
          {pinnedIsSelf ? (
            <div className="dr-stage-self">
              <video ref={localVideoRef} autoPlay playsInline muted className="dr-stage-video"/>
              <div className="dr-stage-label">
                <span className="dr-host-badge">TÚ</span>
                <span>{currentUserName}</span>
                <button className="dr-unpin-btn" onClick={()=>setPinnedId(null)}>📌 Desfijar</button>
              </div>
            </div>
          ) : pinnedParticipant ? (
            <VideoTile participant={pinnedParticipant} isPinned size="lg"
              canModerate={isHost} onPin={()=>togglePin(pinnedParticipant.id)}
              onMute={()=>muteParticipant(pinnedParticipant.id)}
              onCamOff={()=>camOffParticipant(pinnedParticipant.id)}
              onKick={()=>kickParticipant(pinnedParticipant.id)}
              onBan={()=>banParticipant(pinnedParticipant.id)}
            />
          ) : isHost ? (
            <div className="dr-stage-self">
              <video ref={localVideoRef} autoPlay playsInline muted className="dr-stage-video"/>
              <div className="dr-stage-label">
                <span className="dr-host-badge">HOST · TÚ</span>
                <span>{currentUserName}</span>
              </div>
              <button className="dr-pin-btn" onClick={()=>togglePin(currentUserId)} title="Fijar">📍</button>
            </div>
          ) : hostParticipant ? (
            <VideoTile participant={hostParticipant} size="lg" onPin={()=>togglePin(hostParticipant.id)} canModerate={false}/>
          ) : (
            <div className="dr-stage-empty">
              <div className="dr-spinner" style={{marginBottom:12}}/>
              <span>Conectando con el host...</span>
              <small style={{color:"var(--muted)",fontSize:11,marginTop:6}}>Asegurate de que el host tenga cámara activa</small>
            </div>
          )}

          {room.description && <div className="dr-stage-desc"><span>💬</span><p>{room.description}</p></div>}
        </div>

        {/* Grid lateral de participantes */}
        {otherParticipants.length > 0 && (
          <div className="dr-grid-section">
            <span className="dr-section-label">Participantes ({otherParticipants.length})</span>
            <div className="dr-participants-grid">
              {otherParticipants.slice(0,12).map(p=>(
                <VideoTile key={p.id} participant={p}
                  isPinned={pinnedId===p.id}
                  canModerate={isHost}
                  onPin={()=>togglePin(p.id)}
                  onMute={()=>muteParticipant(p.id)}
                  onCamOff={()=>camOffParticipant(p.id)}
                  onKick={()=>kickParticipant(p.id)}
                  onBan={()=>banParticipant(p.id)}
                />
              ))}
              {otherParticipants.length>12&&<div className="dr-tile dr-tile-sm dr-tile-overflow">+{otherParticipants.length-12} más</div>}
            </div>
          </div>
        )}

        {/* Chat */}
        {chatOpen && <ChatPanel messages={chatMessages} onSend={sendChat} onClose={()=>setChatOpen(false)} userId={currentUserId}/>}
      </div>

      {/* Self-view flotante (solo viewer) */}
      {!isHost && (
        <div className="dr-self-view">
          <video ref={selfViewRef} autoPlay playsInline muted className="dr-self-video"/>
          <div className="dr-self-label">
            <span style={{fontSize:10}}>{audioOn?"🎙️":"🔇"}</span>
            <span style={{fontSize:10}}>{videoOn?"📹":"📵"}</span>
            <button className="dr-self-pin" onClick={()=>togglePin(currentUserId)} title="Fijar">📍</button>
          </div>
        </div>
      )}

      {/* Controles — solo emojis */}
      <div className="dr-controls">
        <button className={`dr-ctrl-btn ${audioOn?"active":"off"}`} onClick={toggleAudio} title={audioOn?"Silenciar":"Activar mic"}>
          {audioOn?"🎙️":"🔇"}
        </button>
        <button className={`dr-ctrl-btn ${videoOn?"active":"off"}`} onClick={toggleVideo} title={videoOn?"Apagar cam":"Encender cam"}>
          {videoOn?"📹":"📵"}
        </button>
        <button className="dr-ctrl-btn neutral" onClick={()=>setChatOpen(o=>!o)} title="Chat">💬</button>
        {isHost&&<div className="dr-ctrl-host-badge">👑</div>}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────

export default function DebateRoomsPage() {
  const router = useRouter();
  const profile = useProfile();

  const userId:   string = (profile as any)?.id   ?? "";
  const userName: string = (profile as any)?.name ?? "Anónimo";
  const userRole: "streamer"|"viewer" = (profile as any)?.role ?? "viewer";
  const isStreamer = userRole === "streamer";

  const { rooms, loading, closeRoom, setCount } = useRooms();
  const [activeRoom, setActiveRoom] = useState<Room|null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterTag, setFilterTag] = useState<Tag|null>(null);
  const [search, setSearch] = useState("");

  useEffect(()=>{ supabase.auth.getUser().then(({data})=>{ if(!data.user) router.push("/"); }); },[router]);

  const filteredRooms = useMemo(()=>rooms.filter(r=>{
    const matchTag  = !filterTag || r.tags.includes(filterTag);
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  }),[rooms,filterTag,search]);

  if (activeRoom) {
    return (<><GlobalStyles/><div className="dr-root"><div className="dr-aurora"/><div className="dr-flag"/>
      <RoomView room={activeRoom} currentUserId={userId} currentUserName={userName} currentUserRole={userRole}
        onLeave={()=>setActiveRoom(null)} closeRoom={closeRoom} setCount={setCount}/>
    </div></>);
  }

  return (
    <><GlobalStyles/>
      {showCreate&&isStreamer&&(
        <CreateRoomModal hostId={userId} hostName={userName} hostRole={userRole}
          onClose={()=>setShowCreate(false)}
          onCreated={room=>{setShowCreate(false);setActiveRoom(room);}}/>
      )}
      <div className="dr-root">
        <div className="dr-aurora"/><div className="dr-flag"/>
        <header className="dr-header">
          <div className="dr-logo-wrap">
            <span className="dr-logo-t">Turr</span>
            <span className="dr-logo-inder">inder</span>
            <span className="dr-logo-sub">Debates</span>
          </div>
          <div className="dr-header-right">
            <div className="dr-role-badge" data-role={userRole}>{userRole==="streamer"?"👑 Streamer":"👁 Viewer"}</div>
            {isStreamer&&<button className="dr-create-btn" onClick={()=>setShowCreate(true)}>+ Crear sala</button>}
          </div>
        </header>
        <div className="dr-filters">
          <input className="dr-search" placeholder="Buscar debate..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="dr-filter-tags">
            <button className={`dr-filter-tag ${!filterTag?"active":""}`} onClick={()=>setFilterTag(null)}>Todos</button>
            {ALL_TAGS.map(tag=><button key={tag} className={`dr-filter-tag ${filterTag===tag?"active":""}`} onClick={()=>setFilterTag(prev=>prev===tag?null:tag)}>{tag}</button>)}
          </div>
        </div>
        <main className="dr-main">
          {loading?(
            <div className="dr-loading"><div className="dr-spinner"/><span>Cargando salas...</span></div>
          ):filteredRooms.length===0?(
            <div className="dr-empty">
              <div className="dr-empty-icon">🎙️</div>
              <h3>No hay debates activos</h3>
              <p>{isStreamer?"¡Creá la primera sala!":"Esperá a que un Streamer cree una sala."}</p>
            </div>
          ):(
            <div className="dr-rooms-grid">
              {filteredRooms.map(room=><RoomCard key={room.id} room={room} onJoin={setActiveRoom}/>)}
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
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Clash+Display:wght@500;600;700&display=swap');
      *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

      .dr-root {
        --sky:#54c7f8; --sky2:#3b9eda; --white:#f5f8ff; --bg:#030a14;
        --glass:rgba(84,199,248,0.04); --glass-b:rgba(84,199,248,0.12); --glass-b2:rgba(84,199,248,0.22);
        --muted:rgba(180,215,240,0.45); --danger:#f87171; --warn:#fbbf24; --violet:#a78bfa;
        min-height:100dvh; display:flex; flex-direction:column;
        background:var(--bg); position:relative; font-family:'Inter',sans-serif;
        -webkit-font-smoothing:antialiased; color:var(--white);
      }
      .dr-aurora { position:fixed; inset:0; pointer-events:none; z-index:0;
        background: radial-gradient(ellipse 75% 40% at 10% 0%,rgba(84,199,248,0.13),transparent 60%),
                    radial-gradient(ellipse 55% 35% at 90% 100%,rgba(59,158,218,0.10),transparent 58%);
        animation:dr-aurora 20s ease-in-out infinite alternate; }
      @keyframes dr-aurora { 0%{opacity:.7;transform:scale(1)} 100%{opacity:.85;transform:scale(1.07)} }
      .dr-flag { position:fixed; top:0; left:0; right:0; height:3px; z-index:60; opacity:.65;
        background:linear-gradient(90deg,var(--sky) 33%,rgba(245,248,255,.85) 33% 66%,var(--sky) 66%); }

      /* Header */
      .dr-header { position:sticky; top:3px; z-index:50; display:flex; align-items:center; justify-content:space-between; padding:16px 20px;
        background:linear-gradient(to bottom,rgba(3,10,20,.88),rgba(3,10,20,.55) 70%,transparent); backdrop-filter:blur(12px); }
      .dr-logo-wrap{display:flex;align-items:baseline}
      .dr-logo-t{font-family:'Clash Display',sans-serif;font-size:20px;font-weight:900;letter-spacing:-.8px}
      .dr-logo-inder{font-family:'Clash Display',sans-serif;font-size:20px;font-weight:900;letter-spacing:-.8px;background:linear-gradient(120deg,var(--sky),#a8e6ff,var(--sky2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
      .dr-logo-sub{font-size:10px;font-weight:500;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-left:8px;align-self:center}
      .dr-header-right{display:flex;align-items:center;gap:10px}
      .dr-role-badge{font-size:11px;font-weight:600;padding:4px 10px;border-radius:100px;border:1px solid var(--glass-b);background:var(--glass);color:var(--muted)}
      .dr-role-badge[data-role="streamer"]{border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.08);color:var(--warn)}
      .dr-create-btn{font-size:13px;font-weight:600;padding:8px 18px;border-radius:100px;border:1px solid var(--sky2);background:linear-gradient(135deg,rgba(84,199,248,.15),rgba(59,158,218,.08));color:var(--sky);cursor:pointer;transition:all .2s}
      .dr-create-btn:hover{background:linear-gradient(135deg,rgba(84,199,248,.28),rgba(59,158,218,.18));box-shadow:0 0 18px rgba(84,199,248,.25);transform:translateY(-1px)}

      /* Filtros */
      .dr-filters{position:relative;z-index:2;padding:12px 20px 4px;display:flex;flex-direction:column;gap:10px}
      .dr-search{background:rgba(5,15,30,.7);border:1px solid var(--glass-b);border-radius:12px;padding:10px 16px;color:var(--white);font-size:14px;outline:none;transition:border-color .2s}
      .dr-search::placeholder{color:var(--muted)} .dr-search:focus{border-color:var(--sky2)}
      .dr-filter-tags{display:flex;gap:6px;flex-wrap:wrap}
      .dr-filter-tag{font-size:11px;font-weight:500;padding:4px 12px;border-radius:100px;border:1px solid var(--glass-b);background:var(--glass);color:var(--muted);cursor:pointer;transition:all .18s;white-space:nowrap}
      .dr-filter-tag:hover{border-color:var(--sky2);color:var(--sky)}
      .dr-filter-tag.active{border-color:var(--sky);background:rgba(84,199,248,.12);color:var(--sky)}

      /* Main */
      .dr-main{flex:1;position:relative;z-index:1;padding:16px 20px 32px;overflow-y:auto}
      .dr-loading,.dr-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:80px 20px;color:var(--muted);text-align:center}
      .dr-spinner{width:32px;height:32px;border:2px solid var(--glass-b);border-top-color:var(--sky);border-radius:50%;animation:dr-spin .8s linear infinite}
      @keyframes dr-spin{to{transform:rotate(360deg)}}
      .dr-empty-icon{font-size:48px} .dr-empty h3{font-size:18px;font-weight:700;color:var(--white)}

      /* Cards */
      .dr-rooms-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
      .dr-card{position:relative;background:rgba(5,14,28,.82);border:1px solid var(--glass-b);border-radius:18px;overflow:hidden;cursor:pointer;transition:border-color .25s,transform .2s,box-shadow .25s;backdrop-filter:blur(12px);display:flex;flex-direction:column}
      .dr-card:hover{border-color:var(--sky2);transform:translateY(-3px);box-shadow:0 8px 32px rgba(84,199,248,.15)}
      .dr-card-glow{position:absolute;top:-40px;left:-40px;width:120px;height:120px;background:radial-gradient(circle,rgba(84,199,248,.12),transparent 70%);pointer-events:none;opacity:0;transition:opacity .3s}
      .dr-card:hover .dr-card-glow{opacity:1}
      .dr-card-body{padding:16px 18px 12px;flex:1} .dr-card-footer{padding:12px 18px 16px;border-top:1px solid var(--glass-b)}
      .dr-card-top{display:flex;align-items:center;gap:7px;margin-bottom:8px}
      .dr-live-dot{width:7px;height:7px;border-radius:50%;background:var(--sky);box-shadow:0 0 6px var(--sky);animation:dr-pulse 1.8s ease-in-out infinite;flex-shrink:0}
      @keyframes dr-pulse{0%,100%{opacity:1;box-shadow:0 0 6px var(--sky)}50%{opacity:.6;box-shadow:0 0 12px var(--sky)}}
      .dr-live-label{font-size:9px;font-weight:700;letter-spacing:1.2px;color:var(--sky);text-transform:uppercase}
      /* NUEVO host info */
      .dr-card-host-info{display:flex;align-items:center;gap:5px;margin-left:auto}
      .dr-card-role-badge{font-size:8px;font-weight:800;letter-spacing:1.2px;color:var(--violet);border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.1);border-radius:4px;padding:1px 6px;text-transform:uppercase}
      .dr-card-host-name{font-size:11px;color:var(--muted)}
      .dr-card-title{font-family:'Clash Display',sans-serif;font-size:17px;font-weight:800;color:var(--white);line-height:1.25;margin-bottom:6px}
      .dr-card-desc{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .dr-card-tags{display:flex;flex-wrap:wrap;gap:5px}
      .dr-tag{font-size:10px;font-weight:600;padding:3px 9px;border-radius:100px;border:1px solid var(--glass-b);background:var(--glass);color:var(--muted);text-transform:uppercase;letter-spacing:.5px;transition:all .15s}
      .dr-tag.selected,.dr-tag:hover{border-color:var(--sky);background:rgba(84,199,248,.1);color:var(--sky)}
      .dr-capacity{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
      .dr-capacity-bar{height:3px;background:rgba(84,199,248,.12);border-radius:2px;overflow:hidden}
      .dr-capacity-fill{height:100%;border-radius:2px;transition:width .4s}
      .dr-capacity-label{font-size:10px;color:var(--muted)}
      .dr-join-btn{width:100%;padding:9px;border-radius:10px;border:1px solid var(--sky2);background:linear-gradient(135deg,rgba(84,199,248,.12),rgba(59,158,218,.06));color:var(--sky);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
      .dr-join-btn:hover{background:linear-gradient(135deg,rgba(84,199,248,.22),rgba(59,158,218,.14));box-shadow:0 0 14px rgba(84,199,248,.2)}

      /* Room view */
      .dr-room-view{position:relative;z-index:1;display:flex;flex-direction:column;height:100dvh;overflow:hidden}
      .dr-room-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(3,10,20,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--glass-b);gap:8px;flex-wrap:wrap;flex-shrink:0}
      .dr-room-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1}
      .dr-room-title-text{font-family:'Clash Display',sans-serif;font-size:15px;font-weight:800}
      .dr-room-tags{display:flex;gap:4px;flex-wrap:wrap}
      .dr-room-header-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
      .dr-room-count{font-size:12px;color:var(--muted)}
      .dr-leave-btn{padding:6px 14px;border-radius:100px;border:1px solid rgba(248,113,113,.4);background:rgba(248,113,113,.08);color:var(--danger);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
      .dr-leave-btn:hover{background:rgba(248,113,113,.18)}
      .dr-chat-toggle-btn{position:relative;padding:6px 12px;border-radius:100px;border:1px solid var(--glass-b);background:var(--glass);color:var(--sky);font-size:13px;cursor:pointer;transition:all .2s}
      .dr-chat-badge{position:absolute;top:-4px;right:-4px;background:var(--danger);color:#fff;font-size:9px;font-weight:700;border-radius:100px;padding:1px 4px}

      /* Body */
      .dr-room-body{flex:1;display:flex;min-height:0;overflow:hidden}

      /* Stage */
      .dr-stage{position:relative;flex:1;min-width:0;background:rgba(3,8,18,.6);overflow:hidden}
      .dr-stage-self{width:100%;height:100%;position:relative}
      .dr-stage-video{width:100%;height:100%;object-fit:cover}
      .dr-stage-label{position:absolute;bottom:14px;left:14px;display:flex;align-items:center;gap:8px;background:rgba(3,10,20,.78);backdrop-filter:blur(8px);padding:6px 12px;border-radius:8px;border:1px solid var(--glass-b);font-size:12px}
      .dr-unpin-btn{background:rgba(84,199,248,.1);border:1px solid var(--sky2);color:var(--sky);font-size:11px;padding:2px 8px;border-radius:6px;cursor:pointer}
      .dr-stage-empty{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted);gap:6px}
      .dr-stage-desc{position:absolute;top:12px;right:12px;max-width:220px;background:rgba(3,10,20,.82);backdrop-filter:blur(10px);padding:8px 12px;border-radius:12px;border:1px solid var(--glass-b);display:flex;gap:6px;font-size:11px;color:var(--muted);line-height:1.5}

      /* Grid lateral */
      .dr-grid-section{width:200px;flex-shrink:0;background:rgba(3,10,20,.6);border-left:1px solid var(--glass-b);overflow-y:auto;padding:10px 8px;display:flex;flex-direction:column;gap:8px}
      .dr-section-label{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px}
      .dr-participants-grid{display:flex;flex-direction:column;gap:6px}

      /* Tiles */
      .dr-tile{position:relative;background:rgba(5,14,28,.9);border:1px solid var(--glass-b);border-radius:10px;overflow:hidden;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center}
      .dr-tile-sm{width:100%}
      .dr-tile-lg{width:100%;height:100%;border-radius:0;border:none;aspect-ratio:auto}
      .dr-tile-pinned{border-color:rgba(84,199,248,.5);box-shadow:0 0 20px rgba(84,199,248,.2)}
      .dr-tile-self{border-color:rgba(167,139,250,.4)}
      .dr-tile-overflow{font-size:16px;font-weight:700;color:var(--muted)}
      .dr-tile-video{width:100%;height:100%;object-fit:cover}
      .dr-tile-avatar{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(84,199,248,.08),rgba(59,158,218,.04));font-family:'Clash Display',sans-serif;font-size:20px;font-weight:900;color:var(--sky)}
      .dr-tile-info{position:absolute;bottom:0;left:0;right:0;padding:4px 6px;background:linear-gradient(to top,rgba(3,10,20,.9),transparent);display:flex;align-items:center;justify-content:space-between;gap:4px}
      .dr-tile-info-left{display:flex;align-items:center;gap:3px;min-width:0}
      .dr-host-badge{font-size:7px;font-weight:700;letter-spacing:1px;color:var(--sky);border:1px solid rgba(84,199,248,.35);background:rgba(84,199,248,.1);border-radius:3px;padding:1px 4px;text-transform:uppercase;flex-shrink:0}
      .dr-streamer-badge{font-size:7px;font-weight:700;letter-spacing:1px;color:var(--violet);border:1px solid rgba(167,139,250,.35);background:rgba(167,139,250,.1);border-radius:3px;padding:1px 4px;text-transform:uppercase;flex-shrink:0}
      .dr-tile-name{font-size:10px;color:var(--white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      /* NUEVO: media icons */
      .dr-tile-media-icons{display:flex;gap:2px;flex-shrink:0}
      .dr-icon-on{font-size:10px;opacity:1}
      .dr-icon-off{font-size:10px;opacity:.28;filter:grayscale(1)}

      /* Pin */
      .dr-pin-btn{position:absolute;top:5px;left:5px;background:rgba(3,10,20,.75);border:1px solid var(--glass-b);border-radius:5px;font-size:11px;padding:2px 5px;cursor:pointer;opacity:0;transition:opacity .2s;z-index:5}
      .dr-tile:hover .dr-pin-btn,.dr-stage-self:hover .dr-pin-btn{opacity:1}
      .dr-pin-btn.pinned{opacity:1;border-color:var(--sky)}

      /* Menú 3 puntos */
      .dr-menu-wrap{position:absolute;top:5px;right:5px;z-index:10}
      .dr-menu-btn{background:rgba(3,10,20,.8);border:1px solid var(--glass-b);border-radius:5px;color:var(--muted);font-size:14px;padding:1px 6px;cursor:pointer;line-height:1;opacity:0;transition:opacity .15s}
      .dr-tile:hover .dr-menu-btn{opacity:1}
      .dr-menu-dropdown{position:absolute;top:26px;right:0;min-width:152px;background:rgba(6,14,30,.98);border:1px solid var(--glass-b2);border-radius:10px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.6);animation:dr-fadein .15s ease}
      .dr-menu-dropdown button{display:block;width:100%;text-align:left;padding:9px 14px;font-size:12px;font-weight:500;color:var(--muted);background:transparent;border:none;cursor:pointer;transition:background .15s,color .15s}
      .dr-menu-dropdown button:hover{background:rgba(84,199,248,.08);color:var(--white)}
      .dr-menu-ban{color:var(--danger)!important}
      .dr-menu-ban:hover{background:rgba(248,113,113,.12)!important}

      /* Self-view flotante */
      .dr-self-view{position:fixed;bottom:66px;right:12px;width:112px;height:84px;border-radius:10px;overflow:hidden;border:1px solid rgba(167,139,250,.4);box-shadow:0 4px 16px rgba(0,0,0,.45);z-index:20;background:rgba(5,14,28,.9)}
      .dr-self-video{width:100%;height:100%;object-fit:cover}
      .dr-self-label{position:absolute;bottom:0;left:0;right:0;padding:3px 5px;background:rgba(3,10,20,.82);display:flex;align-items:center;justify-content:space-between;gap:3px}
      .dr-self-pin{background:transparent;border:none;font-size:10px;cursor:pointer;opacity:.6}
      .dr-self-pin:hover{opacity:1}

      /* Chat */
      .dr-chat{width:260px;flex-shrink:0;background:rgba(4,11,24,.97);border-left:1px solid var(--glass-b);display:flex;flex-direction:column}
      .dr-chat-header{display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid var(--glass-b);font-size:13px;font-weight:600;color:var(--white);flex-shrink:0}
      .dr-chat-close{background:transparent;border:none;color:var(--muted);font-size:16px;cursor:pointer;line-height:1}
      .dr-chat-messages{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:7px}
      .dr-chat-msg{display:flex;flex-direction:column;gap:2px;max-width:92%}
      .dr-chat-msg.own{align-self:flex-end;align-items:flex-end}
      .dr-chat-author{font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
      .dr-chat-msg.own .dr-chat-author{color:rgba(84,199,248,.6)}
      .dr-chat-text{font-size:12px;color:var(--white);background:rgba(84,199,248,.07);border:1px solid var(--glass-b);border-radius:8px;padding:5px 9px;line-height:1.4;word-break:break-word}
      .dr-chat-msg.own .dr-chat-text{background:rgba(84,199,248,.14);border-color:rgba(84,199,248,.22)}
      .dr-chat-input-row{display:flex;gap:6px;padding:8px;border-top:1px solid var(--glass-b);flex-shrink:0}
      .dr-chat-input{flex:1;background:rgba(5,15,30,.8);border:1px solid var(--glass-b);border-radius:8px;padding:7px 9px;color:var(--white);font-size:12px;outline:none}
      .dr-chat-input:focus{border-color:var(--sky2)}
      .dr-chat-send{padding:7px 11px;border-radius:8px;border:1px solid var(--sky2);background:rgba(84,199,248,.1);color:var(--sky);font-size:13px;cursor:pointer;transition:all .15s}
      .dr-chat-send:hover{background:rgba(84,199,248,.2)}

      /* Toast */
      .dr-toast{position:fixed;top:22px;left:50%;transform:translateX(-50%);z-index:999;background:rgba(6,14,30,.97);border:1px solid var(--glass-b2);border-radius:12px;padding:11px 22px;font-size:13px;font-weight:600;color:var(--white);box-shadow:0 8px 24px rgba(0,0,0,.5);animation:toast-in .25s ease;white-space:nowrap}
      @keyframes toast-in{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

      /* Controles — solo emojis */
      .dr-controls{display:flex;align-items:center;justify-content:center;gap:10px;padding:9px 14px;background:rgba(3,10,20,.96);border-top:1px solid var(--glass-b);flex-shrink:0}
      .dr-ctrl-btn{width:44px;height:44px;border-radius:12px;border:1px solid var(--glass-b);background:var(--glass);font-size:20px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center}
      .dr-ctrl-btn.active{border-color:var(--sky2);background:rgba(84,199,248,.1)}
      .dr-ctrl-btn.off{border-color:rgba(248,113,113,.3);background:rgba(248,113,113,.06)}
      .dr-ctrl-btn.neutral{border-color:var(--glass-b)}
      .dr-ctrl-btn:hover{transform:translateY(-2px)}
      .dr-ctrl-host-badge{width:44px;height:44px;border-radius:12px;border:1px solid rgba(251,191,36,.3);background:rgba(251,191,36,.07);display:flex;align-items:center;justify-content:center;font-size:20px}

      ::-webkit-scrollbar{width:3px;height:3px} ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:rgba(84,199,248,.2);border-radius:2px}
      @keyframes dr-fadein{from{opacity:0}to{opacity:1}}

      /* Create Room Modal */
      .crm-overlay{position:fixed;inset:0;background:rgba(1,5,12,.85);backdrop-filter:blur(14px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:crm-in .22s ease}
      @keyframes crm-in{from{opacity:0}to{opacity:1}}
      .crm-sheet{width:100%;max-width:480px;max-height:92dvh;overflow-y:auto;background:linear-gradient(160deg,rgba(8,18,36,.98),rgba(4,10,22,.99));border:1px solid rgba(84,199,248,.16);border-radius:24px;box-shadow:0 32px 80px rgba(0,0,0,.6);position:relative;animation:crm-up .28s cubic-bezier(0.34,1.4,0.64,1)}
      @keyframes crm-up{from{transform:translateY(28px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
      .crm-sheet::-webkit-scrollbar{display:none}
      .crm-topline{position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(84,199,248,.55),transparent)}
      .crm-header{display:flex;align-items:center;justify-content:space-between;padding:26px 26px 18px;border-bottom:1px solid rgba(84,199,248,.08)}
      .crm-header-left{display:flex;align-items:center;gap:14px}
      .crm-crown{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,rgba(251,191,36,.15),rgba(251,191,36,.05));border:1px solid rgba(251,191,36,.25);display:flex;align-items:center;justify-content:center;font-size:20px}
      .crm-eyebrow{font-size:10px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:rgba(251,191,36,.7);margin-bottom:3px}
      .crm-title{font-family:'Clash Display',sans-serif;font-size:22px;font-weight:700;color:#f0f6ff}
      .crm-close{width:34px;height:34px;border-radius:10px;border:1px solid rgba(84,199,248,.1);background:rgba(84,199,248,.04);color:rgba(180,215,240,.4);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .18s}
      .crm-close:hover{border-color:rgba(84,199,248,.25);color:rgba(180,215,240,.9)}
      .crm-body{padding:22px 26px;display:flex;flex-direction:column;gap:20px}
      .crm-field{display:flex;flex-direction:column;gap:8px}
      .crm-label{font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:rgba(180,215,240,.5);display:flex;align-items:center;gap:6px}
      .crm-required{color:rgba(84,199,248,.7);font-size:13px} .crm-hint{font-weight:400;letter-spacing:0;text-transform:none;font-size:11px;color:rgba(180,215,240,.28)}
      .crm-input-wrap{position:relative}
      .crm-input{width:100%;background:rgba(4,12,26,.7);border:1px solid rgba(84,199,248,.1);border-radius:12px;padding:12px 15px;color:#e8f2ff;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s;resize:none}
      .crm-input::placeholder{color:rgba(180,215,240,.2)}
      .crm-input:focus{border-color:rgba(84,199,248,.35);box-shadow:0 0 0 3px rgba(84,199,248,.07)}
      .crm-textarea{min-height:78px} .crm-char-count{position:absolute;bottom:10px;right:12px;font-size:10px;color:rgba(180,215,240,.2);pointer-events:none}
      .crm-tags-grid{display:flex;flex-wrap:wrap;gap:7px}
      .crm-tag{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:500;padding:6px 13px;border-radius:100px;border:1px solid rgba(84,199,248,.1);background:rgba(84,199,248,.03);color:rgba(180,215,240,.5);cursor:pointer;transition:all .16s;white-space:nowrap}
      .crm-tag:hover{border-color:rgba(84,199,248,.25);color:rgba(180,215,240,.85)}
      .crm-tag-on{border-color:rgba(84,199,248,.5)!important;background:rgba(84,199,248,.12)!important;color:#54c7f8!important}
      .crm-tag-check{font-size:10px;font-weight:700;color:#54c7f8}
      .crm-capacity-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
      .crm-number-wrap{display:flex;align-items:center;background:rgba(4,12,26,.7);border:1px solid rgba(84,199,248,.1);border-radius:12px;overflow:hidden}
      .crm-num-btn{width:40px;height:44px;background:rgba(84,199,248,.04);border:none;color:rgba(180,215,240,.5);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center}
      .crm-num-btn:hover{background:rgba(84,199,248,.1);color:#54c7f8}
      .crm-number-input{width:72px;height:44px;background:transparent;border:none;border-left:1px solid rgba(84,199,248,.08);border-right:1px solid rgba(84,199,248,.08);color:#e8f2ff;font-family:'Clash Display',sans-serif;font-size:17px;font-weight:600;text-align:center;outline:none;-moz-appearance:textfield}
      .crm-number-input::-webkit-outer-spin-button,.crm-number-input::-webkit-inner-spin-button{-webkit-appearance:none}
      .crm-capacity-presets{display:flex;gap:6px;flex-wrap:wrap}
      .crm-preset{font-size:12px;font-weight:500;padding:5px 13px;border-radius:100px;border:1px solid rgba(84,199,248,.1);background:rgba(84,199,248,.03);color:rgba(180,215,240,.45);cursor:pointer;transition:all .15s}
      .crm-preset-on{border-color:rgba(84,199,248,.45)!important;background:rgba(84,199,248,.1)!important;color:#54c7f8!important}
      .crm-error{display:flex;align-items:center;gap:8px;font-size:12px;color:#f87171;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.18);border-radius:10px;padding:10px 14px}
      .crm-footer{display:flex;justify-content:flex-end;gap:10px;padding:14px 26px 22px;border-top:1px solid rgba(84,199,248,.07)}
      .crm-btn-cancel{padding:11px 22px;border-radius:12px;border:1px solid rgba(84,199,248,.1);background:transparent;color:rgba(180,215,240,.4);font-size:13px;cursor:pointer;transition:all .18s}
      .crm-btn-cancel:hover{border-color:rgba(84,199,248,.2);color:rgba(180,215,240,.75)}
      .crm-btn-create{display:flex;align-items:center;gap:6px;padding:11px 24px;border-radius:12px;border:1px solid rgba(84,199,248,.4);background:linear-gradient(135deg,rgba(84,199,248,.18),rgba(59,158,218,.1));color:#54c7f8;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
      .crm-btn-create:hover:not(:disabled){border-color:rgba(84,199,248,.65);box-shadow:0 0 24px rgba(84,199,248,.2);transform:translateY(-1px)}
      .crm-btn-create:disabled{opacity:.45;cursor:not-allowed}
      .crm-arrow{font-size:15px;transition:transform .2s} .crm-btn-create:hover .crm-arrow{transform:translateX(3px)}
      .crm-loading-dots{display:flex;gap:4px;align-items:center}
      .crm-loading-dots span{width:5px;height:5px;border-radius:50%;background:#54c7f8;animation:crm-dot 1.2s ease-in-out infinite}
      .crm-loading-dots span:nth-child(2){animation-delay:.2s} .crm-loading-dots span:nth-child(3){animation-delay:.4s}
      @keyframes crm-dot{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
    `}</style>
  );
}