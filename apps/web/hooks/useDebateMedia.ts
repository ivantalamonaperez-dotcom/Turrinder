"use client";

/**
 * useDebateMedia — VERSIÓN CON FIXES
 *
 * FIXES APLICADOS:
 *
 * 1. AUDIO REMOTO
 *    Los videos remotos tenían muted hardcodeado en VideoTile (page.tsx).
 *    Este hook ya estaba bien — el fix va en page.tsx/VideoTile.
 *
 * 2. VOTACIONES EN TIEMPO REAL
 *    startVote y castVote solo actualizaban estado local sin emitir al socket.
 *    Ahora ambas funciones emiten al servidor Y el hook escucha los eventos
 *    "debate-vote-started", "debate-vote-cast" y "debate-vote-ended" para
 *    sincronizar la votación entre todos los participantes.
 *
 * 3. KICK / BAN / CLOSE en tiempo real (ya estaba, se mantiene)
 *
 * 4. VIDEO / AUDIO DE PARTICIPANTES REMOTOS (ya estaba, se mantiene)
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSocket } from "@/hooks/useSocket";

/* =========================================================
   EXPORT TYPES
========================================================= */

export type Participant = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "host" | "cohost" | "speaker" | "viewer" | "streamer";
  hasVideo: boolean;
  hasAudio: boolean;
  mutedByHost: boolean;
  camOffByHost: boolean;
  isHost?: boolean;
  isCohost?: boolean;
  isSpeaking?: boolean;
  handRaised?: boolean;
  shadowMuted?: boolean;
  tempMutedUntil?: number | null;
  stream?: MediaStream;
};

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  ts: number;
};

export type SpeakRequest = {
  userId: string;
  userName: string;
  avatarUrl: string | null;
};

export type RoomSettings = {
  strictMode: boolean;
  freeMode: boolean;
  chatEnabled: boolean;
  allMutedOnEntry: boolean;
  cameraAllowed: boolean;
  speakTimeLimit: number;
};

export type ActiveVote = {
  id: string;
  type: "yes_no" | "kick_vote" | "custom";
  question: string;
  options: string[];
  votes: Record<string, string>;
  endsAt: number;
  targetId?: string;
  targetName?: string;
  createdBy?: string;
};

export type ModLog = {
  id: string;
  action: string;
  targetId?: string;
  targetName?: string;
  by?: string;
  ts: number;
};

/* =========================================================
   CONSTANTES
========================================================= */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

/* =========================================================
   HOOK
========================================================= */

type ToastFn = (msg: string, type?: "info" | "warn" | "error") => void;

