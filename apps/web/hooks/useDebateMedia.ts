"use client";

/**
 * useDebateMedia — VERSIÓN FINAL CON FIXES CRÍTICOS
 *
 * CAMBIOS vs versión anterior:
 *
 * 1. KICK / BAN / CLOSE en tiempo real
 *    Antes: onClosed solo hacía toast, y no había listeners para
 *    "debate-you-kicked" ni "debate-you-banned".
 *    Ahora: los tres eventos llaman onForceLeave() inmediatamente,
 *    lo que provoca que la UI retire al usuario de la sala en tiempo real.
 *
 * 2. VIDEO / AUDIO DE PARTICIPANTES REMOTOS
 *    Antes: useWebRTC existía separado y nunca se conectaba con los
 *    Participant. El campo `stream` de cada participante era siempre
 *    undefined, por lo que VideoTile nunca tenía nada que mostrar.
 *    Ahora: la señalización WebRTC (RTCPeerConnection por userId) está
 *    integrada aquí. Cuando llega "debate-user-joined" se inicia una
 *    conexión como initiator. Cuando llega una "offer" de un peer se
 *    responde como receiver. Al recibir el track remoto se actualiza
 *    `remoteStreams` (Map<userId, MediaStream>) que se inyecta como
 *    `stream` en cada Participant al mapear el estado del servidor.
 *
 * 3. ICE candidates encolados por peer
 *    Cada RTCPeerConnection tiene su propia cola de ICE candidates
 *    (Map<userId, RTCIceCandidateInit[]>) para manejar el race condition
 *    en que los candidates llegan antes que el remoteDescription.
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
  type: "yes_no" | "kick_vote";
  question: string;
  options: string[];
  votes: Record<string, string>;
  endsAt: number;
  targetId?: string;
  targetName?: string;
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
  /**
   * FIX 1: Callback que se llama cuando el servidor expulsa/banea/cierra
   * la sala para este usuario. Debe provocar que la UI salga de RoomView.
   * En page.tsx pasá: () => { stopMedia(); onLeave(); }
   */
  onForceLeave?: () => void
) {
  const { socket } = useSocket();

  /* ── Stream local ───────────────────────────────────────────────────────── */
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  /* ── WebRTC: peers y streams remotos ───────────────────────────────────── */
  // FIX 2: Un RTCPeerConnection por userId remoto
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Cola de ICE candidates por peer (para el race condition offer/candidate)
  const iceCandidateQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Map<userId, MediaStream> — se inyecta en Participant.stream al mapear
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
     MEDIA — pedir cámara/mic (una sola vez)
  ========================================================= */

  const initMedia = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
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
      // Detener todos los tracks al desmontar
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================
     WebRTC helpers
  ========================================================= */

  /** Drena la cola de ICE candidates de un peer dado. */
  const drainIceQueue = useCallback(async (targetUserId: string) => {
    const peer = peersRef.current.get(targetUserId);
    if (!peer || !peer.remoteDescription) return;

    const queue = iceCandidateQueuesRef.current.get(targetUserId) ?? [];
    if (queue.length === 0) return;

    iceCandidateQueuesRef.current.set(targetUserId, []);
    console.log(`[WebRTC] 🧊 Drenando ${queue.length} ICE candidates para ${targetUserId}`);

    for (const candidate of queue) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("[WebRTC] Error aplicando ICE encolado:", e);
      }
    }
  }, []);

  /**
   * Crea un RTCPeerConnection para targetUserId.
   * Si initiator=true, genera y envía la offer.
   */
  const createPeerWith = useCallback(async (
    targetUserId: string,
    initiator: boolean
  ): Promise<RTCPeerConnection | null> => {
    // Evitar duplicados
    if (peersRef.current.has(targetUserId)) {
      return peersRef.current.get(targetUserId)!;
    }

    // Asegurar stream local antes de crear el peer
    if (!localStreamRef.current) {
      await initMedia();
    }

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current.set(targetUserId, peer);
    iceCandidateQueuesRef.current.set(targetUserId, []);

    // Agregar tracks locales al peer
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current!);
      });
      console.log(`[WebRTC] ✅ Tracks locales añadidos para peer ${targetUserId}`);
    } else {
      console.warn(`[WebRTC] ⚠️ Peer creado sin tracks locales para ${targetUserId}`);
    }

    // FIX 2: Cuando llega el stream remoto, guardarlo con el userId
    peer.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      console.log(`[WebRTC] 🎥 Stream remoto recibido de ${targetUserId}`);
      remoteStreamsRef.current.set(targetUserId, stream);
      // Actualizar estado para re-render de participantes
      setRemoteStreams(new Map(remoteStreamsRef.current));
    };

    // Enviar ICE candidates al peer remoto a través del socket
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

  /** Cierra y limpia el peer de un usuario específico. */
  const closePeerWith = useCallback((targetUserId: string) => {
    const peer = peersRef.current.get(targetUserId);
    if (peer) {
      peer.ontrack             = null;
      peer.onicecandidate      = null;
      peer.oniceconnectionstatechange = null;
      peer.close();
      peersRef.current.delete(targetUserId);
      console.log(`[WebRTC] 🧹 Peer cerrado con ${targetUserId}`);
    }
    iceCandidateQueuesRef.current.delete(targetUserId);
    remoteStreamsRef.current.delete(targetUserId);
    setRemoteStreams(new Map(remoteStreamsRef.current));
  }, []);

  /** Cierra todos los peers (al desmontar o al salir de sala). */
  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach((peer, uid) => {
      peer.ontrack             = null;
      peer.onicecandidate      = null;
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
     SOCKETS — estado de sala + señalización WebRTC
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

      // FIX 2: Inyectar stream remoto en cada Participant
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
          // ↓ clave: stream del peer WebRTC asociado a este userId
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

    /* ── Nuevo participante → iniciar conexión WebRTC como initiator ───────── */
    const onUserJoined = async ({ userId: uid }: any) => {
      if (uid === currentUserId) return;
      console.log(`[WebRTC] 👤 Usuario unido: ${uid} — iniciando conexión como initiator`);
      await createPeerWith(uid, true);
    };

    /* ── Participante que se fue → limpiar su peer ─────────────────────────── */
    const onUserLeft = ({ userId: uid }: any) => {
      console.log(`[WebRTC] 🚪 Usuario fue: ${uid}`);
      closePeerWith(uid);
    };

    /* ── Señalización WebRTC ──────────────────────────────────────────────── */
    const onSignal = async ({ from, data }: { from: string; data: any }) => {
      let peer = peersRef.current.get(from);

      // Si no existe el peer aún (offer entrante), crear como receiver
      if (!peer) {
        if (data.type !== "offer") return; // ignorar si no es offer inicial
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
            // Encolar si remoteDescription aún no está seteado
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

    /* ── Chat ─────────────────────────────────────────────────────────────── */
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

    /* ── FIX 1: Sala cerrada / expulsado / baneado → salir en tiempo real ─── */
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

    /* ── Retry ROOM_NOT_FOUND ─────────────────────────────────────────────── */
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

      if (err.code === "BANNED" && err.roomId === roomId) {
        toast("Estás baneado de esta sala", "error");
      }

      if (err.code === "ROOM_FULL" && err.roomId === roomId) {
        toast("La sala está llena", "warn");
      }
    };

    const onHostTransferred = ({ newHostId }: { newHostId: string }) => {
      if (newHostId === currentUserId) {
        toast("👑 Ahora sos el host de esta sala", "info");
      }
    };

    /* ── Registro de listeners ───────────────────────────────────────────── */
    /* Votaciones en tiempo real */
    const onVoteStarted = (vote: ActiveVote) => {
      setActiveVote(vote);
      toast(`🗳️ Nueva votación: ${vote.question}`, "info");
    };
    const onVoteCast = ({ voteId, userId: voterId, choice }: { voteId: string; userId: string; choice: string }) => {
      setActiveVote((v) => {
        if (!v || v.id !== voteId) return v;
        return { ...v, votes: { ...v.votes, [voterId]: choice } };
      });
    };
    const onVoteEnded = ({ voteId }: { voteId: string }) => {
      setActiveVote((v) => (v?.id === voteId ? null : v));
    };

    socket.on("debate-room-state",   onState);
    socket.on("debate-user-joined",  onUserJoined);
    socket.on("debate-user-left",    onUserLeft);
    socket.on("signal",              onSignal);
    socket.on("debate-chat-message", onChat);
    socket.on("debate-room-closed",  onClosed);
    socket.on("debate-you-kicked",   onKicked);
    socket.on("debate-you-banned",   onBanned);
    socket.on("debate-error",        onError);
    socket.on("debate-host-transferred", onHostTransferred);
    socket.on("debate-vote-started", onVoteStarted);
    socket.on("debate-vote-cast",    onVoteCast);
    socket.on("debate-vote-ended",   onVoteEnded);

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      socket.off("debate-room-state",   onState);
      socket.off("debate-user-joined",  onUserJoined);
      socket.off("debate-user-left",    onUserLeft);
      socket.off("signal",              onSignal);
      socket.off("debate-chat-message", onChat);
      socket.off("debate-room-closed",  onClosed);
      socket.off("debate-you-kicked",   onKicked);
      socket.off("debate-you-banned",   onBanned);
      socket.off("debate-error",        onError);
      socket.off("debate-host-transferred", onHostTransferred);
      socket.off("debate-vote-started", onVoteStarted);
      socket.off("debate-vote-cast",    onVoteCast);
      socket.off("debate-vote-ended",   onVoteEnded);
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
     Sincronizar streams remotos en los participants cuando
     remoteStreams cambia (ej: un peer tarda en conectarse)
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
    s.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setAudioOn(t.enabled);
    });
  }, []);

  const toggleVideo = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setVideoOn(t.enabled);
    });
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
    (text: string) => {
      socket?.emit("debate-chat-message", { roomId, text });
    },
    [socket, roomId]
  );

  /* =========================================================
     HELPERS DE EMISIÓN
  ========================================================= */

  const emit = useCallback(
    (event: string, payload?: any) => {
      socket?.emit(event, { roomId, ...payload });
    },
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

    camOffParticipant: (id: string) =>
      emit("debate-camoff-user", { targetId: id }),

    camOnParticipant: (id: string) =>
      emit("debate-camon-user", { targetId: id }),

    kickParticipant: (id: string, name?: string) => {
      addLog("Kick", id, name);
      emit("debate-kick-user", { targetId: id });
    },

    banParticipant: (id: string, name?: string) => {
      addLog("Ban", id, name);
      emit("debate-ban-user", { targetId: id });
    },

    muteAll: (value?: boolean) =>
      emit("debate-mute-all", { value }),

    tempMuteParticipant: (id: string, name: string, ms: number) => {
      setTempMutes((p) => ({ ...p, [id]: Date.now() + ms }));
      addLog(`Temp mute ${ms / 1000}s`, id, name);
      emit("debate-tempmute-user", { targetId: id, ms });
    },

    shadowMuteParticipant: (id: string) =>
      emit("debate-shadowmute-user", { targetId: id }),

    cohosts,
    hostId,

    assignCohost: (id: string) =>
      emit("debate-cohost-add", { targetId: id }),

    transferHost: (id: string) =>
      emit("debate-transfer-host", { targetId: id }),

    roomSettings,

    updateSettings: (patch: Partial<RoomSettings>) =>
      setRoomSettings((prev) => ({ ...prev, ...patch })),

    setRoomMode: (mode: "strict" | "free" | "normal") =>
      emit("debate-set-mode", { mode }),

    speakQueue,
    currentSpeaker,
    speakEndsAt,

    requestSpeak: () => emit("debate-request-speak"),

    approveSpeak: (id: string) =>
      emit("debate-approve-speak", { targetId: id }),

    rejectSpeak: (id: string) =>
      emit("debate-reject-speak", { targetId: id }),

    cutSpeaker: () => emit("debate-cut-speaker"),

    extendSpeakTime: (ms = 30000) =>
      setSpeakEndsAt(Date.now() + ms),

    raisedHands,

    raiseHand: (state: boolean) =>
      emit(state ? "debate-raise-hand" : "debate-lower-hand"),

    activeVote,

    startVote: (
      type: "yes_no" | "kick_vote",
      q: string,
      ms: number,
      tid?: string,
      tn?: string
    ) => {
      const vote: ActiveVote = {
        id:         crypto.randomUUID?.() || String(Date.now()),
        type,
        question:   q,
        options:    type === "yes_no" ? ["Sí", "No"] : ["Expulsar", "Cancelar"],
        votes:      {},
        endsAt:     Date.now() + ms,
        targetId:   tid,
        targetName: tn,
      };
      socket?.emit("debate-start-vote", { roomId, vote });
      setActiveVote(vote);
    },

    castVote: (id: string, choice: string) => {
      socket?.emit("debate-cast-vote", { roomId, voteId: id, choice });
      setActiveVote((v) =>
        v ? { ...v, votes: { ...v.votes, [currentUserId]: choice } } : v
      );
    },

    modLogs,
    tempMutes,
  };
}

export default useDebateMedia;