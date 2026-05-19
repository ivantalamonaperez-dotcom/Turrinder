// realtime/handlers/debate.handler.ts

import { Server, Socket } from "socket.io";

import { debateState } from "../debates/state/debates.state";
import {
  DebateRoomState,
  DebateMember,
} from "../debates/types/debates.types";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const MAX_DEBATE_CAPACITY = 20;
const EMPTY_ROOM_TTL_MS   = 5 * 60 * 1000;
const DEFAULT_SPEAK_MS    = 60 * 1000;

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────
function now() {
  return Date.now();
}

function getUserId(socket: Socket): string | null {
  const id = socket.data?.userId;
  return typeof id === "string" && id ? id : null;
}

function getRoom(roomId: string): DebateRoomState | undefined {
  return debateState.get(roomId);
}

/**
 * Serializa el estado completo de la sala y lo emite a TODOS
 * los sockets dentro del room de Socket.IO.
 * Este broadcast es el mecanismo central de sincronización en tiempo real.
 */
function broadcastState(io: Server, roomId: string): void {
  const room = getRoom(roomId);
  if (!room) return;

  const members = [...room.members.values()].map((m) => ({
    userId:         m.userId,
    userName:       m.name,
    avatarUrl:      m.avatarUrl      ?? null,
    role:           m.role,
    micBlocked:     m.micBlocked,
    camBlocked:     m.camBlocked,
    handRaised:     m.handRaised,
    shadowMuted:    m.shadowMuted    ?? false,
    tempMutedUntil: m.tempMutedUntil ?? null,
  }));

  const raisedHands = [...room.members.values()]
    .filter((m) => m.handRaised)
    .map((m) => m.userId);

  io.to(roomId).emit("debate-room-state", {
    hostId:          room.hostId,
    cohosts:         [...room.cohosts],
    bans:            [...room.bans],
    members,
    raisedHands,
    chatEnabled:     room.chatEnabled,
    strictMode:      room.strictMode,
    freeMode:        room.freeMode,
    allMutedOnEntry: room.allMutedOnEntry,
    cameraAllowed:   room.cameraAllowed,
    speakTimeLimit:  room.speakTimeLimit,
    speakQueue:      room.speakQueue,
    currentSpeaker:  room.currentSpeaker,
    speakEndsAt:     room.speakEndsAt ?? null,
    maxPeople:       room.maxPeople,
  });
}

function isModerator(room: DebateRoomState, userId: string): boolean {
  return room.hostId === userId || room.cohosts.has(userId);
}

// ─────────────────────────────────────────────
// SPEAKER TIMERS
// ─────────────────────────────────────────────
const speakerTimers = new Map<string, NodeJS.Timeout>();

function clearSpeakerTimer(roomId: string): void {
  const t = speakerTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    speakerTimers.delete(roomId);
  }
}

function startSpeakerTimer(io: Server, roomId: string): void {
  clearSpeakerTimer(roomId);

  const room = getRoom(roomId);
  if (!room || !room.speakTimeLimit) return; // 0 = sin límite

  const ms = room.speakTimeLimit;

  const timer = setTimeout(() => {
    const r = getRoom(roomId);
    if (!r || !r.currentSpeaker) return;

    const m = r.members.get(r.currentSpeaker);
    if (m) {
      m.role       = "viewer";
      m.micBlocked = true;
    }

    r.currentSpeaker = null;
    r.speakEndsAt    = null;

    io.to(roomId).emit("debate-speaker-changed", {
      speakerId:   null,
      speakEndsAt: null,
    });

    broadcastState(io, roomId);
    speakerTimers.delete(roomId);
  }, ms);

  speakerTimers.set(roomId, timer);
}