export function useDebateMedia(
  roomId: string,
  isHost: boolean,
  currentUserId: string,
  currentUserName: string,
  currentUserAvatarUrl: string | null,
  currentUserRole: "streamer" | "viewer",
  onToast?: ToastFn,
  onForceLeave?: () => void
) {
  const { socket } = useSocket();

  /* ── Stream local ───────────────────────────────────────────────────────── */
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  /* ── WebRTC: peers y streams remotos ───────────────────────────────────── */
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidateQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  /* ── Estado de sala ─────────────────────────────────────────────────────── */
  const roomConfirmedRef = useRef(false);
  const joinPayloadRef = useRef({
    roomId,
    userId: currentUserId,
    userName: currentUserName,
    avatarUrl: currentUserAvatarUrl,
  });

  useEffect(() => {
    joinPayloadRef.current = {
      roomId,
      userId: currentUserId,
      userName: currentUserName,
      avatarUrl: currentUserAvatarUrl,
    };
  }, [roomId, currentUserId, currentUserName, currentUserAvatarUrl]);

  const [blockedByHost, setBlockedByHost] = useState({ mic: false, cam: false });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [presenceCount, setPresenceCount] = useState(1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [cohosts, setCohosts] = useState<Set<string>>(new Set());
  const [hostId, setHostId] = useState("");
  const [speakQueue, setSpeakQueue] = useState<SpeakRequest[]>([]);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [speakEndsAt, setSpeakEndsAt] = useState<number | null>(null);
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    strictMode: false,
    freeMode: false,
    chatEnabled: true,
    allMutedOnEntry: true,
    cameraAllowed: true,
    speakTimeLimit: 60000,
  });
  const [activeVote, setActiveVote] = useState<ActiveVote | null>(null);
  const [modLogs, setModLogs] = useState<ModLog[]>([]);
  const [tempMutes, setTempMutes] = useState<Record<string, number>>({});

  /* ── Refs estables para closures ────────────────────────────────────────── */
  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  const onForceLeaveRef = useRef(onForceLeave);
  useEffect(() => { onForceLeaveRef.current = onForceLeave; }, [onForceLeave]);

  /* ── Toast helper ───────────────────────────────────────────────────────── */
  const toast = useCallback(
    (msg: string, type: "info" | "warn" | "error" = "info") => onToast?.(msg, type),
    [onToast]
  );

  /* =========================================================
     MEDIA
  ========================================================= */

  const initMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch {
      toast("No se pudo acceder a cámara/mic", "error");
      return null;
    }
  }, [toast]);

  useEffect(() => {
    initMedia();
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================
     WebRTC helpers
  ========================================================= */

  const drainIceQueue = useCallback(async (targetUserId: string) => {
    const peer = peersRef.current.get(targetUserId);
    if (!peer || !peer.remoteDescription) return;
    const queue = iceCandidateQueuesRef.current.get(targetUserId) ?? [];
    if (queue.length === 0) return;
    iceCandidateQueuesRef.current.set(targetUserId, []);
    console.log(`[WebRTC] 🧊 Drenando ${queue.length} ICE candidates para ${targetUserId}`);
    for (const candidate of queue) {
      try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn("[WebRTC] Error aplicando ICE encolado:", e); }
    }
  }, []);

  const createPeerWith = useCallback(async (
    targetUserId: string,
    initiator: boolean
  ): Promise<RTCPeerConnection | null> => {
    if (peersRef.current.has(targetUserId)) {
      return peersRef.current.get(targetUserId)!;
    }
    if (!localStreamRef.current) await initMedia();

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current.set(targetUserId, peer);
    iceCandidateQueuesRef.current.set(targetUserId, []);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current!);
      });
      console.log(`[WebRTC] ✅ Tracks locales añadidos para peer ${targetUserId}`);
    } else {
      console.warn(`[WebRTC] ⚠️ Peer creado sin tracks locales para ${targetUserId}`);
    }

    peer.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      console.log(`[WebRTC] 🎥 Stream remoto recibido de ${targetUserId}`);
      remoteStreamsRef.current.set(targetUserId, stream);
      setRemoteStreams(new Map(remoteStreamsRef.current));
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("signal", {
          to: targetUserId,
          data: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    peer.oniceconnectionstatechange = () => {
      const state = peer.iceConnectionState;
      console.log(`[WebRTC] Estado ICE con ${targetUserId}:`, state);
      if (["disconnected", "failed", "closed"].includes(state)) {
        closePeerWith(targetUserId);
      }
    };

    if (initiator) {
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current?.emit("signal", { to: targetUserId, data: offer });
        console.log(`[WebRTC] 📤 Offer enviada a ${targetUserId}`);
      } catch (e) {
        console.error(`[WebRTC] Error creando offer para ${targetUserId}:`, e);
      }
    }

    return peer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initMedia]);

  const closePeerWith = useCallback((targetUserId: string) => {
    const peer = peersRef.current.get(targetUserId);
    if (peer) {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.oniceconnectionstatechange = null;
      peer.close();
      peersRef.current.delete(targetUserId);
      console.log(`[WebRTC] 🧹 Peer cerrado con ${targetUserId}`);
    }
    iceCandidateQueuesRef.current.delete(targetUserId);
    remoteStreamsRef.current.delete(targetUserId);
    setRemoteStreams(new Map(remoteStreamsRef.current));
  }, []);

  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach((peer, uid) => {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.oniceconnectionstatechange = null;
      peer.close();
      console.log(`[WebRTC] 🧹 Peer cerrado con ${uid}`);
    });
    peersRef.current.clear();
    iceCandidateQueuesRef.current.clear();
    remoteStreamsRef.current.clear();
    setRemoteStreams(new Map());
  }, []);

  /* =========================================================
     ROOM JOIN
  ========================================================= */

  useEffect(() => {
    if (!socket?.connected) return;
    roomConfirmedRef.current = false;
    socket.emit("debate-join-room", joinPayloadRef.current);
    return () => {
      socket.emit("debate-leave-room", { roomId });
      closeAllPeers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  /* =========================================================
     SOCKETS — estado de sala + señalización WebRTC + votos
  ========================================================= */

  useEffect(() => {
    if (!socket) return;

    /* ── Estado completo de la sala ───────────────────────────────────────── */
    const onState = (state: any) => {
      roomConfirmedRef.current = true;
      setPresenceCount(state.members?.length || 1);
      setHostId(state.hostId || "");
      setCohosts(new Set(state.cohosts || []));
      setCurrentSpeaker(state.currentSpeaker || null);
      setSpeakEndsAt(state.speakEndsAt || null);
      setRoomSettings({
        strictMode:      !!state.strictMode,
        freeMode:        !!state.freeMode,
        chatEnabled:     state.chatEnabled !== false,
        allMutedOnEntry: !!state.allMutedOnEntry,
        cameraAllowed:   state.cameraAllowed !== false,
        speakTimeLimit:  state.speakTimeLimit || 60000,
      });
      const queue = (state.speakQueue || []).map((x: any) => ({
        userId:    x.userId,
        userName:  x.userName || x.name || "Usuario",
        avatarUrl: x.avatarUrl || null,
      }));
      setSpeakQueue(queue);
      const hands = new Set<string>(
        (state.raisedHands || []).map((x: any) =>
          typeof x === "string" ? x : x.userId
        )
      );
      setRaisedHands(hands);
      const mapped = (state.members || [])
        .filter((m: any) => m.userId !== currentUserId)
        .map((m: any) => ({
          id:           m.userId,
          name:         m.userName || m.name || "Usuario",
          avatarUrl:    m.avatarUrl || null,
          role:         m.role || "viewer",
          hasVideo:     !m.camBlocked,
          hasAudio:     !m.micBlocked,
          mutedByHost:  !!m.micBlocked,
          camOffByHost: !!m.camBlocked,
          handRaised:   !!m.handRaised,
          shadowMuted:  !!m.shadowMuted,
          isHost:       m.userId === state.hostId,
          isCohost:     (state.cohosts || []).includes(m.userId),
          isSpeaking:   m.userId === state.currentSpeaker,
          stream:       remoteStreamsRef.current.get(m.userId),
        }));
      setParticipants(mapped);
      const selfInServer = (state.members || []).find(
        (m: any) => m.userId === currentUserId
      );
      if (selfInServer) {
        setBlockedByHost({
          mic: !!selfInServer.micBlocked,
          cam: !!selfInServer.camBlocked,
        });
      }
    };

    /* ── Nuevo participante ─────────────────────────────────────────────── */
    const onUserJoined = async ({ userId: uid }: any) => {
      if (uid === currentUserId) return;
      console.log(`[WebRTC] 👤 Usuario unido: ${uid} — iniciando como initiator`);
      await createPeerWith(uid, true);
    };

    /* ── Participante que se fue ────────────────────────────────────────── */
    const onUserLeft = ({ userId: uid }: any) => {
      console.log(`[WebRTC] 🚪 Usuario fue: ${uid}`);
      closePeerWith(uid);
    };

    /* ── Señalización WebRTC ────────────────────────────────────────────── */
    const onSignal = async ({ from, data }: { from: string; data: any }) => {
      let peer = peersRef.current.get(from);
      if (!peer) {
        if (data.type !== "offer") return;
        console.log(`[WebRTC] 📥 Offer recibida de ${from} — creando peer como receiver`);
        peer = await createPeerWith(from, false) ?? undefined;
        if (!peer) return;
      }
      try {
        if (data.type === "offer") {
          await peer.setRemoteDescription(new RTCSessionDescription(data));
          await drainIceQueue(from);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit("signal", { to: from, data: answer });
          console.log(`[WebRTC] 📤 Answer enviada a ${from}`);
        } else if (data.type === "answer") {
          await peer.setRemoteDescription(new RTCSessionDescription(data));
          await drainIceQueue(from);
        } else if (data.type === "candidate" && data.candidate) {
          if (!peer.remoteDescription) {
            const queue = iceCandidateQueuesRef.current.get(from) ?? [];
            queue.push(data.candidate);
            iceCandidateQueuesRef.current.set(from, queue);
            console.log(`[WebRTC] 🧊 ICE candidate encolado para ${from}`);
          } else {
            await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (e) {
        console.warn(`[WebRTC] Señal ignorada de ${from}:`, e);
      }
    };

    /* ── Chat ───────────────────────────────────────────────────────────── */
    const onChat = (msg: any) => {
      setChatMessages((p) => [
        ...p,
        {
          id:       crypto.randomUUID?.() || String(Date.now()),
          userId:   msg.userId,
          userName: msg.userName || msg.name,
          text:     msg.text,
          ts:       Date.now(),
        },
      ]);
    };

    /* ── Sala cerrada / expulsado / baneado ─────────────────────────────── */
    const onClosed = () => {
      toast("La sala fue cerrada", "warn");
      closeAllPeers();
      onForceLeaveRef.current?.();
    };

    const onKicked = ({ roomId: rid }: any) => {
      if (rid !== roomId) return;
      toast("Fuiste expulsado de la sala", "warn");
      closeAllPeers();
      onForceLeaveRef.current?.();
    };

    const onBanned = ({ roomId: rid }: any) => {
      if (rid !== roomId) return;
      toast("Fuiste baneado de esta sala", "error");
      closeAllPeers();
      onForceLeaveRef.current?.();
    };

    /* ── FIX 2: Votaciones en tiempo real ─────────────────────────────────
       Estos tres listeners FALTABAN completamente en la versión anterior.
       Sin ellos, las votaciones iniciadas por el host nunca llegaban a los
       demás participantes, y los votos emitidos no se sincronizaban.
    ═════════════════════════════════════════════════════════════════════════ */

    // El host inició una votación → mostrarla a todos los participantes
    const onVoteStarted = (vote: ActiveVote) => {
      setActiveVote(vote);
    };

    // Alguien votó → actualizar conteo en tiempo real para todos
    const onVoteCast = ({
      voteId,
      userId,
      choice,
    }: {
      voteId: string;
      userId: string;
      choice: string;
    }) => {
      setActiveVote((v) =>
        v && v.id === voteId
          ? { ...v, votes: { ...v.votes, [userId]: choice } }
          : v
      );
    };

    // El servidor indica que la votación terminó → cerrarla
    const onVoteEnded = ({
      voteId,
      results,
      winner,
      total,
    }: {
      voteId: string;
      results?: Record<string, number>;
      winner?: string | null;
      total?: number;
    }) => {
      setActiveVote((v) => (v?.id === voteId ? null : v));
      // Los resultados se emiten por separado si el consumidor los necesita;
      // acá podrías disparar un toast/callback externo si quisieras.
    };

    /* ── Retry ROOM_NOT_FOUND ───────────────────────────────────────────── */
    let retryCount = 0;
    const MAX_RETRY = 8;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const onError = (err: any) => {
      if (
        err.code   === "ROOM_NOT_FOUND" &&
        err.roomId === roomId           &&
        !roomConfirmedRef.current       &&
        !isHost
      ) {
        if (retryCount >= MAX_RETRY) {
          toast("No se pudo conectar a la sala", "error");
          return;
        }
        const delay = Math.min(800 * (retryCount + 1), 4000);
        retryCount++;
        retryTimer = setTimeout(() => {
          if (roomConfirmedRef.current) return;
          socket.emit("debate-join-room", joinPayloadRef.current);
        }, delay);
      }
      if (err.code === "BANNED"    && err.roomId === roomId) toast("Estás baneado de esta sala", "error");
      if (err.code === "ROOM_FULL" && err.roomId === roomId) toast("La sala está llena", "warn");
    };

    const onHostTransferred = ({ newHostId }: { newHostId: string }) => {
      if (newHostId === currentUserId) toast("👑 Ahora sos el host de esta sala", "info");
    };

    /* ── Registro de listeners ──────────────────────────────────────────── */
    socket.on("debate-room-state",       onState);
    socket.on("debate-user-joined",      onUserJoined);
    socket.on("debate-user-left",        onUserLeft);
    socket.on("signal",                  onSignal);
    socket.on("debate-chat-message",     onChat);
    socket.on("debate-room-closed",      onClosed);
    socket.on("debate-you-kicked",       onKicked);
    socket.on("debate-you-banned",       onBanned);
    socket.on("debate-error",            onError);
    socket.on("debate-host-transferred", onHostTransferred);
    // FIX 2: los tres listeners de votación que faltaban
    socket.on("debate-vote-started",     onVoteStarted);
    socket.on("debate-vote-cast",        onVoteCast);
    socket.on("debate-vote-ended",       onVoteEnded);

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      socket.off("debate-room-state",       onState);
      socket.off("debate-user-joined",      onUserJoined);
      socket.off("debate-user-left",        onUserLeft);
      socket.off("signal",                  onSignal);
      socket.off("debate-chat-message",     onChat);
      socket.off("debate-room-closed",      onClosed);
      socket.off("debate-you-kicked",       onKicked);
      socket.off("debate-you-banned",       onBanned);
      socket.off("debate-error",            onError);
      socket.off("debate-host-transferred", onHostTransferred);
      // FIX 2: cleanup
      socket.off("debate-vote-started",     onVoteStarted);
      socket.off("debate-vote-cast",        onVoteCast);
      socket.off("debate-vote-ended",       onVoteEnded);
    };
  }, [
    socket,
    roomId,
    currentUserId,
    isHost,
    toast,
    createPeerWith,
    closePeerWith,
    closeAllPeers,
    drainIceQueue,
  ]);

  /* =========================================================
     Sincronizar streams remotos cuando remoteStreams cambia
  ========================================================= */
  useEffect(() => {
    setParticipants((prev) =>
      prev.map((p) => ({
        ...p,
        stream: remoteStreams.get(p.id) ?? p.stream,
      }))
    );
  }, [remoteStreams]);

  /* =========================================================
     CONTROLES DE MEDIA LOCAL
  ========================================================= */

  const toggleAudio = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; setAudioOn(t.enabled); });
  }, []);

  const toggleVideo = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; setVideoOn(t.enabled); });
  }, []);

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  /* =========================================================
     CHAT
  ========================================================= */

  const sendChat = useCallback(
    (text: string) => { socket?.emit("debate-chat-message", { roomId, text }); },
    [socket, roomId]
  );

  /* =========================================================
     HELPERS DE EMISIÓN
  ========================================================= */

  const emit = useCallback(
    (event: string, payload?: any) => { socket?.emit(event, { roomId, ...payload }); },
    [socket, roomId]
  );

  const addLog = useCallback(
    (action: string, targetId?: string, targetName?: string) => {
      setModLogs((prev) => [
        {
          id:         crypto.randomUUID?.() || String(Date.now()),
          action,
          targetId,
          targetName,
          by:         currentUserId,
          ts:         Date.now(),
        },
        ...prev,
      ]);
    },
    [currentUserId]
  );

  /* =========================================================
     RETURN
  ========================================================= */

  return {
    participants,
    localStream,
    videoOn,
    audioOn,
    blockedByHost,
    presenceCount,

    chatMessages,

    stopMedia,
    toggleVideo,
    toggleAudio,
    sendChat,

    notifyRoomClosed: () => toast("Sala cerrada"),

    muteParticipant: (id: string, name?: string) => {
      addLog("Mute", id, name);
      emit("debate-mute-user", { targetId: id });
    },

    unmuteParticipant: (id: string, name?: string) => {
      addLog("Unmute", id, name);
      emit("debate-unmute-user", { targetId: id });
    },

    camOffParticipant: (id: string) => emit("debate-camoff-user", { targetId: id }),
    camOnParticipant:  (id: string) => emit("debate-camon-user",  { targetId: id }),

    kickParticipant: (id: string, name?: string) => {
      addLog("Kick", id, name);
      emit("debate-kick-user", { targetId: id });
    },

    banParticipant: (id: string, name?: string) => {
      addLog("Ban", id, name);
      emit("debate-ban-user", { targetId: id });
    },

    muteAll: (value?: boolean) => emit("debate-mute-all", { value }),

    tempMuteParticipant: (id: string, name: string, ms: number) => {
      setTempMutes((p) => ({ ...p, [id]: Date.now() + ms }));
      addLog(`Temp mute ${ms / 1000}s`, id, name);
      emit("debate-tempmute-user", { targetId: id, ms });
    },

    shadowMuteParticipant: (id: string) => emit("debate-shadowmute-user", { targetId: id }),

    cohosts,
    hostId,

    assignCohost:  (id: string) => emit("debate-cohost-add",    { targetId: id }),
    transferHost:  (id: string) => emit("debate-transfer-host", { targetId: id }),

    roomSettings,
    updateSettings: (patch: Partial<RoomSettings>) =>
      setRoomSettings((prev) => ({ ...prev, ...patch })),
    setRoomMode: (mode: "strict" | "free" | "normal") => emit("debate-set-mode", { mode }),

    speakQueue,
    currentSpeaker,
    speakEndsAt,

    requestSpeak:  ()           => emit("debate-request-speak"),
    approveSpeak:  (id: string) => emit("debate-approve-speak",  { targetId: id }),
    rejectSpeak:   (id: string) => emit("debate-reject-speak",   { targetId: id }),
    cutSpeaker:    ()           => emit("debate-cut-speaker"),
    extendSpeakTime: (ms = 30000) => setSpeakEndsAt(Date.now() + ms),

    raisedHands,
    raiseHand: (state: boolean) =>
      emit(state ? "debate-raise-hand" : "debate-lower-hand"),

    activeVote,

    // FIX 2: ahora emite al servidor para que la votación llegue a todos.
    startVote: (
      type: "yes_no" | "kick_vote" | "custom",
      q: string,
      ms: number,
      tid?: string,
      tn?: string,
      customOptions?: string[]
    ) => {
      const options =
        type === "yes_no"    ? ["Sí", "No"] :
        type === "kick_vote" ? ["Expulsar", "Cancelar"] :
        (customOptions ?? []).map((o) => o.trim()).filter(Boolean).slice(0, 6);

      const vote: ActiveVote = {
        id:         crypto.randomUUID?.() || String(Date.now()),
        type,
        question:   q,
        options,
        votes:      {},
        endsAt:     Date.now() + ms,
        targetId:   tid,
        targetName: tn,
        createdBy:  currentUserName,
      };
      setActiveVote(vote);
      socketRef.current?.emit("debate-start-vote", { roomId, vote });
    },

    // FIX 2: ahora emite al servidor para sincronizar el voto entre todos.
    // Antes solo hacía setActiveVote() localmente (el voto era invisible para los demás).
    castVote: (voteId: string, choice: string) => {
      setActiveVote((v) =>
        v && v.id === voteId
          ? { ...v, votes: { ...v.votes, [currentUserId]: choice } }
          : v
      ); // feedback instantáneo al votante
      socketRef.current?.emit("debate-cast-vote", { roomId, voteId, choice }); // broadcast a todos
    },

    // Cierre anticipado de votación (solo host/mod)
    endVote: (voteId: string) => {
      socketRef.current?.emit("debate-end-vote", { roomId, voteId });
    },

    modLogs,
    tempMutes,
  };
}

export default useDebateMedia;