/**
 * matchmaking.handler.ts — v2 · SALAS DINÁMICAS
 *
 * NUEVO en esta versión:
 *  - Tipo de modo "debate-room:<roomId>" para salas creadas por hosts.
 *  - Las salas de debate son colas de espera únicas creadas al vuelo por el host.
 *  - Se auto-destruyen cuando no quedan usuarios después de EMPTY_ROOM_TTL_MS.
 *  - Se pueden cerrar manualmente con closeDebateRoom().
 *  - Máximo de participantes configurable por sala (hasta MAX_DEBATE_PARTICIPANTS).
 *
 * Modos predeterminados intactos: "discover" y "ligues".
 */

import { Socket, Server } from "socket.io";
import { userSocketMap } from "../../webrtc/webrtc.events";

export type MatchMode = "discover" | "ligues" | string;

/** Prefijo para identificar salas de debate dinámicas */
export const DEBATE_ROOM_PREFIX = "debate-room:";

/** Tiempo de gracia antes de destruir una sala vacía (ms) */
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000; // 5 minutos

/** Cap absoluto de participantes en salas de debate */
const MAX_DEBATE_PARTICIPANTS = 20;

// ─── Estado global ────────────────────────────────────────────────────────────

/** Cola de espera por modo. Clave: mode string. Valor: array de userIds. */
const queues = new Map<MatchMode, string[]>();

/** Match activos: userId → partnerId (para 1-a-1 discover/ligues). */
const activeMatches = new Map<string, string>();

/** Modo actual de búsqueda por usuario. */
const userMode = new Map<string, MatchMode>();

/**
 * Registro de salas de debate dinámicas.
 * Clave: roomId (sin prefijo). Valor: metadata de la sala.
 */
interface DebateRoomMeta {
  hostId: string;
  maxPeople: number;
  /** Set de userIds actualmente dentro de la sala */
  members: Set<string>;
  /** Timer de auto-limpieza cuando la sala queda vacía */
  emptyTimer: ReturnType<typeof setTimeout> | null;
}
const debateRooms = new Map<string, DebateRoomMeta>();

// ─── Helpers generales ────────────────────────────────────────────────────────

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
  queues.forEach((queue, mode) => {
    queues.set(mode, queue.filter(id => id !== userId));
  });
  userMode.delete(userId);
};

const breakActiveMatch = (io: Server, userId: string) => {
  const partnerId = activeMatches.get(userId);
  if (partnerId) {
    activeMatches.delete(userId);
    activeMatches.delete(partnerId);
    const partnerSocketId = userSocketMap.get(partnerId);
    if (partnerSocketId) io.to(partnerSocketId).emit("partner-left");
  }
};

// ─── Helpers de salas de debate dinámicas ─────────────────────────────────────

/**
 * Cancela el timer de vacío de una sala (si existe).
 */
function cancelEmptyTimer(roomId: string) {
  const meta = debateRooms.get(roomId);
  if (meta?.emptyTimer) {
    clearTimeout(meta.emptyTimer);
    meta.emptyTimer = null;
  }
}

/**
 * Programa la auto-destrucción de una sala si queda vacía.
 * Si vuelve a llenarse antes del TTL, se cancela.
 */
