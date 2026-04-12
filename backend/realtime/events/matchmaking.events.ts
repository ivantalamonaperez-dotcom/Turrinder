import { Server, Socket } from "socket.io";
import { matchmakingHandler } from "../handlers/matchmaking.handler";

export default function registerMatchmakingEvents(io: Server, socket: Socket) {
  
  // Cuando el usuario pulsa "Buscar" o "Next"
  socket.on("find-match", () => {
    matchmakingHandler.handleFindMatch(io, socket);
  });

  // Cuando el usuario pulsa "Stop" o abandona la sección
  socket.on("leave-matchmaking", () => {
    matchmakingHandler.handleLeave(socket, io);
  });
}