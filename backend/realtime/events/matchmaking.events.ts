/**
 * matchmaking.events.ts — v5 · SEGURIDAD
 *
 * Cambios respecto a v4:
 *  - VALID_GENDERS ampliado con "non-binary" y "prefer-not-to-say" para
 *    cubrir "No binario" y "Prefiero no decir" del selector de género.
 *    En el handler ambos se tratan como género neutral ("ambos"), por lo
 *    que matchean con cualquier filtro de la otra persona.
 *  - isValidGender actualizado con la misma estrategia defensiva que el
 *    handler: acepta todo valor que no sea null/number/objeto, dejando
 *    la semántica de neutralidad al handler.
 */

import { Server, Socket } from "socket.io";
import { matchmakingHandler, MatchMode, GenderFilter, UserGender } from "../handlers/matchmaking.handler";

// ─── Valores válidos para cada campo ─────────────────────────────────────────
const VALID_MODES:    Set<string>      = new Set(["discover", "ligues"]);
const VALID_FILTERS:  Set<GenderFilter> = new Set(["all", "male", "female"]);

// Géneros reconocidos — "male" y "female" son binarios; todo lo demás
// (other, non-binary, prefer-not-to-say, etc.) se trata como neutral en el handler.
// Se usa un Set para la whitelist pero isValidGender también acepta cualquier
// string razonable que no sea null/number, para no romper si el frontend
// añade nuevas opciones en el futuro.
const VALID_GENDERS: Set<string> = new Set([
  "male",
  "female",
  "other",
  "non-binary",
  "prefer-not-to-say",
]);

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
  if (gender === undefined || gender === null) return true;
  // Aceptar cualquier string no vacío — el handler decide la semántica.
  // Rechazar solo tipos no-string para evitar inyecciones.
  return typeof gender === "string" && gender.length > 0 && gender.length <= 64;
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