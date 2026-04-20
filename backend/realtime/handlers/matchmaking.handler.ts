/**
 * matchmaking.handler.ts — COLAS POR MODO + ANTI-LOOP
 *
 * FIXES:
 *
 * 1. ANTI-LOOP (causa del ciclo match/romper infinito con 2 usuarios):
 *    Cuando A skipea a B → B recibe "partner-left" → B busca → encuentra A
 *    → match → A skipea → loop eterno.
 *
 *    Solución: cooldown de pareja reciente. Después de un match,
 *    ambos usuarios quedan en `recentPartners` durante RECENT_COOLDOWN_MS.
 *    Al buscar nuevo match, se saltean candidatos recientes y se los
 *    reintegra al final de la cola. Si no hay nadie más disponible,
 *    el usuario queda en cola esperando que expire el cooldown o llegue
 *    un tercero.
 *
 * 2. COLAS POR MODO: cada modo tiene su propia cola independiente.
 */

import { Socket, Server } from "socket.io";
import { userSocketMap } from "../../webrtc/webrtc.events";
import { adManager } from "../../ad/ad.manager";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type MatchMode = "discover" | "ligues" | string;

// ── Config ───────────────────────────────────────────────────────────────────

const RECENT_COOLDOWN_MS = 8_000;
const MAX_SKIP_ATTEMPTS  = 10;

// ── Estado ───────────────────────────────────────────────────────────────────

const queues        = new Map<MatchMode, string[]>();
const userMode      = new Map<string, MatchMode>();
const activeMatches = new Map<string, string>();
const recentPartners = new Map<string, Set<string>>();

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

const markRecentPartners = (a: string, b: string) => {
  if (!recentPartners.has(a)) recentPartners.set(a, new Set());
  if (!recentPartners.has(b)) recentPartners.set(b, new Set());
  recentPartners.get(a)!.add(b);
  recentPartners.get(b)!.add(a);
  setTimeout(() => {
    recentPartners.get(a)?.delete(b);
    recentPartners.get(b)?.delete(a);
  }, RECENT_COOLDOWN_MS);
};

const isRecentPartner = (userId: string, candidateId: string): boolean =>
  recentPartners.get(userId)?.has(candidateId) ?? false;

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
    userMode.set(supabaseId, mode);
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);

    console.log(`[Matchmaking] 👤 ${supabaseId} buscando match en modo "${mode}"...`);

    // Sanear cola del modo
    const queue = getQueue(mode);
    queues.set(mode, queue.filter((uid) => isSocketAlive(io, uid)));

    // Buscar candidato que no sea partner reciente
    let foundPartner: string | null = null;
    const skipped: string[] = [];
    let attempts = 0;

    while (queue.length > 0 && attempts < MAX_SKIP_ATTEMPTS) {
      attempts++;
      const candidate = queue.shift()!;

      if (!isSocketAlive(io, candidate)) continue;

      if (isRecentPartner(supabaseId, candidate)) {
        skipped.push(candidate);
        console.log(`[Matchmaking] ⏭️  Saltando partner reciente: ${candidate}`);
        continue;
      }

      foundPartner = candidate;
      break;
    }

    // Reintegrar los saltados al final
    for (const uid of skipped) queue.push(uid);

    if (foundPartner) {
      const partnerSocketId = userSocketMap.get(foundPartner)!;
      activeMatches.set(supabaseId, foundPartner);
      activeMatches.set(foundPartner, supabaseId);
      markRecentPartners(supabaseId, foundPartner);

      socket.emit("match-found",           { partnerId: foundPartner, isInitiator: true,  mode });
      io.to(partnerSocketId).emit("match-found", { partnerId: supabaseId, isInitiator: false, mode });

      console.log(`[Matchmaking] ❤️  MATCH [${mode}]: ${supabaseId} <-> ${foundPartner}`);
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
    userMode.delete(supabaseId);
    console.log(`[Matchmaking] 🚪 ${supabaseId} salió.`);
  },

  getStats: () => {
    const stats: Record<string, number> = {};
    for (const [mode, q] of queues) stats[mode] = q.length;
    return { queues: stats, activeMatches: activeMatches.size / 2 };
  },
};