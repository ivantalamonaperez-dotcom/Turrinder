/**
 * matchmaking.events.ts — v4 · SEGURIDAD
 *
 * Cambios respecto a v3:
 *  - Validación estricta de todos los inputs antes de pasarlos al handler.
 *    Valores fuera de los permitidos son rechazados silenciosamente.
 *  - Rate limiting por socket: máximo 1 find-match por segundo.
 *    Evita que un cliente malicioso sature el servidor emitiendo en bucle.
 *  - Los IDs de sala y usuario se sanitizan (solo UUID válido o alfanumérico).
 *  - El userId ya NO viene del query — se lee desde socket.data.userId
 *    que fue verificado por el middleware JWT en server.ts.
 */

import { Server, Socket } from "socket.io";
import { matchmakingHandler, MatchMode, GenderFilter, UserGender } from "../handlers/matchmaking.handler";

// ─── Valores válidos para cada campo ─────────────────────────────────────────
const VALID_MODES:    Set<string>      = new Set(["discover", "ligues"]);
const VALID_FILTERS:  Set<GenderFilter> = new Set(["all", "male", "female"]);
const VALID_GENDERS:  Set<string>      = new Set(["male", "female", "other"]);

// Regex para validar UUIDs y roomIds alfanuméricos
const UUID_REGEX        = /^[0-9a-f-]{36}$/i;
const ROOM_ID_REGEX     = /^[a-zA-Z0-9_-]{1,64}$/;

// ─── Rate limiting en memoria ─────────────────────────────────────────────────
// Guarda el timestamp del último find-match por socketId
const lastFindMatch = new Map<string, number>();
const FIND_MATCH_COOLDOWN_MS = 1000; // 1 segundo mínimo entre requests

function isRateLimited(socketId: string): boolean {
  const now  = Date.now();
  const last = lastFindMatch.get(socketId) ?? 0;
  if (now - last < FIND_MATCH_COOLDOWN_MS) return true;
  lastFindMatch.set(socketId, now);
  return false;
}

// ─── Helpers de validación ────────────────────────────────────────────────────
function isValidMode(mode: unknown): mode is MatchMode {
  return typeof mode === "string" && VALID_MODES.has(mode);
}

function isValidFilter(filter: unknown): filter is GenderFilter {
  return typeof filter === "string" && (VALID_FILTERS as Set<string>).has(filter);
}

function isValidGender(gender: unknown): gender is UserGender {
  return gender === undefined || gender === null ||
    (typeof gender === "string" && (VALID_GENDERS as Set<string>).has(gender));
}

function isValidUUID(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id);
}

function isValidRoomId(id: unknown): id is string {
  return typeof id === "string" && ROOM_ID_REGEX.test(id);
}

// ─── Registro de eventos ──────────────────────────────────────────────────────
export default function registerMatchmakingEvents(io: Server, socket: Socket) {

  // ── Matchmaking clásico (discover / ligues) ────────────────────────────────

  socket.on("find-match", (payload: unknown) => {
    // Rate limiting — máximo 1 request por segundo
    if (isRateLimited(socket.id)) {
      console.warn(`[Matchmaking] ⚠️ Rate limit: ${socket.id}`);
      return;
    }

    // Validar que el payload sea un objeto
    if (typeof payload !== "object" || payload === null) return;

    const { mode, genderFilter, myGender } = payload as Record<string, unknown>;

    // Validar cada campo — si no es válido, usar el default seguro
    const safeMode:   MatchMode    = isValidMode(mode)       ? mode         : "discover";
    const safeFilter: GenderFilter = isValidFilter(genderFilter) ? genderFilter : "all";
    const safeGender: UserGender   = isValidGender(myGender)
      ? (myGender as UserGender)
      : undefined;

    matchmakingHandler.handleFindMatch(
      io,
      socket,
      safeMode,
      safeFilter,
      safeGender,
    );
  });

  socket.on("leave-matchmaking", () => {
    matchmakingHandler.handleLeave(socket, io);
  });

  // ── Salas de debate ────────────────────────────────────────────────────────

  socket.on("create-debate-room", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, maxPeople, hostId } = payload as Record<string, unknown>;

    if (!isValidRoomId(roomId))  return;
    if (!isValidUUID(hostId))    return;
    if (typeof maxPeople !== "number" || maxPeople < 2 || maxPeople > 20) return;

    matchmakingHandler.createDebateRoom(io, socket, roomId, maxPeople, hostId);
  });

  socket.on("join-debate-room", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, userId } = payload as Record<string, unknown>;

    if (!isValidRoomId(roomId)) return;
    if (!isValidUUID(userId))   return;

    matchmakingHandler.joinDebateRoom(io, socket, roomId, userId);
  });

  socket.on("leave-debate-room", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId, userId } = payload as Record<string, unknown>;

    if (!isValidRoomId(roomId)) return;
    if (!isValidUUID(userId))   return;

    matchmakingHandler.leaveDebateRoom(io, socket, roomId, userId);
  });

  socket.on("close-debate-room", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null) return;

    const { roomId } = payload as Record<string, unknown>;

    if (!isValidRoomId(roomId)) return;

    matchmakingHandler.closeDebateRoom(io, socket, roomId);
  });

  // ── Limpiar rate limit al desconectar ─────────────────────────────────────
  socket.on("disconnect", () => {
    lastFindMatch.delete(socket.id);
  });
}