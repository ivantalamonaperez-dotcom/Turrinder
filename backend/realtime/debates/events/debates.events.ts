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

  // ── SELF MUTE (usuario apaga su propio mic voluntariamente) ───────────────
  // FIX: permite que el usuario notifique al servidor de su estado de mute
  // para que broadcastState lo propague → los demás aplican t.enabled=false
  // sobre el stream remoto en su <video>.
  socket.on("debate-self-mute", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const p          = payload as Record<string, unknown>;
    const roomId     = safeStr(p.roomId);
    const micBlocked = p.micBlocked;

    if (!roomId || !validRoomId(roomId)) return;
    if (!validBool(micBlocked)) return;

    debateHandler.selfMute(io, roomId, myUserId, micBlocked);
  });

  // ── SELF CAM OFF (usuario apaga su propia cam voluntariamente) ────────────
  socket.on("debate-self-camoff", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const p          = payload as Record<string, unknown>;
    const roomId     = safeStr(p.roomId);
    const camBlocked = p.camBlocked;

    if (!roomId || !validRoomId(roomId)) return;
    if (!validBool(camBlocked)) return;

    debateHandler.selfCamOff(io, roomId, myUserId, camBlocked);
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
  socket.on("debate-request-speak", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId } = payload as Record<string, unknown>;
    if (!validRoomId(roomId)) return;

    debateHandler.raiseHand(io, roomId, myUserId);
  });

  // ── APPROVE SPEAK ──────────────────────────────────────────────────────────
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

  // ── WEBRTC SIGNAL RELAY ────────────────────────────────────────────────────
  // El hook emite { to: targetUserId, data: offer|answer|candidate }.
  // El servidor reenvía al socket del destinatario buscando en debateState.
  socket.on("signal", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const p  = payload as Record<string, unknown>;
    const to = safeStr(p.to, 64);
    if (!to) return;

    let targetSocketId: string | null = null;
    for (const room of debateState.values()) {
      const member = room.members.get(to);
      if (member?.socketId) {
        targetSocketId = member.socketId;
        break;
      }
    }

    if (!targetSocketId) return;

    io.to(targetSocketId).emit("signal", { from: myUserId, data: p.data });
  });

  // ── WEBRTC RECONNECT REQUEST ───────────────────────────────────────────────
  socket.on("signal-reconnect", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const p      = payload as Record<string, unknown>;
    const roomId = safeStr(p.roomId);
    const to     = safeStr(p.to, 64);
    if (!roomId || !to) return;

    const room = debateState.get(roomId);
    if (!room || !room.members.has(myUserId)) return;

    const member = room.members.get(to);
    if (!member?.socketId) return;

    io.to(member.socketId).emit("signal-reconnect-request", { from: myUserId });
  });

  // ── VOTES ──────────────────────────────────────────────────────────────────
  socket.on("debate-start-vote", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;
    const p      = payload as Record<string, unknown>;
    const roomId = safeStr(p.roomId);
    if (!roomId || !validRoomId(roomId)) return;
    if (!isModerator(roomId, myUserId)) return;
    const vote = p.vote;
    if (!vote || typeof vote !== "object") return;

    io.to(roomId).emit("debate-vote-started", vote);

    const voteObj = vote as Record<string, unknown>;
    const endsAt  = typeof voteObj.endsAt === "number" ? voteObj.endsAt : 0;
    const voteId  = typeof voteObj.id     === "string"  ? voteObj.id    : "";
    const msLeft  = endsAt - Date.now();
    if (msLeft > 0 && voteId) {
      setTimeout(() => {
        io.to(roomId).emit("debate-vote-ended", { voteId });
      }, msLeft);
    }
  });

  socket.on("debate-cast-vote", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;
    const p      = payload as Record<string, unknown>;
    const roomId = safeStr(p.roomId);
    const voteId = safeStr(p.voteId);
    const choice = safeStr(p.choice, 20);
    if (!roomId || !validRoomId(roomId)) return;
    if (!voteId || !choice) return;
    const room = debateState.get(roomId);
    if (!room || !room.members.has(myUserId)) return;

    io.to(roomId).emit("debate-vote-cast", { voteId, userId: myUserId, choice });
  });
}