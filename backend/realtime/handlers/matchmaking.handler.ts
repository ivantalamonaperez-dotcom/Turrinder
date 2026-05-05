/**
 * matchmaking.handler.ts — v3 · FILTRO DE GÉNERO
 *
 * NUEVO en esta versión:
 *  - find-match acepta un campo opcional `genderFilter`: "all" | "male" | "female"
 *  - La cola almacena el perfil de género del usuario buscador.
 *  - Al hacer match, se valida compatibilidad bidireccional:
 *      A quiere ver género X  AND  B quiere ver género Y
 *      → solo hacen match si el género de A satisface el filtro de B y viceversa.
 *  - Si el filtro es "all", ese usuario acepta cualquier género.
 *  - El servidor consulta el género del usuario desde `userGender` (mapa en memoria),
 *    que se puebla cuando el cliente emite "find-match" junto con su propio género.
 *
 * NOTA: Para que el filtro funcione, el cliente debe enviar también su propio género
 * en el payload de "find-match":
 *   socket.emit("find-match", { mode, genderFilter, myGender })
 *
 * `myGender` puede ser "male" | "female" | "other" | undefined.
 * Si es undefined, ese usuario no será filtrado por nadie (equivale a "other").
 */

import { Socket, Server } from "socket.io";
import { userSocketMap } from "../../webrtc/webrtc.events";

export type MatchMode    = "discover" | "ligues" | string;
export type GenderFilter = "all" | "male" | "female";
export type UserGender   = "male" | "female" | "other" | undefined;

/** Prefijo para identificar salas de debate dinámicas */
export const DEBATE_ROOM_PREFIX = "debate-room:";

const EMPTY_ROOM_TTL_MS        = 5 * 60 * 1000;
const MAX_DEBATE_PARTICIPANTS  = 20;

// ─── Estado global ────────────────────────────────────────────────────────────

/** Cola de espera por modo. Clave: mode string. Valor: array de userIds. */
const queues = new Map<MatchMode, string[]>();

/** Match activos: userId → partnerId */
const activeMatches = new Map<string, string>();

/** Modo actual de búsqueda por usuario */
const userMode = new Map<string, MatchMode>();

/**
 * Filtro de género preferido por cada usuario (lo que QUIERE ver).
 * "all" = sin preferencia. "male" = solo hombres. "female" = solo mujeres.
 */
const userGenderFilter = new Map<string, GenderFilter>();

/**
 * Género propio de cada usuario (lo que ES).
 * Se usa para que el partner pueda filtrarlo.
 */
const userGender = new Map<string, UserGender>();

// ─── Salas de debate ──────────────────────────────────────────────────────────
interface DebateRoomMeta {
  hostId:    string;
  maxPeople: number;
  members:   Set<string>;
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
    queues.set(mode, queue.filter((id) => id !== userId));
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

// ─── Lógica de compatibilidad de género ──────────────────────────────────────

/**
 * Devuelve true si el filtro de A es compatible con el género de B, Y viceversa.
 *
 * Reglas:
 *   - Si el filtro es "all" → acepta cualquier género.
 *   - Si el género del candidato es undefined/"other" → pasa cualquier filtro.
 *   - En caso contrario → el género debe coincidir exactamente con el filtro.
 */
function gendersCompatible(userA: string, userB: string): boolean {
  const filterA = userGenderFilter.get(userA) ?? "all"; // lo que A quiere ver
  const filterB = userGenderFilter.get(userB) ?? "all"; // lo que B quiere ver
  const genderA = userGender.get(userA);                // lo que A es
  const genderB = userGender.get(userB);                // lo que B es

  // A ve a B → ¿el género de B satisface el filtro de A?
  const aSatisfied =
    filterA === "all" ||
    genderB === undefined ||
    genderB === "other" ||
    genderB === filterA;

  // B ve a A → ¿el género de A satisface el filtro de B?
  const bSatisfied =
    filterB === "all" ||
    genderA === undefined ||
    genderA === "other" ||
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
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;

    userSocketMap.set(supabaseId, socket.id);

    // Guardar preferencias de género del usuario
    userGenderFilter.set(supabaseId, genderFilter);
    userGender.set(supabaseId, myGender);

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
        console.log(`[Matchmaking] ⏭️  ${supabaseId.slice(0,8)} cambió de modo antes del delay`);
        return;
      }

