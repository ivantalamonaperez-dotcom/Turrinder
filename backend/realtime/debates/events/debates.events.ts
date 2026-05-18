// realtime/debates/events/debates.events.ts

import { Server, Socket } from "socket.io";

import { debateHandler } from "../../handlers/debate.handler";
import { isHost, isModerator } from "../guards/debates.guard";
import { debateState } from "../state/debates.state";

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────

const ROOM_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const UUID_REGEX    = /^[0-9a-f-]{36}$/i;

function validRoomId(v: unknown): v is string {
  return typeof v === "string" && ROOM_ID_REGEX.test(v);
}

function validUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_REGEX.test(v);
}

function validBool(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function validMs(v: unknown): v is number {
  return typeof v === "number" && v > 0 && v <= 600_000;
}

function safeStr(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  return v.slice(0, max);
}

function safeUserId(socket: Socket): string | null {
  const id = socket.data?.userId;
  if (typeof id !== "string" || !id) return null;
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────────────────────────

export default function registerDebatesEvents(
  io:     Server,
  socket: Socket
): void {
  const myUserId = safeUserId(socket);

  if (!myUserId) {
    socket.disconnect(true);
    return;
  }

  // ── CREATE ROOM ────────────────────────────────────────────────────────────
  // FIX: antes page.tsx emitía "create-debate-room" (sin prefijo "debate-"),
  //      ahora ambos lados usan "debate-create-room".
  socket.on("debate-create-room", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const p         = payload as Record<string, unknown>;
    const roomId    = safeStr(p.roomId);
    const hostName  = safeStr(p.hostName ?? p.userName, 40);
    const avatarUrl = safeStr(p.avatarUrl ?? null, 200);
    const maxPeople = typeof p.maxPeople === "number" ? p.maxPeople : 10;

    if (!roomId || !validRoomId(roomId)) return;
    if (!hostName) return;

    debateHandler.createRoom(
      io,
      socket,
      roomId,
      myUserId,
      hostName,
      avatarUrl,
      maxPeople,
    );
  });

  // ── JOIN ROOM ──────────────────────────────────────────────────────────────
  // FIX: ahora se extrae y pasa avatarUrl al handler
  socket.on("debate-join-room", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const p         = payload as Record<string, unknown>;
    const roomId    = safeStr(p.roomId);
    const userName  = safeStr(p.userName ?? p.name, 40);
    const avatarUrl = safeStr(p.avatarUrl ?? null, 200);

    if (!roomId || !validRoomId(roomId)) return;
    if (!userName) return;

    debateHandler.joinRoom(
      io,
      socket,
      roomId,
      myUserId,
      userName,
      avatarUrl,
    );
  });

  // ── LEAVE ROOM ─────────────────────────────────────────────────────────────
  socket.on("debate-leave-room", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;

    debateHandler.leaveRoom(io, socket, roomId, myUserId);
  });

  // ── CLOSE ROOM (solo host) ─────────────────────────────────────────────────
  // FIX: antes page.tsx emitía "close-debate-room" (sin prefijo "debate-"),
  //      ahora ambos lados usan "debate-close-room".
  socket.on("debate-close-room", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!isHost(roomId, myUserId)) return;

    debateHandler.closeRoom(io, roomId, myUserId);
  });

  // ── MUTE USER ──────────────────────────────────────────────────────────────
  socket.on("debate-mute-user", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.muteUser(io, roomId, myUserId, targetId);
  });

  // ── UNMUTE USER ────────────────────────────────────────────────────────────
  socket.on("debate-unmute-user", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.unmuteUser(io, roomId, myUserId, targetId);
  });

  // ── CAM OFF ────────────────────────────────────────────────────────────────
  socket.on("debate-camoff-user", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.camOffUser(io, roomId, myUserId, targetId);
  });

  // ── CAM ON ─────────────────────────────────────────────────────────────────
  socket.on("debate-camon-user", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.camOnUser(io, roomId, myUserId, targetId);
  });

  // ── MUTE ALL ───────────────────────────────────────────────────────────────
  socket.on("debate-mute-all", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, value } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validBool(value)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.muteAll(io, roomId, myUserId, value);
  });

  // ── KICK USER ──────────────────────────────────────────────────────────────
  socket.on("debate-kick-user", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.kickUser(io, roomId, myUserId, targetId);
  });

  // ── BAN USER ───────────────────────────────────────────────────────────────
  socket.on("debate-ban-user", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.banUser(io, roomId, myUserId, targetId);
  });

  // ── TEMP MUTE ──────────────────────────────────────────────────────────────
  socket.on("debate-tempmute-user", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId, ms } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!validMs(ms)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.tempMuteUser(io, roomId, myUserId, targetId, ms);
  });

  // ── SHADOW MUTE ────────────────────────────────────────────────────────────
  socket.on("debate-shadowmute-user", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.shadowMuteUser(io, roomId, myUserId, targetId);
  });

  // ── RAISE HAND ─────────────────────────────────────────────────────────────
  socket.on("debate-raise-hand", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;

    debateHandler.raiseHand(io, roomId, myUserId);
  });

  // ── LOWER HAND ─────────────────────────────────────────────────────────────
  socket.on("debate-lower-hand", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;

    debateHandler.lowerHand(io, roomId, myUserId);
  });

  // ── REQUEST SPEAK ──────────────────────────────────────────────────────────
  // El cliente emite esto cuando levanta la mano pidiendo turno
  socket.on("debate-request-speak", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;

    // Se implementa igual que raise-hand (agrega a la queue)
    debateHandler.raiseHand(io, roomId, myUserId);
  });

  // ── APPROVE SPEAK ──────────────────────────────────────────────────────────
  // FIX: el cliente emite "debate-approve-speak" pero el evento registrado
  //      era "debate-approve-speaker" → unificado acá con ambos alias.
  const handleApprove = (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.approveSpeaker(io, roomId, myUserId, targetId);
  };

  socket.on("debate-approve-speak",   handleApprove);
  socket.on("debate-approve-speaker", handleApprove);

  // ── REJECT SPEAK ───────────────────────────────────────────────────────────
  socket.on("debate-reject-speak", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.rejectSpeaker(io, roomId, myUserId, targetId);
  });

  // ── CUT SPEAKER ────────────────────────────────────────────────────────────
  socket.on("debate-cut-speaker", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.cutSpeaker(io, roomId, myUserId);
  });

  // ── ASSIGN COHOST ──────────────────────────────────────────────────────────
  // FIX: el cliente emite "debate-cohost-add" pero el evento registrado
  //      era "debate-assign-cohost" → se agregan ambos alias.
  const handleCohost = (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isHost(roomId, myUserId)) return;

    debateHandler.assignCohost(io, roomId, myUserId, targetId);
  };

  socket.on("debate-assign-cohost", handleCohost);
  socket.on("debate-cohost-add",    handleCohost);

  // ── TRANSFER HOST ──────────────────────────────────────────────────────────
  socket.on("debate-transfer-host", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, targetId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validUUID(targetId)) return;
    if (!isHost(roomId, myUserId)) return;

    debateHandler.transferHost(io, roomId, myUserId, targetId);
  });

  // ── CHAT TOGGLE ────────────────────────────────────────────────────────────
  socket.on("debate-chat-toggle", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, enabled } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (!validBool(enabled)) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.setChatEnabled(io, roomId, myUserId, enabled);
  });

  // ── CHAT MESSAGE ───────────────────────────────────────────────────────────
  socket.on("debate-chat-message", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const p      = payload as Record<string, unknown>;
    const roomId = safeStr(p.roomId);
    const text   = safeStr(p.text, 500);

    if (!roomId || !validRoomId(roomId)) return;
    if (!text || !text.trim()) return;

    debateHandler.sendChat(io, roomId, myUserId, text.trim());
  });

  // ── SET MODE ───────────────────────────────────────────────────────────────
  socket.on("debate-set-mode", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, mode } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;
    if (mode !== "strict" && mode !== "free" && mode !== "normal") return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.setMode(io, roomId, myUserId, mode);
  });

  // ── DISCONNECT ─────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    debateState.forEach((room, roomId) => {
      if (room.members.has(myUserId)) {
        debateHandler.leaveRoom(io, socket, roomId, myUserId);
      }
    });
  });


  // ── VOTES ─────────────────────────────────────────────────────────────────
  // debate-start-vote  → solo host/mod. Soporta type: "yes_no" | "kick_vote" | "custom"
  // debate-cast-vote   → cualquier miembro de la sala
  // debate-end-vote    → solo host/mod (cierre anticipado)

  socket.on("debate-start-vote", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const p      = payload as Record<string, unknown>;
    const roomId = safeStr(p.roomId);
    if (!roomId || !validRoomId(roomId)) return;
    if (!isModerator(roomId, myUserId)) return;

    const vote = p.vote;
    if (!vote || typeof vote !== "object") return;

    const v = vote as Record<string, unknown>;

    // Validar campos mínimos
    const question = safeStr(v.question, 300);
    if (!question || !question.trim()) return;

    const type = v.type;
    if (type !== "yes_no" && type !== "kick_vote" && type !== "custom") return;

    const rawOptions: unknown[] = Array.isArray(v.options) ? v.options : [];
    const options = rawOptions
      .map((o) => (typeof o === "string" ? o.trim().slice(0, 80) : ""))
      .filter(Boolean)
      .slice(0, 6);

    if (options.length < 2) return;

    const endsAt = typeof v.endsAt === "number" && v.endsAt > Date.now()
      ? v.endsAt
      : Date.now() + 30_000;

    const sanitizedVote = {
      ...v,
      question: question.trim(),
      options,
      endsAt,
      votes: {},   // nunca confiar en votos del cliente
    };

    debateHandler.startVote(io, roomId, myUserId, sanitizedVote);
  });

  socket.on("debate-cast-vote", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const p      = payload as Record<string, unknown>;
    const roomId = safeStr(p.roomId);
    const voteId = safeStr(p.voteId, 64);
    const choice = safeStr(p.choice, 80);

    if (!roomId || !validRoomId(roomId)) return;
    if (!voteId || !choice) return;

    debateHandler.castVote(io, roomId, myUserId, voteId, choice);
  });

  socket.on("debate-end-vote", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const p      = payload as Record<string, unknown>;
    const roomId = safeStr(p.roomId);
    const voteId = safeStr(p.voteId, 64);

    if (!roomId || !validRoomId(roomId)) return;
    if (!voteId) return;
    if (!isModerator(roomId, myUserId)) return;

    debateHandler.endVote(io, roomId, myUserId, voteId);
  });
}