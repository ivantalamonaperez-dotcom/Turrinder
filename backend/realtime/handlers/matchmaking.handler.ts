/**
 * matchmaking.handler.ts — v5
 *
 * Fixes respecto a v4:
 *  - FIX: el setTimeout de 100ms en handleFindMatch causaba que en React
 *    Strict Mode (doble mount) el segundo emitLeave + findNewMatch borrara
 *    userMode antes de que el timer disparara, abortando la búsqueda
 *    silenciosamente. Solución: almacenar un "searchToken" por usuario y
 *    verificar que siga vigente cuando el timer dispara.
 *  - FIX: handleDisconnect ya no borra la entrada de userSocketMap si el
 *    usuario se reconectó con un socket distinto mientras procesábamos
 *    el disconnect del anterior. Comparamos el socketId antes de borrar.
 *  - El resto de la lógica de matchmaking y género no cambia.
 */

import { Socket, Server } from "socket.io";
import { userSocketMap } from "../../webrtc/webrtc.events";

export type MatchMode    = "discover" | "ligues" | string;
export type GenderFilter = "all" | "male" | "female";
export type UserGender   = "male" | "female" | "other" | undefined;

export const DEBATE_ROOM_PREFIX = "debate-room:";

const EMPTY_ROOM_TTL_MS      = 5 * 60 * 1000;
const MAX_DEBATE_PARTICIPANTS = 20;

// ─── Estado global ────────────────────────────────────────────────────────────
const queues           = new Map<MatchMode, string[]>();
const activeMatches    = new Map<string, string>();
const userMode         = new Map<string, MatchMode>();
const userGenderFilter = new Map<string, GenderFilter>();
const userGender       = new Map<string, UserGender>();

// FIX: token de búsqueda por usuario.
// Cada vez que se llama handleFindMatch se genera un token nuevo (timestamp).
// El setTimeout lo lee al disparar y lo compara con el actual — si no coincide
// significa que hubo un leave/nuevo find-match entre medio, y aborta.
// Esto resuelve el race condition con React Strict Mode y reconnects rápidos.
const userSearchToken  = new Map<string, number>();

// ─── Salas de debate ──────────────────────────────────────────────────────────
interface DebateRoomMeta {
  hostId:     string;
  maxPeople:  number;
  members:    Set<string>;
  emptyTimer: ReturnType<typeof setTimeout> | null;
}
const debateRooms = new Map<string, DebateRoomMeta>();

// ─── Helpers generales ────────────────────────────────────────────────────────

function getVerifiedUserId(socket: Socket): string | null {
  const id = socket.data?.userId;
  if (typeof id !== "string" || !id) return null;
  return id;
}

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
    queues.set(mode, queue.filter((id) => id !== userId));
  });
  userMode.delete(userId);
  // FIX: invalidar el token de búsqueda al salir de la cola.
  // Cualquier setTimeout pendiente de este usuario verá el token distinto y abortará.
  userSearchToken.delete(userId);
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

// ─── Compatibilidad de género ─────────────────────────────────────────────────
function gendersCompatible(userA: string, userB: string): boolean {
  const filterA = userGenderFilter.get(userA) ?? "all";
  const filterB = userGenderFilter.get(userB) ?? "all";
  const genderA = userGender.get(userA);
  const genderB = userGender.get(userB);

  const aSatisfied =
    filterA === "all" ||
    genderB === undefined ||
    genderB === "other"  ||
    genderB === filterA;

  const bSatisfied =
    filterB === "all" ||
    genderA === undefined ||
    genderA === "other"  ||
    genderA === filterB;

  return aSatisfied && bSatisfied;
}

// ─── Helpers de salas de debate ───────────────────────────────────────────────
function cancelEmptyTimer(roomId: string) {
  const meta = debateRooms.get(roomId);
  if (meta?.emptyTimer) {
    clearTimeout(meta.emptyTimer);
    meta.emptyTimer = null;
  }
}

