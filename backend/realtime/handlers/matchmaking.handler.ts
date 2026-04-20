/**
 * matchmaking.handler.ts — COLAS POR MODO
 *
 * CAMBIO: En lugar de una sola `queue: string[]`, ahora hay una
 * `queues: Map<MatchMode, string[]>` donde cada modo tiene su propia
 * cola de espera. La lógica interna es idéntica a la versión anterior.
 *
 * Para agregar un modo nuevo en el futuro, basta con extender el tipo
 * MatchMode y no tocar nada más.
 */

import { Socket, Server } from "socket.io";
import { userSocketMap } from "../../webrtc/webrtc.events";
import { adManager } from "../../ad/ad.manager";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type MatchMode = "discover" | "ligues" | string;
// Usar `string` al final permite agregar modos nuevos sin tocar este archivo.

// ── Estado ───────────────────────────────────────────────────────────────────

/** Una cola por modo. Se crea lazy al primer usuario que la necesita. */
const queues = new Map<MatchMode, string[]>();

/** Qué modo está usando cada usuario actualmente. */
const userMode = new Map<string, MatchMode>();

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

    // ── GUARD: Bloquear si está en AD_MODE ──────────────────────────────
    if (!adManager.canMatchmake(supabaseId)) {
      console.warn(`[Matchmaking] 🚫 ${supabaseId} bloqueado (AD_MODE)`);
      return;
    }

    userSocketMap.set(supabaseId, socket.id);
    userMode.set(supabaseId, mode);
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);

    console.log(`[Matchmaking] 👤 ${supabaseId} buscando match en modo "${mode}"...`);

    // Sanear la cola de este modo
    const queue = getQueue(mode);
    const cleanQueue = queue.filter((uid) => isSocketAlive(io, uid));
    queues.set(mode, cleanQueue);

    if (cleanQueue.length > 0) {
      const partnerUUID = cleanQueue.shift()!;

      if (!isSocketAlive(io, partnerUUID)) {
        // El partner murió entre la limpieza y el shift — volver a esperar
        cleanQueue.push(supabaseId);
        socket.emit("waiting", { mode });
        return;
      }

      const partnerSocketId = userSocketMap.get(partnerUUID)!;
      activeMatches.set(supabaseId, partnerUUID);
      activeMatches.set(partnerUUID, supabaseId);

      socket.emit("match-found",          { partnerId: partnerUUID, isInitiator: true,  mode });
      io.to(partnerSocketId).emit("match-found", { partnerId: supabaseId, isInitiator: false, mode });

      console.log(`[Matchmaking] ❤️  MATCH [${mode}]: ${supabaseId} <-> ${partnerUUID}`);
      return;
    }

    cleanQueue.push(supabaseId);
    socket.emit("waiting", { mode });
    console.log(`[Matchmaking] ⏳ ${supabaseId} en cola "${mode}" (total: ${cleanQueue.length})`);
  },

  handleLeave: (socket: Socket, io: Server) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);
    userMode.delete(supabaseId);
    console.log(`[Matchmaking] 🚪 ${supabaseId} salió.`);
  },

  /** Estadísticas por modo — útil para debugging o un panel de admin */
  getStats: () => {
    const stats: Record<string, number> = {};
    for (const [mode, q] of queues) stats[mode] = q.length;
    return {
      queues: stats,
      activeMatches: activeMatches.size / 2,
    };
  },
};