/**
 * matchmaking.events.ts — v2 · SALAS DINÁMICAS
 *
 * Eventos nuevos (además de los originales):
 *   "create-debate-room" → host registra la sala en el servidor
 *   "join-debate-room"   → participante solicita entrar a una sala
 *   "leave-debate-room"  → participante sale de una sala
 *   "close-debate-room"  → host cierra la sala manualmente
 *
 * Eventos que emite el servidor hacia el cliente:
 *   "debate-join-ok"         → entrada aceptada
 *   "debate-room-full"       → sala llena
 *   "debate-room-not-found"  → sala no existe
 *   "debate-room-closed"     → sala cerrada (host se fue o la cerró)
 */

import { Server, Socket } from "socket.io";
import { matchmakingHandler, MatchMode } from "../handlers/matchmaking.handler";

export default function registerMatchmakingEvents(io: Server, socket: Socket) {

  // ── Matchmaking clásico (discover / ligues) ────────────────────────────────

  socket.on("find-match", ({ mode }: { mode?: MatchMode } = {}) => {
    matchmakingHandler.handleFindMatch(io, socket, mode ?? "discover");
  });

  socket.on("leave-matchmaking", () => {
    matchmakingHandler.handleLeave(socket, io);
  });

  // ── Salas de debate dinámicas ──────────────────────────────────────────────

  /**
   * El host emite esto al abrir una sala de debate.
   * Registra la sala en el servidor con su capacidad máxima.
   */
  socket.on("create-debate-room", ({
    roomId,
    maxPeople,
    hostId,
  }: {
    roomId: string;
    maxPeople: number;
    hostId: string;
  }) => {
    if (!roomId || !hostId) return;
    matchmakingHandler.createDebateRoom(io, socket, roomId, maxPeople, hostId);
  });

  /**
   * Un participante quiere entrar a una sala de debate existente.
   * El servidor valida la capacidad y responde con "debate-join-ok" o "debate-room-full".
   */
  socket.on("join-debate-room", ({
    roomId,
    userId,
  }: {
    roomId: string;
    userId: string;
  }) => {
    if (!roomId || !userId) return;
    matchmakingHandler.joinDebateRoom(io, socket, roomId, userId);
  });

  /**
   * Un participante abandona la sala (click en "Salir" o cierre de tab).
   */
  socket.on("leave-debate-room", ({
    roomId,
    userId,
  }: {
    roomId: string;
    userId: string;
  }) => {
    if (!roomId || !userId) return;
    matchmakingHandler.leaveDebateRoom(io, socket, roomId, userId);
  });

  /**
   * El host cierra la sala manualmente.
   * Notifica a todos los miembros y destruye la sala del servidor.
   */
  socket.on("close-debate-room", ({ roomId }: { roomId: string }) => {
    if (!roomId) return;
    matchmakingHandler.closeDebateRoom(io, socket, roomId);
  });
}