function scheduleEmptyCleanup(io: Server, roomId: string) {
  cancelEmptyTimer(roomId);
  const meta = debateRooms.get(roomId);
  if (!meta) return;
  if (meta.members.size === 0) {
    meta.emptyTimer = setTimeout(() => {
      console.log(`[DebateRooms] 🗑️  Sala "${roomId}" vacía. Auto-destruida.`);
      debateRooms.delete(roomId);
      queues.delete(`${DEBATE_ROOM_PREFIX}${roomId}`);
    }, EMPTY_ROOM_TTL_MS);
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
export const matchmakingHandler = {

  // ── find-match ─────────────────────────────────────────────────────────────
  handleFindMatch: (
    io:           Server,
    socket:       Socket,
    mode:         MatchMode    = "discover",
    genderFilter: GenderFilter = "all",
    myGender:     UserGender   = undefined,
  ) => {
    const supabaseId = getVerifiedUserId(socket);
    if (!supabaseId) {
      console.warn("[Matchmaking] ⚠️ Intento de find-match sin userId verificado");
      socket.disconnect(true);
      return;
    }

    userSocketMap.set(supabaseId, socket.id);
    userGenderFilter.set(supabaseId, genderFilter);
    userGender.set(supabaseId, myGender);

    if (activeMatches.has(supabaseId)) {
      const currentMode = userMode.get(supabaseId);
      if (currentMode === mode) return;
      breakActiveMatch(io, supabaseId);
    }

    removeFromAllQueues(supabaseId);
    userMode.set(supabaseId, mode);

    // FIX: generar un token único para esta búsqueda.
    // El closure del setTimeout captura este token y lo compara con el
    // almacenado al disparar. Si no coinciden, hubo un leave/re-find
    // entre medio y esta búsqueda quedó obsoleta.
    const searchToken = Date.now();
    userSearchToken.set(supabaseId, searchToken);

    setTimeout(() => {
      // Token check: si el token cambió, esta búsqueda fue cancelada
      if (userSearchToken.get(supabaseId) !== searchToken) {
        console.log(
          `[Matchmaking] ⏭️  ${supabaseId.slice(0, 8)} — búsqueda obsoleta (token inválido), descartando`
        );
        return;
      }

      // Verificar que el modo siga siendo el mismo
      const latestMode = userMode.get(supabaseId);
      if (latestMode !== mode) {
        console.log(
          `[Matchmaking] ⏭️  ${supabaseId.slice(0, 8)} cambió de modo antes del delay`
        );
        return;
      }

      console.log(
        `[Matchmaking] 👤 ${supabaseId.slice(0, 8)} buscando en "${mode}" | filtro: "${genderFilter}" | género: "${myGender ?? "?"}"`
      );

      let queue = getQueue(mode);
      queue     = queue.filter((uid) => uid !== supabaseId && isSocketAlive(io, uid));
      queues.set(mode, queue);

      let matchedIndex = -1;
      for (let i = 0; i < queue.length; i++) {
        const candidate = queue[i];

        if (
          candidate === supabaseId       ||
          !isSocketAlive(io, candidate)  ||
          userMode.get(candidate) !== mode
        ) continue;

        if (gendersCompatible(supabaseId, candidate)) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1) {
        const partnerUUID     = queue.splice(matchedIndex, 1)[0];
        queues.set(mode, queue);

        const partnerSocketId = userSocketMap.get(partnerUUID)!;
        activeMatches.set(supabaseId, partnerUUID);
        activeMatches.set(partnerUUID, supabaseId);

        socket.emit("match-found", { partnerId: partnerUUID, isInitiator: true,  mode });
        io.to(partnerSocketId).emit("match-found", { partnerId: supabaseId, isInitiator: false, mode });

        console.log(
          `[Matchmaking] ❤️  MATCH [${mode}]: ${supabaseId.slice(0, 8)} <-> ${partnerUUID.slice(0, 8)}`
        );
        return;
      }

      queue.push(supabaseId);
      queues.set(mode, queue);
      socket.emit("waiting", { mode });
    }, 100);
  },

  // ── Salas de debate ────────────────────────────────────────────────────────
  createDebateRoom: (
    io: Server, socket: Socket,
    roomId: string, maxPeople: number, hostId: string
  ) => {
    const capped = Math.min(maxPeople, MAX_DEBATE_PARTICIPANTS);
    if (debateRooms.has(roomId)) {
      const meta     = debateRooms.get(roomId)!;
      meta.hostId    = hostId;
      meta.maxPeople = capped;
      cancelEmptyTimer(roomId);
    } else {
      debateRooms.set(roomId, {
        hostId,
        maxPeople: capped,
        members:   new Set(),
        emptyTimer: null,
      });
      console.log(`[DebateRooms] 🏠 Sala "${roomId}" creada | cap: ${capped}`);
    }
    const meta = debateRooms.get(roomId)!;
    meta.members.add(hostId);
    userSocketMap.set(hostId, socket.id);
  },

  joinDebateRoom: (
    io: Server, socket: Socket,
    roomId: string, userId: string
  ) => {
    const meta = debateRooms.get(roomId);
    if (!meta) {
      socket.emit("debate-room-not-found", { roomId });
      return;
    }
    if (meta.members.size >= meta.maxPeople) {
      socket.emit("debate-room-full", { roomId, max: meta.maxPeople });
      return;
    }
    cancelEmptyTimer(roomId);
    meta.members.add(userId);
    userSocketMap.set(userId, socket.id);
    socket.emit("debate-join-ok", {
      roomId,
      hostId:      meta.hostId,
      memberCount: meta.members.size,
      maxPeople:   meta.maxPeople,
    });
  },

  leaveDebateRoom: (
    io: Server, socket: Socket,
    roomId: string, userId: string
  ) => {
    const meta = debateRooms.get(roomId);
    if (!meta) return;
    meta.members.delete(userId);
    if (meta.hostId === userId) {
      meta.members.forEach((memberId) => {
        const sid = userSocketMap.get(memberId);
        if (sid) io.to(sid).emit("debate-room-closed", { roomId, reason: "host-left" });
      });
      debateRooms.delete(roomId);
      queues.delete(`${DEBATE_ROOM_PREFIX}${roomId}`);
      return;
    }
    scheduleEmptyCleanup(io, roomId);
  },

  closeDebateRoom: (io: Server, socket: Socket, roomId: string) => {
    const meta = debateRooms.get(roomId);
    if (!meta) return;
    cancelEmptyTimer(roomId);
    meta.members.forEach((memberId) => {
      const sid = userSocketMap.get(memberId);
      if (sid) io.to(sid).emit("debate-room-closed", { roomId, reason: "host-closed" });
    });
    debateRooms.delete(roomId);
    queues.delete(`${DEBATE_ROOM_PREFIX}${roomId}`);
  },

  // ── leave / disconnect ─────────────────────────────────────────────────────
  handleLeave: (socket: Socket, io: Server) => {
    const supabaseId = getVerifiedUserId(socket);
    if (!supabaseId) return;
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);
  },

  handleDisconnect: (socket: Socket, io: Server) => {
    const supabaseId = getVerifiedUserId(socket);
    if (!supabaseId) return;

    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);

    debateRooms.forEach((meta, roomId) => {
      if (meta.members.has(supabaseId)) {
        matchmakingHandler.leaveDebateRoom(io, socket, roomId, supabaseId);
      }
    });

    // FIX: solo borrar userSocketMap si el socketId registrado sigue siendo
    // el del socket que se está desconectando. Si el usuario ya reconectó
    // con un socket nuevo, su entrada apunta al nuevo socket — no borrarla.
    if (userSocketMap.get(supabaseId) === socket.id) {
      userSocketMap.delete(supabaseId);
    }

    userGenderFilter.delete(supabaseId);
    userGender.delete(supabaseId);
  },

  // ── Utilidades ─────────────────────────────────────────────────────────────
  getDebateRoomInfo: (roomId: string) => debateRooms.get(roomId),

  getActiveDebateRooms: () => {
    const result: Array<{
      roomId: string; memberCount: number; maxPeople: number; hostId: string;
    }> = [];
    debateRooms.forEach((meta, roomId) => {
      result.push({
        roomId,
        memberCount: meta.members.size,
        maxPeople:   meta.maxPeople,
        hostId:      meta.hostId,
      });
    });
    return result;
  },
};