// ─────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────
export const debateHandler = {

  // ── CREATE ROOM ─────────────────────────────────────────────────────────────
  createRoom(
    io:        Server,
    socket:    Socket,
    roomId:    string,
    hostId:    string,
    hostName:  string,
    avatarUrl: string | null,
    maxPeople: number
  ): void {
    const capacity = Math.min(Math.max(2, maxPeople), MAX_DEBATE_CAPACITY);

    // Reconexión del host: actualizar sin destruir la sala
    if (debateState.has(roomId)) {
      const existing = debateState.get(roomId)!;
      existing.hostId    = hostId;
      existing.maxPeople = capacity;

      const hostMember = existing.members.get(hostId);
      if (hostMember) hostMember.socketId = socket.id;

      socket.join(roomId);
      broadcastState(io, roomId);
      return;
    }

    const host: DebateMember = {
      userId:         hostId,
      socketId:       socket.id,
      name:           hostName,
      avatarUrl:      avatarUrl ?? null,
      role:           "host",
      micBlocked:     false,
      camBlocked:     false,
      banned:         false,
      handRaised:     false,
      shadowMuted:    false,
      tempMutedUntil: null,
    };

    const room: DebateRoomState = {
      roomId,
      hostId,
      maxPeople:       capacity,
      members:         new Map([[hostId, host]]),
      cohosts:         new Set(),
      bans:            new Set(),
      chatEnabled:     true,
      strictMode:      false,
      freeMode:        false,
      allMutedOnEntry: false,
      cameraAllowed:   true,
      speakTimeLimit:  DEFAULT_SPEAK_MS,
      speakQueue:      [],
      currentSpeaker:  null,
      speakEndsAt:     null,
      activeVote:      null,
      createdAt:       now(),
    };

    debateState.set(roomId, room);
    socket.join(roomId);

    console.log(`[DebateHandler] 🏠 Sala "${roomId}" creada por "${hostName}" | cap: ${capacity}`);

    broadcastState(io, roomId);
  },

  // ── JOIN ROOM ───────────────────────────────────────────────────────────────
  joinRoom(
    io:        Server,
    socket:    Socket,
    roomId:    string,
    userId:    string,
    userName:  string,
    avatarUrl: string | null
  ): void {
    const room = getRoom(roomId);
    if (!room) {
      socket.emit("debate-error", { code: "ROOM_NOT_FOUND", roomId });
      return;
    }

    if (room.bans.has(userId)) {
      socket.emit("debate-error", { code: "BANNED", roomId });
      return;
    }

    // Reconexión: solo actualizar socketId y re-emitir estado
    if (room.members.has(userId)) {
      room.members.get(userId)!.socketId = socket.id;
      socket.join(roomId);
      broadcastState(io, roomId);
      return;
    }

    if (room.members.size >= room.maxPeople) {
      socket.emit("debate-error", { code: "ROOM_FULL", roomId, max: room.maxPeople });
      return;
    }

    const member: DebateMember = {
      userId,
      socketId:       socket.id,
      name:           userName,
      avatarUrl:      avatarUrl ?? null,
      role:           "viewer",
      micBlocked:     room.allMutedOnEntry,
      camBlocked:     false,
      banned:         false,
      handRaised:     false,
      shadowMuted:    false,
      tempMutedUntil: null,
    };

    room.members.set(userId, member);
    socket.join(roomId);

    console.log(`[DebateHandler] 👤 "${userName}" se unió a "${roomId}" (${room.members.size}/${room.maxPeople})`);

    io.to(roomId).emit("debate-user-joined", {
      roomId,
      userId,
      userName,
      avatarUrl: avatarUrl ?? null,
    });

    // Broadcast a TODOS para que actualicen su lista de participantes
    broadcastState(io, roomId);
  },

  // ── LEAVE ROOM ──────────────────────────────────────────────────────────────
  leaveRoom(
    io:     Server,
    socket: Socket,
    roomId: string,
    userId: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !room.members.has(userId)) return;

    const member = room.members.get(userId)!;

    room.members.delete(userId);
    room.cohosts.delete(userId);
    room.speakQueue = room.speakQueue.filter((x) => x !== userId);

    if (room.currentSpeaker === userId) {
      room.currentSpeaker = null;
      room.speakEndsAt    = null;
      clearSpeakerTimer(roomId);
    }

    socket.leave(roomId);

    // Si el host se va, cerrar la sala para todos
    if (room.hostId === userId) {
      io.to(roomId).emit("debate-room-closed", { roomId, reason: "host-left" });
      io.socketsLeave(roomId);
      clearSpeakerTimer(roomId);
      debateState.delete(roomId);
      console.log(`[DebateHandler] 🗑️  Sala "${roomId}" cerrada (host se fue)`);
      return;
    }

    // Sala vacía tras la salida
    if (room.members.size === 0) {
      clearSpeakerTimer(roomId);
      debateState.delete(roomId);
      console.log(`[DebateHandler] 🗑️  Sala "${roomId}" eliminada (vacía)`);
      return;
    }

    console.log(`[DebateHandler] 🚪 "${member.name}" salió de "${roomId}" (${room.members.size}/${room.maxPeople})`);

    io.to(roomId).emit("debate-user-left", { roomId, userId });
    broadcastState(io, roomId);
  },

  // ── CLOSE ROOM (host cierra explícitamente) ─────────────────────────────────
  closeRoom(
    io:     Server,
    roomId: string,
    hostId: string
  ): void {
    const room = getRoom(roomId);
    if (!room || room.hostId !== hostId) return;

    io.to(roomId).emit("debate-room-closed", { roomId, reason: "host-closed" });
    io.socketsLeave(roomId);
    clearSpeakerTimer(roomId);
    debateState.delete(roomId);

    console.log(`[DebateHandler] 🗑️  Sala "${roomId}" cerrada por el host`);
  },

  // ── MUTE / UNMUTE ───────────────────────────────────────────────────────────
  muteUser(
    io: Server, roomId: string, by: string, target: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    const m = room.members.get(target);
    if (!m) return;

    m.micBlocked = true;

    if (m.socketId) io.to(m.socketId).emit("debate-you-muted", { by });
    broadcastState(io, roomId);
  },

  unmuteUser(
    io: Server, roomId: string, by: string, target: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    const m = room.members.get(target);
    if (!m) return;

    m.micBlocked = false;

    if (m.socketId) io.to(m.socketId).emit("debate-you-unmuted", { by });
    broadcastState(io, roomId);
  },

  // ── CAM OFF / ON ────────────────────────────────────────────────────────────
  camOffUser(
    io: Server, roomId: string, by: string, target: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    const m = room.members.get(target);
    if (!m) return;

    m.camBlocked = true;

    if (m.socketId) io.to(m.socketId).emit("debate-you-camoff", { by });
    broadcastState(io, roomId);
  },

  camOnUser(
    io: Server, roomId: string, by: string, target: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    const m = room.members.get(target);
    if (!m) return;

    m.camBlocked = false;

    if (m.socketId) io.to(m.socketId).emit("debate-you-camon", { by });
    broadcastState(io, roomId);
  },

  // ── MUTE ALL ────────────────────────────────────────────────────────────────
  muteAll(
    io: Server, roomId: string, by: string, value: boolean
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    room.members.forEach((m) => {
      if (m.userId === by)            return; // el moderador no se muta
      if (room.cohosts.has(m.userId)) return; // no muta a otros mods
      m.micBlocked = value;
    });

    io.to(roomId).emit("debate-mute-all", { value, by });
    broadcastState(io, roomId);
  },

  // ── KICK / BAN ──────────────────────────────────────────────────────────────
  kickUser(
    io: Server, roomId: string, by: string, target: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    const m = room.members.get(target);
    if (!m) return;

    room.members.delete(target);
    room.cohosts.delete(target);
    room.speakQueue = room.speakQueue.filter((x) => x !== target);

    if (room.currentSpeaker === target) {
      room.currentSpeaker = null;
      room.speakEndsAt    = null;
      clearSpeakerTimer(roomId);
    }

    if (m.socketId) io.to(m.socketId).emit("debate-you-kicked", { roomId, by });
    io.to(roomId).emit("debate-kicked", { roomId, userId: target });
    broadcastState(io, roomId);
  },

  banUser(
    io: Server, roomId: string, by: string, target: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    const m = room.members.get(target);
    if (!m) return;

    room.members.delete(target);
    room.cohosts.delete(target);
    room.bans.add(target);
    room.speakQueue = room.speakQueue.filter((x) => x !== target);

    if (room.currentSpeaker === target) {
      room.currentSpeaker = null;
      room.speakEndsAt    = null;
      clearSpeakerTimer(roomId);
    }

    if (m.socketId) io.to(m.socketId).emit("debate-you-banned", { roomId, by });
    io.to(roomId).emit("debate-banned-user", { roomId, userId: target });
    broadcastState(io, roomId);
  },

  // ── TEMP MUTE ───────────────────────────────────────────────────────────────
  tempMuteUser(
    io: Server, roomId: string, by: string, target: string, ms: number
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    const m = room.members.get(target);
    if (!m) return;

    const until        = now() + ms;
    m.micBlocked       = true;
    m.tempMutedUntil   = until;

    if (m.socketId) {
      io.to(m.socketId).emit("debate-you-tempmuted", { by, ms, until });
    }

    broadcastState(io, roomId);

    // Auto-desmutar al vencer el plazo
    setTimeout(() => {
      const r = getRoom(roomId);
      if (!r) return;
      const t = r.members.get(target);
      if (!t || !t.tempMutedUntil) return;
      if (now() < t.tempMutedUntil) return; // fue re-muteado con otro plazo

      t.micBlocked     = false;
      t.tempMutedUntil = null;

      if (t.socketId) io.to(t.socketId).emit("debate-you-unmuted", { by: "system" });
      broadcastState(io, roomId);
    }, ms);
  },

  // ── SELF MUTE (usuario apaga su propio mic/cam voluntariamente) ─────────────
  // FIX Bug 1: sin este handler, el estado micBlocked en el servidor no
  // se actualiza cuando el usuario se mutea solo. broadcastState no se dispara,
  // los demás clientes no reciben el nuevo estado, y sus <video> siguen
  // reproduciendo el audio del usuario como si nada.
  selfMute(
    io: Server, roomId: string, userId: string, micBlocked: boolean
  ): void {
    const room = getRoom(roomId);
    if (!room) return;

    const m = room.members.get(userId);
    if (!m) return;

    // En modo estricto solo el host/cohost puede activar el mic — ignorar
    // intentos de self-unmute si micBlocked fue puesto por un moderador.
    // Para detectarlo: si micBlocked=true en el server Y el usuario intenta
    // poner micBlocked=false, solo permitirlo si freeMode o si es el speaker.
    if (!micBlocked && m.micBlocked) {
      const isSpeaker  = room.currentSpeaker === userId;
      const isMod      = room.hostId === userId || room.cohosts.has(userId);
      if (!room.freeMode && !isSpeaker && !isMod) return; // bloqueado por host
    }

    m.micBlocked = micBlocked;
    broadcastState(io, roomId);
  },

  selfCamOff(
    io: Server, roomId: string, userId: string, camBlocked: boolean
  ): void {
    const room = getRoom(roomId);
    if (!room) return;

    const m = room.members.get(userId);
    if (!m) return;

    if (!camBlocked && m.camBlocked) {
      const isMod = room.hostId === userId || room.cohosts.has(userId);
      if (!room.freeMode && !isMod) return;
    }

    m.camBlocked = camBlocked;
    broadcastState(io, roomId);
  },

  // ── SHADOW MUTE ─────────────────────────────────────────────────────────────
  shadowMuteUser(
    io: Server, roomId: string, by: string, target: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    const m = room.members.get(target);
    if (!m) return;

    m.shadowMuted = !(m.shadowMuted ?? false); // toggle
    // El target NO recibe notificación (es shadow)
    broadcastState(io, roomId);
  },

  // ── HANDS ───────────────────────────────────────────────────────────────────
  raiseHand(io: Server, roomId: string, userId: string): void {
    const room = getRoom(roomId);
    if (!room) return;

    const m = room.members.get(userId);
    if (!m) return;

    m.handRaised = true;

    if (!room.speakQueue.includes(userId)) {
      room.speakQueue.push(userId);
    }

    broadcastState(io, roomId);
  },

  lowerHand(io: Server, roomId: string, userId: string): void {
    const room = getRoom(roomId);
    if (!room) return;

    const m = room.members.get(userId);
    if (!m) return;

    m.handRaised    = false;
    room.speakQueue = room.speakQueue.filter((x) => x !== userId);

    broadcastState(io, roomId);
  },

  // ── APPROVE / REJECT / CUT SPEAKER ─────────────────────────────────────────
  approveSpeaker(
    io: Server, roomId: string, by: string, target: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    const m = room.members.get(target);
    if (!m) return;

    // Si había un speaker anterior, devolverlo a viewer y mutearlo.
    // FIX: igual que cutSpeaker — siempre mutear al speaker desplazado,
    // sin importar allMutedOnEntry o freeMode, y notificar su socket.
    if (room.currentSpeaker && room.currentSpeaker !== target) {
      const prev = room.members.get(room.currentSpeaker);
      if (prev) {
        prev.role       = "viewer";
        prev.micBlocked = true;
        if (prev.socketId) {
          io.to(prev.socketId).emit("debate-you-muted", { by });
        }
      }
    }

    room.currentSpeaker = target;
    room.speakEndsAt    = room.speakTimeLimit > 0 ? now() + room.speakTimeLimit : null;
    room.speakQueue     = room.speakQueue.filter((x) => x !== target);

    m.handRaised = false;
    m.role       = "speaker";
    m.micBlocked = false;

    startSpeakerTimer(io, roomId);

    io.to(roomId).emit("debate-speaker-changed", {
      speakerId:   target,
      speakEndsAt: room.speakEndsAt,
    });

    broadcastState(io, roomId);
  },

  rejectSpeaker(
    io: Server, roomId: string, by: string, target: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    const m = room.members.get(target);
    if (m) m.handRaised = false;

    room.speakQueue = room.speakQueue.filter((x) => x !== target);

    if (m?.socketId) {
      io.to(m.socketId).emit("debate-speak-rejected", { by });
    }

    broadcastState(io, roomId);
  },

  cutSpeaker(io: Server, roomId: string, by: string): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    if (room.currentSpeaker) {
      const prev = room.members.get(room.currentSpeaker);
      if (prev) {
        prev.role = "viewer";

        // FIX: siempre mutear al speaker cortado, independientemente de
        // allMutedOnEntry o freeMode. El moderador cortó la palabra
        // explícitamente — el usuario no debe seguir hablando.
        // Se fuerza micBlocked=true y se notifica al socket del speaker
        // para que desactive su track local inmediatamente.
        prev.micBlocked = true;
        if (prev.socketId) {
          io.to(prev.socketId).emit("debate-you-muted", { by });
        }
      }
    }

    room.currentSpeaker = null;
    room.speakEndsAt    = null;
    clearSpeakerTimer(roomId);

    io.to(roomId).emit("debate-speaker-changed", {
      speakerId:   null,
      speakEndsAt: null,
    });

    broadcastState(io, roomId);
  },

  // ── CHAT ────────────────────────────────────────────────────────────────────
  setChatEnabled(
    io: Server, roomId: string, by: string, enabled: boolean
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    room.chatEnabled = enabled;
    broadcastState(io, roomId);
  },

  sendChat(
    io: Server, roomId: string, userId: string, text: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !room.chatEnabled) return;

    const m = room.members.get(userId);
    if (!m) return;

    // Shadow muteados no pueden chatear (sin notificación)
    if (m.shadowMuted) return;

    io.to(roomId).emit("debate-chat-message", {
      userId,
      userName:  m.name,
      avatarUrl: m.avatarUrl ?? null,
      text:      text.slice(0, 500),
      ts:        now(),
    });
  },

  // ── COHOST / TRANSFER HOST ──────────────────────────────────────────────────
  assignCohost(
    io: Server, roomId: string, by: string, target: string
  ): void {
    const room = getRoom(roomId);
    if (!room || room.hostId !== by) return;

    const m = room.members.get(target);
    if (!m) return;

    if (room.cohosts.has(target)) {
      room.cohosts.delete(target);
      m.role = "viewer";
    } else {
      room.cohosts.add(target);
      m.role = "cohost";
    }

    broadcastState(io, roomId);
  },

  transferHost(io, roomId, by, target): void {
    const room = getRoom(roomId);
    if (!room || room.hostId !== by) return;

    const oldHost = room.members.get(by);
    if (oldHost) oldHost.role = "viewer";

    const next = room.members.get(target);
    if (!next) return;

    next.role   = "host";
    room.hostId = target;
    room.cohosts.delete(target);

    // ✅ NUEVO: notificar al nuevo host directamente
    if (next.socketId) {
      io.to(next.socketId).emit("debate-host-transferred", { newHostId: target });
    }

    broadcastState(io, roomId);
  },

  // ── SET MODE ────────────────────────────────────────────────────────────────
  setMode(
    io: Server, roomId: string, by: string, mode: "strict" | "free" | "normal"
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    room.strictMode = mode === "strict";
    room.freeMode   = mode === "free";

    if (mode === "strict") {
      room.members.forEach((m) => {
        if (m.userId === room.hostId)       return;
        if (room.cohosts.has(m.userId))     return;
        m.micBlocked = true;
      });
    } else if (mode === "free") {
      room.members.forEach((m) => { m.micBlocked = false; });
    }

    broadcastState(io, roomId);
  },

  // ── DISCONNECT ──────────────────────────────────────────────────────────────
  handleDisconnect(io: Server, socket: Socket): void {
    const userId = getUserId(socket);
    if (!userId) return;

    for (const [roomId, room] of debateState.entries()) {
      if (room.members.has(userId)) {
        debateHandler.leaveRoom(io, socket, roomId, userId);
      }
    }
  },

  // ── VOTES ───────────────────────────────────────────────────────────────────

  startVote(
    io:     Server,
    roomId: string,
    by:     string,
    vote:   any
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;

    // Sanitize options: máx 6, cada una ≤ 80 chars, al menos 2
    const rawOptions: string[] = Array.isArray(vote.options) ? vote.options : [];
    const options = rawOptions
      .map((o: any) => (typeof o === "string" ? o.trim().slice(0, 80) : ""))
      .filter(Boolean)
      .slice(0, 6);

    if (options.length < 2) return; // votación inválida

    const voteObj = {
      id:         typeof vote.id === "string" ? vote.id : String(now()),
      type:       ["yes_no", "kick_vote", "custom"].includes(vote.type) ? vote.type : "custom",
      question:   typeof vote.question === "string" ? vote.question.slice(0, 300) : "",
      options,
      votes:      {} as Record<string, string>,
      endsAt:     typeof vote.endsAt === "number" ? vote.endsAt : now() + 30_000,
      targetId:   typeof vote.targetId   === "string" ? vote.targetId   : undefined,
      targetName: typeof vote.targetName === "string" ? vote.targetName : undefined,
      createdBy:  room.members.get(by)?.name ?? by,
    };

    if (!voteObj.question) return;

    room.activeVote = voteObj;

    io.to(roomId).emit("debate-vote-started", voteObj);

    // Auto-cerrar al terminar el plazo
    const msLeft = voteObj.endsAt - now();
    if (msLeft > 0) {
      setTimeout(() => {
        const r = getRoom(roomId);
        if (!r || r.activeVote?.id !== voteObj.id) return;

        const results: Record<string, number> = {};
        for (const choice of Object.values(r.activeVote.votes)) {
          results[choice] = (results[choice] ?? 0) + 1;
        }
        const winner = Object.entries(results).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        io.to(roomId).emit("debate-vote-ended", {
          voteId:  voteObj.id,
          results,
          winner,
          total:   Object.keys(r.activeVote.votes).length,
        });

        r.activeVote = null;
      }, msLeft);
    }
  },

  castVote(
    io:      Server,
    roomId:  string,
    userId:  string,
    voteId:  string,
    choice:  string
  ): void {
    const room = getRoom(roomId);
    if (!room || !room.activeVote) return;
    if (room.activeVote.id !== voteId) return;
    if (!room.members.has(userId)) return;
    if (!room.activeVote.options.includes(choice)) return;

    // Un voto por usuario
    room.activeVote.votes[userId] = choice;

    io.to(roomId).emit("debate-vote-cast", {
      voteId,
      userId,
      choice,
      total: Object.keys(room.activeVote.votes).length,
    });
  },

  endVote(
    io:     Server,
    roomId: string,
    by:     string,
    voteId: string
  ): void {
    const room = getRoom(roomId);
    if (!room || !isModerator(room, by)) return;
    if (!room.activeVote || room.activeVote.id !== voteId) return;

    const results: Record<string, number> = {};
    for (const choice of Object.values(room.activeVote.votes)) {
      results[choice] = (results[choice] ?? 0) + 1;
    }
    const winner = Object.entries(results).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    io.to(roomId).emit("debate-vote-ended", {
      voteId,
      results,
      winner,
      total: Object.keys(room.activeVote.votes).length,
    });

    room.activeVote = null;
  },

  // ── MAINTENANCE ─────────────────────────────────────────────────────────────
  // Llamar periódicamente desde server.ts: setInterval(() => debateHandler.runMaintenance(io), 60_000)
  runMaintenance(io: Server): void {
    const t = now();

    for (const [roomId, room] of debateState.entries()) {
      if (room.members.size === 0 && t - room.createdAt > EMPTY_ROOM_TTL_MS) {
        clearSpeakerTimer(roomId);
        debateState.delete(roomId);
        console.log(`[DebateHandler] 🗑️  Sala "${roomId}" eliminada por TTL vacío`);
      }
    }
  },
};