/**
 * matchmaking.events.ts — v3 · FILTRO DE GÉNERO
 *
 * Cambio en "find-match":
 *   El cliente ahora puede enviar dos campos adicionales opcionales:
 *     genderFilter: "all" | "male" | "female"  — qué géneros quiere ver
 *     myGender:     "male" | "female" | "other" — cuál es su propio género
 *
 * El resto de eventos permanece igual.
 */

import { Server, Socket } from "socket.io";
import { matchmakingHandler, MatchMode, GenderFilter, UserGender } from "../handlers/matchmaking.handler";

export default function registerMatchmakingEvents(io: Server, socket: Socket) {

  // ── Matchmaking clásico (discover / ligues) ────────────────────────────────

  socket.on("find-match", ({
    mode,
    genderFilter,
    myGender,
  }: {
    mode?:         MatchMode;
    genderFilter?: GenderFilter;
    myGender?:     UserGender;
  } = {}) => {
    matchmakingHandler.handleFindMatch(
      io,
      socket,
      mode         ?? "discover",
      genderFilter ?? "all",
      myGender,
    );
  });

  socket.on("leave-matchmaking", () => {
    matchmakingHandler.handleLeave(socket, io);
  });

  // ── Salas de debate dinámicas (sin cambios) ────────────────────────────────

  socket.on("create-debate-room", ({
    roomId, maxPeople, hostId,
  }: { roomId: string; maxPeople: number; hostId: string }) => {
    if (!roomId || !hostId) return;
    matchmakingHandler.createDebateRoom(io, socket, roomId, maxPeople, hostId);
  });

  socket.on("join-debate-room", ({
    roomId, userId,
  }: { roomId: string; userId: string }) => {
    if (!roomId || !userId) return;
    matchmakingHandler.joinDebateRoom(io, socket, roomId, userId);
  });

  socket.on("leave-debate-room", ({
    roomId, userId,
  }: { roomId: string; userId: string }) => {
    if (!roomId || !userId) return;
    matchmakingHandler.leaveDebateRoom(io, socket, roomId, userId);
  });

  socket.on("close-debate-room", ({ roomId }: { roomId: string }) => {
    if (!roomId) return;
    matchmakingHandler.closeDebateRoom(io, socket, roomId);
  });
}