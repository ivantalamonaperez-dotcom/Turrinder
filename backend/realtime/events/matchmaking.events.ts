/**
 * matchmaking.events.ts — ACTUALIZADO
 *
 * CAMBIO: El listener "find-match" fue movido a ad.events.ts para que
 * pueda interceptarlo con el guard de AD_MODE.
 * Este archivo solo maneja "leave-matchmaking".
 */

import { Server, Socket } from "socket.io";
import { matchmakingHandler } from "../handlers/matchmaking.handler";

export default function registerMatchmakingEvents(io: Server, socket: Socket) {
  // "find-match" ya no se registra aquí — lo maneja ad.events.ts
  // con el guard de AD_MODE integrado.

  socket.on("leave-matchmaking", () => {
    matchmakingHandler.handleLeave(socket, io);
  });
}