      console.log(
        `[Matchmaking] 👤 ${supabaseId.slice(0,8)} buscando en "${mode}" | filtro: "${genderFilter}" | género: "${myGender ?? "?"}"`
      );

      let queue = getQueue(mode);
      // Limpiar sockets muertos y al propio usuario
      queue = queue.filter((uid) => uid !== supabaseId && isSocketAlive(io, uid));
      queues.set(mode, queue);

      // Buscar el primer candidato compatible en la cola
      let matchedIndex = -1;
      for (let i = 0; i < queue.length; i++) {
        const candidate = queue[i];

        if (
          candidate === supabaseId ||
          !isSocketAlive(io, candidate) ||
          userMode.get(candidate) !== mode
        ) continue;

        if (gendersCompatible(supabaseId, candidate)) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1) {
        const partnerUUID = queue.splice(matchedIndex, 1)[0];
        queues.set(mode, queue);

        const partnerSocketId = userSocketMap.get(partnerUUID)!;
        activeMatches.set(supabaseId, partnerUUID);
        activeMatches.set(partnerUUID, supabaseId);

        socket.emit("match-found", { partnerId: partnerUUID, isInitiator: true,  mode });
        io.to(partnerSocketId).emit("match-found", { partnerId: supabaseId,   isInitiator: false, mode });

        console.log(
          `[Matchmaking] ❤️  MATCH [${mode}]: ${supabaseId.slice(0,8)} <-> ${partnerUUID.slice(0,8)}`
        );
        return;
      }

      // Sin candidato compatible → cola de espera
      queue.push(supabaseId);
      queues.set(mode, queue);
      socket.emit("waiting", { mode });
    }, 100);
  },

  // ── Salas de debate (sin cambios) ─────────────────────────────────────────

  createDebateRoom: (io: Server, socket: Socket, roomId: string, maxPeople: number, hostId: string) => {
    const capped = Math.min(maxPeople, MAX_DEBATE_PARTICIPANTS);
    if (debateRooms.has(roomId)) {
      const meta = debateRooms.get(roomId)!;
      meta.hostId    = hostId;
      meta.maxPeople = capped;
      cancelEmptyTimer(roomId);
    } else {
      debateRooms.set(roomId, { hostId, maxPeople: capped, members: new Set(), emptyTimer: null });
      console.log(`[DebateRooms] 🏠 Sala "${roomId}" creada | cap: ${capped}`);
    }
    const meta = debateRooms.get(roomId)!;
    meta.members.add(hostId);
    userSocketMap.set(hostId, socket.id);
  },

  joinDebateRoom: (io: Server, socket: Socket, roomId: string, userId: string) => {
    const meta = debateRooms.get(roomId);
    if (!meta) { socket.emit("debate-room-not-found", { roomId }); return; }
    if (meta.members.size >= meta.maxPeople) { socket.emit("debate-room-full", { roomId, max: meta.maxPeople }); return; }
    cancelEmptyTimer(roomId);
    meta.members.add(userId);
    userSocketMap.set(userId, socket.id);
    socket.emit("debate-join-ok", { roomId, hostId: meta.hostId, memberCount: meta.members.size, maxPeople: meta.maxPeople });
  },

  leaveDebateRoom: (io: Server, socket: Socket, roomId: string, userId: string) => {
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
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);
  },

  handleDisconnect: (socket: Socket, io: Server) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);
    debateRooms.forEach((meta, roomId) => {
      if (meta.members.has(supabaseId)) {
        matchmakingHandler.leaveDebateRoom(io, socket, roomId, supabaseId);
      }
    });
    userSocketMap.delete(supabaseId);
    userGenderFilter.delete(supabaseId);
    userGender.delete(supabaseId);
  },

  // ── Utilidades ─────────────────────────────────────────────────────────────

  getDebateRoomInfo:    (roomId: string) => debateRooms.get(roomId),
  getActiveDebateRooms: () => {
    const result: Array<{ roomId: string; memberCount: number; maxPeople: number; hostId: string }> = [];
    debateRooms.forEach((meta, roomId) => {
      result.push({ roomId, memberCount: meta.members.size, maxPeople: meta.maxPeople, hostId: meta.hostId });
    });
    return result;
  },
};