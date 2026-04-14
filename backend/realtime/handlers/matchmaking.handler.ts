/**
 * matchmaking.handler.ts — Con guard de AD_MODE
 *
 * CAMBIO respecto a la versión anterior:
 *   handleFindMatch ahora verifica adManager.canMatchmake() antes de
 *   proceder. Si el usuario está en AD_MODE, se rechaza silenciosamente.
 *   Esto cierra el bypass desde cualquier path de código.
 */

import { Socket, Server } from "socket.io";
import { userSocketMap } from "../../webrtc/webrtc.events";
import { adManager } from "../../ad/ad.manager";

let queue: string[] = [];
const activeMatches = new Map<string, string>();

const isSocketAlive = (io: Server, userId: string): boolean => {
  const sid = userSocketMap.get(userId);
  if (!sid) return false;
  return io.sockets.sockets.has(sid);
};

const removeFromQueue = (userId: string) => {
  queue = queue.filter((id) => id !== userId);
};

const breakActiveMatch = (io: Server, userId: string) => {
  const partnerUUID = activeMatches.get(userId);
  if (!partnerUUID) return;
  activeMatches.delete(userId);
  activeMatches.delete(partnerUUID);
  console.log(`[Matchmaking] 💔 Match roto: ${userId} <-> ${partnerUUID}`);
  const partnerSid = userSocketMap.get(partnerUUID);
  if (partnerSid && io.sockets.sockets.has(partnerSid)) {
    io.to(partnerSid).emit("partner-left");
    console.log(`[Matchmaking] 📢 'partner-left' enviado a ${partnerUUID}`);
  }
};

export const matchmakingHandler = {
  handleFindMatch: (io: Server, socket: Socket) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;

    // ── GUARD: Bloquear si está en AD_MODE ─────────────────────────────
    if (!adManager.canMatchmake(supabaseId)) {
      console.warn(`[Matchmaking] 🚫 ${supabaseId} bloqueado (AD_MODE)`);
      return;
    }

    userSocketMap.set(supabaseId, socket.id);
    removeFromQueue(supabaseId);
    breakActiveMatch(io, supabaseId);

    console.log(`[Matchmaking] 👤 ${supabaseId} buscando match...`);

    // Sanear cola
    queue = queue.filter((uid) => isSocketAlive(io, uid));

    if (queue.length > 0) {
      const partnerUUID = queue.shift()!;
      if (!isSocketAlive(io, partnerUUID)) {
        queue.push(supabaseId);
        socket.emit("waiting");
        return;
      }
      const partnerSocketId = userSocketMap.get(partnerUUID)!;
      activeMatches.set(supabaseId, partnerUUID);
      activeMatches.set(partnerUUID, supabaseId);
      socket.emit("match-found", { partnerId: partnerUUID, isInitiator: true });
      io.to(partnerSocketId).emit("match-found", { partnerId: supabaseId, isInitiator: false });
      console.log(`[Matchmaking] ❤️  MATCH: ${supabaseId} <-> ${partnerUUID}`);
      return;
    }

    queue.push(supabaseId);
    socket.emit("waiting");
    console.log(`[Matchmaking] ⏳ ${supabaseId} en cola (total: ${queue.length})`);
  },

  handleLeave: (socket: Socket, io: Server) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;
    removeFromQueue(supabaseId);
    breakActiveMatch(io, supabaseId);
    console.log(`[Matchmaking] 🚪 ${supabaseId} salió.`);
  },

  getQueueLength: () => queue.length,
  getActiveMatchCount: () => activeMatches.size / 2,
};