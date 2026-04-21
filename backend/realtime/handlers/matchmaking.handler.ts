/**
 * matchmaking.handler.ts — VERSIÓN SIMPLE + COLAS POR MODO
 *
 * Volvemos a la lógica original que funcionaba, solo agregamos
 * el soporte de múltiples colas por modo.
 *
 * Sin debounce (causaba que los usuarios salieran de la cola antes
 * de que el otro llegara). Sin anti-loop por ahora (se puede
 * agregar después cuando la conexión básica funcione).
 */

import { Socket, Server } from "socket.io";
import { userSocketMap } from "../../webrtc/webrtc.events";
import { adManager } from "../../ad/ad.manager";

export type MatchMode = "discover" | "ligues" | string;

// ── Estado ───────────────────────────────────────────────────────────────────

/** Una cola por modo */
const queues        = new Map<MatchMode, string[]>();
const activeMatches = new Map<string, string>();

// ── Helpers ──────────────────────────────────────────────────────────────────

const getQueue = (mode: MatchMode): string[] => {
  if (!queues.has(mode)) queues.set(mode, []);
  return queues.get(mode)!;
};

const isSocketAlive = (io: Server, userId: string): boolean => {
  const sid = userSocketMap.get(userId);
  if (!sid) return false;
  return io.sockets.sockets.has(sid);
};

const removeFromAllQueues = (userId: string) => {
  for (const [, q] of queues) {
    const idx = q.indexOf(userId);
    if (idx !== -1) q.splice(idx, 1);
  }
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

// ── Handler ──────────────────────────────────────────────────────────────────

export const matchmakingHandler = {
  handleFindMatch: (io: Server, socket: Socket, mode: MatchMode = "discover") => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;

    if (!adManager.canMatchmake(supabaseId)) {
      console.warn(`[Matchmaking] 🚫 ${supabaseId} bloqueado (AD_MODE)`);
      return;
    }

    userSocketMap.set(supabaseId, socket.id);
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);

    console.log(`[Matchmaking] 👤 ${supabaseId} buscando match en modo "${mode}"...`);

    // Sanear cola del modo
    const queue = getQueue(mode);
    queues.set(mode, queue.filter((uid) => isSocketAlive(io, uid)));

    if (queue.length > 0) {
      const partnerUUID = queue.shift()!;

      if (!isSocketAlive(io, partnerUUID)) {
        queue.push(supabaseId);
        socket.emit("waiting", { mode });
        return;
      }

      const partnerSocketId = userSocketMap.get(partnerUUID)!;
      activeMatches.set(supabaseId, partnerUUID);
      activeMatches.set(partnerUUID, supabaseId);

      socket.emit("match-found",                { partnerId: partnerUUID, isInitiator: true,  mode });
      io.to(partnerSocketId).emit("match-found", { partnerId: supabaseId,  isInitiator: false, mode });

      console.log(`[Matchmaking] ❤️  MATCH [${mode}]: ${supabaseId} <-> ${partnerUUID}`);
      return;
    }

    queue.push(supabaseId);
    socket.emit("waiting", { mode });
    console.log(`[Matchmaking] ⏳ ${supabaseId} en cola "${mode}" (total: ${queue.length})`);
  },

  handleLeave: (socket: Socket, io: Server) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);
    console.log(`[Matchmaking] 🚪 ${supabaseId} salió.`);
  },

  getQueueLength:     () => Array.from(queues.values()).reduce((a, q) => a + q.length, 0),
  getActiveMatchCount: () => activeMatches.size / 2,
};