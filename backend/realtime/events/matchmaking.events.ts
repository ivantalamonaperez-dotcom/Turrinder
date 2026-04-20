/**
 * matchmaking.events.ts — CON MODO
 *
 * CAMBIO: "find-match" vuelve a registrarse aquí porque el guard de AD_MODE
 * ya vive dentro del handler. El evento ahora recibe `{ mode }` del cliente
 * y lo pasa directamente a matchmakingHandler.handleFindMatch.
 *
 * El flujo en server.ts se mantiene igual:
 *   registerAdEvents → registerMatchmakingEvents → registerWebRTCEvents
 *
 * Si en algún momento querés volver a interceptar "find-match" en ad.events,
 * simplemente asegurate de que ad.events pase el `mode` al handler también.
 */

import { Server, Socket } from "socket.io";
import { matchmakingHandler, MatchMode } from "../handlers/matchmaking.handler";

export default function registerMatchmakingEvents(io: Server, socket: Socket) {

  socket.on("find-match", ({ mode }: { mode?: MatchMode } = {}) => {
    // Fallback a "discover" si el cliente no manda modo (retrocompatibilidad)
    matchmakingHandler.handleFindMatch(io, socket, mode ?? "discover");
  });

  socket.on("leave-matchmaking", () => {
    matchmakingHandler.handleLeave(socket, io);
  });
}