import { Server, Socket } from "socket.io";
import {
  addToQueue,
  removeFromQueue,
  findMatch,
} from "../handlers/matchmaking.handler";
import { createSession } from "../../webrtc/webrtc.service";

export default function registerMatchmakingEvents(
  io: Server,
  socket: Socket
) {
  socket.on("joinQueue", () => {
    console.log("➡️ joinQueue:", socket.id);

    addToQueue(socket);

    const match = findMatch();

    if (match) {
      const [user1, user2] = match;

      createSession(user1.id, user2.id);

      user1.emit("matchFound", { partnerId: user2.id });
      user2.emit("matchFound", { partnerId: user1.id });
    }
  });

  socket.on("leaveQueue", () => {
    removeFromQueue(socket);
  });

  socket.on("disconnect", () => {
    removeFromQueue(socket);
  });
}