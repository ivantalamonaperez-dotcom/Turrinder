import { Server, Socket } from "socket.io";
import { matchmakingHandler } from "../handlers/matchmaking.handler";

export default function registerMatchmakingEvents(io: Server, socket: Socket) {
  // ELIMINADO: matchmakingHandler.handleFindMatch(io, socket);
  // No buscamos match automáticamente al conectar para evitar que el mensaje 
  // llegue al front antes de que este cargue sus listeners.

  socket.on("find-match", () => {
    console.log(`[Events] Recibido find-match de ${socket.id}`);
    matchmakingHandler.handleFindMatch(io, socket);
  });

  socket.on("leave-matchmaking", () => {
    matchmakingHandler.handleLeave(socket, io);
  });
}