function scheduleEmptyCleanup(io: Server, roomId: string) {
  cancelEmptyTimer(roomId);
  const meta = debateRooms.get(roomId);
  if (!meta) return;

  if (meta.members.size === 0) {
    meta.emptyTimer = setTimeout(() => {
      console.log(`[DebateRooms] 🗑️  Sala "${roomId}" vacía por ${EMPTY_ROOM_TTL_MS / 60000} min. Auto-destruida.`);
      debateRooms.delete(roomId);
      // Limpiar la cola asociada a este roomId si quedó gente esperando
      queues.delete(`${DEBATE_ROOM_PREFIX}${roomId}`);
    }, EMPTY_ROOM_TTL_MS);
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export const matchmakingHandler = {

  // ── find-match (discover / ligues) ─────────────────────────────────────────

  handleFindMatch: (io: Server, socket: Socket, mode: MatchMode = "discover") => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;

    userSocketMap.set(supabaseId, socket.id);

    // Si ya tiene match activo en el mismo modo, no interrumpir
    if (activeMatches.has(supabaseId)) {
      const currentMode = userMode.get(supabaseId);
      if (currentMode === mode) return;
      breakActiveMatch(io, supabaseId);
    }

    removeFromAllQueues(supabaseId);
    userMode.set(supabaseId, mode);

    setTimeout(() => {
      const latestMode = userMode.get(supabaseId);
      if (latestMode !== mode) {
        console.log(`[Matchmaking] ⏭️  ${supabaseId.slice(0,8)} cambió de modo antes del delay, abortando "${mode}"`);
        return;
      }

      console.log(`[Matchmaking] 👤 ${supabaseId.slice(0,8)} buscando en "${mode}"`);

      let queue = getQueue(mode);
      queue = queue.filter(uid => uid !== supabaseId && isSocketAlive(io, uid));
      queues.set(mode, queue);

      if (queue.length > 0) {
        const partnerUUID = queue.shift()!;

        if (
          partnerUUID === supabaseId ||
          !isSocketAlive(io, partnerUUID) ||
          userMode.get(partnerUUID) !== mode
        ) {
          queue.push(supabaseId);
          socket.emit("waiting", { mode });
          return;
        }

        const partnerSocketId = userSocketMap.get(partnerUUID)!;
        activeMatches.set(supabaseId, partnerUUID);
        activeMatches.set(partnerUUID, supabaseId);

        socket.emit("match-found", { partnerId: partnerUUID, isInitiator: true, mode });
        io.to(partnerSocketId).emit("match-found", { partnerId: supabaseId, isInitiator: false, mode });

        console.log(`[Matchmaking] ❤️  MATCH [${mode}]: ${supabaseId.slice(0,8)} <-> ${partnerUUID.slice(0,8)}`);
        return;
      }

      queue.push(supabaseId);
      socket.emit("waiting", { mode });
    }, 100);
  },

  // ── Crear sala de debate dinámica ───────────────────────────────────────────

  /**
   * Llamado por el host al abrir una sala de debate.
   * Registra la sala en memoria y la sala queda lista para recibir participantes.
   */
  createDebateRoom: (io: Server, socket: Socket, roomId: string, maxPeople: number, hostId: string) => {
    const capped = Math.min(maxPeople, MAX_DEBATE_PARTICIPANTS);

    if (debateRooms.has(roomId)) {
      console.log(`[DebateRooms] ℹ️  Sala "${roomId}" ya existe, actualizando host.`);
      const meta = debateRooms.get(roomId)!;
      meta.hostId = hostId;
      meta.maxPeople = capped;
      cancelEmptyTimer(roomId);
    } else {
      debateRooms.set(roomId, {
        hostId,
        maxPeople: capped,
        members: new Set(),
        emptyTimer: null,
      });
      console.log(`[DebateRooms] 🏠 Sala "${roomId}" creada | cap: ${capped} | host: ${hostId.slice(0,8)}`);
    }

    // El host entra automáticamente
    const meta = debateRooms.get(roomId)!;
    meta.members.add(hostId);
    userSocketMap.set(hostId, socket.id);
  },

  // ── Unirse a sala de debate dinámica ────────────────────────────────────────

  /**
   * Un usuario quiere unirse a una sala de debate específica.
   * Se usa el sistema de cola interna con modo "debate-room:<roomId>".
   * La lógica de WebRTC (offer/answer) ocurre por Supabase Broadcast,
   * así que aquí solo validamos capacidad y emitimos "debate-join-ok" o "debate-full".
   */
  joinDebateRoom: (io: Server, socket: Socket, roomId: string, userId: string) => {
    const meta = debateRooms.get(roomId);

    if (!meta) {
      socket.emit("debate-room-not-found", { roomId });
      console.warn(`[DebateRooms] ⚠️  ${userId.slice(0,8)} intentó unirse a sala inexistente: ${roomId}`);
      return;
    }

    if (meta.members.size >= meta.maxPeople) {
      socket.emit("debate-room-full", { roomId, max: meta.maxPeople });
      console.log(`[DebateRooms] 🚫 Sala "${roomId}" llena (${meta.members.size}/${meta.maxPeople})`);
      return;
    }

    // Cancelar timer de vacío si estaba corriendo
    cancelEmptyTimer(roomId);

    meta.members.add(userId);
    userSocketMap.set(userId, socket.id);

    socket.emit("debate-join-ok", {
      roomId,
      hostId: meta.hostId,
      memberCount: meta.members.size,
      maxPeople: meta.maxPeople,
    });

    console.log(`[DebateRooms] ✅ ${userId.slice(0,8)} entró a sala "${roomId}" (${meta.members.size}/${meta.maxPeople})`);
  },

  // ── Salir de sala de debate ─────────────────────────────────────────────────

  leaveDebateRoom: (io: Server, socket: Socket, roomId: string, userId: string) => {
    const meta = debateRooms.get(roomId);
    if (!meta) return;

    meta.members.delete(userId);
    console.log(`[DebateRooms] 👋 ${userId.slice(0,8)} salió de sala "${roomId}" (${meta.members.size}/${meta.maxPeople})`);

    // Si es el host quien se fue, notificar a todos y cerrar
    if (meta.hostId === userId) {
      console.log(`[DebateRooms] 🔴 Host abandonó la sala "${roomId}". Cerrando.`);
      // Notificar a todos los miembros
      meta.members.forEach(memberId => {
        const sid = userSocketMap.get(memberId);
        if (sid) io.to(sid).emit("debate-room-closed", { roomId, reason: "host-left" });
      });
      debateRooms.delete(roomId);
      queues.delete(`${DEBATE_ROOM_PREFIX}${roomId}`);
      return;
    }

    // Programar auto-destrucción si queda vacía
    scheduleEmptyCleanup(io, roomId);
  },

  // ── Cerrar sala manualmente (host o admin) ─────────────────────────────────

  closeDebateRoom: (io: Server, socket: Socket, roomId: string) => {
    const meta = debateRooms.get(roomId);
    if (!meta) return;

    cancelEmptyTimer(roomId);

    // Notificar a todos los miembros restantes
    meta.members.forEach(memberId => {
      const sid = userSocketMap.get(memberId);
      if (sid) io.to(sid).emit("debate-room-closed", { roomId, reason: "host-closed" });
    });

    debateRooms.delete(roomId);
    queues.delete(`${DEBATE_ROOM_PREFIX}${roomId}`);

    console.log(`[DebateRooms] 🗑️  Sala "${roomId}" cerrada manualmente.`);
  },

  // ── leave-matchmaking (discover/ligues) ────────────────────────────────────

  handleLeave: (socket: Socket, io: Server) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);
  },

  // ── disconnect ─────────────────────────────────────────────────────────────

  handleDisconnect: (socket: Socket, io: Server) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;

    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);

    // Salir de cualquier sala de debate en la que estuviera
    debateRooms.forEach((meta, roomId) => {
      if (meta.members.has(supabaseId)) {
        matchmakingHandler.leaveDebateRoom(io, socket, roomId, supabaseId);
      }
    });

    userSocketMap.delete(supabaseId);
  },

  // ── Utilidades de inspección ───────────────────────────────────────────────

  getDebateRoomInfo: (roomId: string): DebateRoomMeta | undefined => {
    return debateRooms.get(roomId);
  },

  getActiveDebateRooms: (): Array<{ roomId: string; memberCount: number; maxPeople: number; hostId: string }> => {
    const result: Array<{ roomId: string; memberCount: number; maxPeople: number; hostId: string }> = [];
    debateRooms.forEach((meta, roomId) => {
      result.push({ roomId, memberCount: meta.members.size, maxPeople: meta.maxPeople, hostId: meta.hostId });
    });
    return result;
  },
};