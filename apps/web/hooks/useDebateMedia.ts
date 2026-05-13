"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSocket } from "@/hooks/useSocket";

/* =========================================================
   EXPORT TYPES (para page.tsx)
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

/* ========================================================= */

type ToastFn = (
  msg: string,
  type?: "info" | "warn" | "error"
) => void;

export function useDebateMedia(
  roomId: string,
  isHost: boolean,
  currentUserId: string,
  currentUserName: string,
  currentUserAvatarUrl: string | null,
  currentUserRole: "streamer" | "viewer",
  onToast?: ToastFn
) {
  const { socket } = useSocket();

  const localStreamRef = useRef<MediaStream | null>(null);

  // FIX: ref para saber si ya recibimos el primer debate-room-state.
  // Si el join llegó antes de que el host creara la sala (ROOM_NOT_FOUND)
  // necesitamos reintentarlo. Este flag evita reintentos innecesarios
  // una vez que la sala ya fue confirmada.
  const roomConfirmedRef = useRef(false);

  // FIX: guardamos los datos de join en un ref para poder reutilizarlos
  // en el retry sin depender de closures desactualizadas.
  const joinPayloadRef = useRef({
    roomId,
    userId: currentUserId,
    userName: currentUserName,
    avatarUrl: currentUserAvatarUrl,
  });

  // Mantener el ref actualizado si cambian los datos del usuario
  useEffect(() => {
    joinPayloadRef.current = {
      roomId,
      userId: currentUserId,
      userName: currentUserName,
      avatarUrl: currentUserAvatarUrl,
    };
  }, [roomId, currentUserId, currentUserName, currentUserAvatarUrl]);

  const [localStream, setLocalStream] =
    useState<MediaStream | null>(null);

  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  const [blockedByHost, setBlockedByHost] =
    useState({
      mic: false,
      cam: false,
    });

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [presenceCount, setPresenceCount] =
    useState(1);

  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>([]);

  const [cohosts, setCohosts] = useState<Set<string>>(new Set());

  const [hostId, setHostId] = useState("");

  const [speakQueue, setSpeakQueue] =
    useState<SpeakRequest[]>([]);

  const [raisedHands, setRaisedHands] =
    useState<Set<string>>(new Set());

  const [currentSpeaker, setCurrentSpeaker] =
    useState<string | null>(null);

  const [speakEndsAt, setSpeakEndsAt] =
    useState<number | null>(null);

  const [roomSettings, setRoomSettings] =
    useState<RoomSettings>({
      strictMode: false,
      freeMode: false,
      chatEnabled: true,
      allMutedOnEntry: true,
      cameraAllowed: true,
      speakTimeLimit: 60000,
    });

  const [activeVote, setActiveVote] =
    useState<ActiveVote | null>(null);

  const [modLogs, setModLogs] = useState<ModLog[]>([]);

  const [tempMutes, setTempMutes] =
    useState<Record<string, number>>({});

  /* ========================================================= */

  const toast = useCallback(
    (
      msg: string,
      type: "info" | "warn" | "error" = "info"
    ) => onToast?.(msg, type),
    [onToast]
  );

  /* =========================================================
     MEDIA
  ========================================================= */

  const initMedia = useCallback(async () => {
    if (localStreamRef.current)
      return localStreamRef.current;

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
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
  }, [initMedia]);

  /* =========================================================
     ROOM JOIN
     FIX: el host emite "debate-create-room" en page.tsx y el
     guest emite "debate-join-room" aquí. En React Strict Mode
     (y en condiciones de red normales) el guest puede llegar
     al servidor antes de que el host haya creado la sala,
     recibiendo ROOM_NOT_FOUND. El retry se maneja en el bloque
     de sockets de abajo escuchando "debate-error".
     Aquí solo emitimos el join inicial.
  ========================================================= */

  useEffect(() => {
    if (!socket?.connected) return;

    // Resetear la confirmación al (re)conectar
    roomConfirmedRef.current = false;

    socket.emit("debate-join-room", joinPayloadRef.current);

    return () => {
      socket.emit("debate-leave-room", { roomId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  /* =========================================================
     SOCKETS
  ========================================================= */

  useEffect(() => {
    if (!socket) return;

    const onState = (state: any) => {
      // La sala existe y estamos dentro: marcar como confirmada
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
        userId:   x.userId,
        userName: x.userName || x.name || "Usuario",
        avatarUrl: x.avatarUrl || null,
      }));

      setSpeakQueue(queue);

      const hands = new Set<string>(
        (state.raisedHands || []).map((x: any) =>
          typeof x === "string" ? x : x.userId
        )
      );

      setRaisedHands(hands);

      // FIX: además de mapear los campos del servidor, propagamos
      // isHost e isCohost para que el HostPanel pueda identificarlos
      // correctamente sin depender solo del campo "role".
      const mapped = (state.members || [])
        .filter((m: any) => m.userId !== currentUserId)
        .map((m: any) => ({
          id:          m.userId,
          name:        m.userName || m.name || "Usuario",
          avatarUrl:   m.avatarUrl || null,
          role:        m.role || "viewer",
          hasVideo:    !m.camBlocked,
          hasAudio:    !m.micBlocked,
          mutedByHost: !!m.micBlocked,
          camOffByHost: !!m.camBlocked,
          handRaised:  !!m.handRaised,
          shadowMuted: !!m.shadowMuted,
          isHost:      m.userId === state.hostId,
          isCohost:    (state.cohosts || []).includes(m.userId),
          isSpeaking:  m.userId === state.currentSpeaker,
        }));

      setParticipants(mapped);

      // FIX: si el usuario actual está bloqueado por el host,
      // actualizar el estado local para que los controles reflejen eso.
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

    const onClosed = () => {
      toast("Sala cerrada", "warn");
    };

    // ── FIX: retry cuando el guest llega antes que el host ──────────────
    // El servidor emite "debate-error" con code "ROOM_NOT_FOUND" cuando
    // joinRoom no encuentra la sala. Esto ocurre si el guest entra
    // justo mientras el host todavía no emitió "debate-create-room".
    // Reintentamos el join con backoff hasta que la sala exista.
    let retryCount  = 0;
    const MAX_RETRY = 8;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const onError = (err: any) => {
      if (
        err.code   === "ROOM_NOT_FOUND" &&
        err.roomId === roomId           &&
        !roomConfirmedRef.current       &&
        !isHost                         // el host nunca hace join, crea la sala
      ) {
        if (retryCount >= MAX_RETRY) {
          toast("No se pudo conectar a la sala", "error");
          return;
        }

        // Backoff exponencial suave: 800ms, 1.2s, 1.8s, 2.4s …
        const delay = Math.min(800 * (retryCount + 1), 4000);
        retryCount++;

        retryTimer = setTimeout(() => {
          if (roomConfirmedRef.current) return; // ya entró por otra vía
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

    socket.on("debate-room-state",   onState);
    socket.on("debate-chat-message", onChat);
    socket.on("debate-room-closed",  onClosed);
    socket.on("debate-error",        onError);

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      socket.off("debate-room-state",   onState);
      socket.off("debate-chat-message", onChat);
      socket.off("debate-room-closed",  onClosed);
      socket.off("debate-error",        onError);
    };
  }, [
    socket,
    roomId,
    currentUserId,
    isHost,
    toast,
  ]);

  /* =========================================================
     CONTROLS
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
     HELPERS
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

    setRoomMode: (mode: "strict" | "free") =>
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
    ) =>
      setActiveVote({
        id:       crypto.randomUUID?.() || String(Date.now()),
        type,
        question: q,
        options:  type === "yes_no" ? ["Sí", "No"] : ["Expulsar", "Cancelar"],
        votes:    {},
        endsAt:   Date.now() + ms,
        targetId: tid,
        targetName: tn,
      }),

    castVote: (id: string, choice: string) =>
      setActiveVote((v) =>
        v ? { ...v, votes: { ...v.votes, [id]: choice } } : v
      ),

    modLogs,
    tempMutes,
  };
}

export default useDebateMedia;