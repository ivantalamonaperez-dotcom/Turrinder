import { Server, Socket } from "socket.io";

export default function registerChatEvents(io: Server, socket: Socket) {
  socket.on("sendMessage", ({ to, message }) => {
    io.to(to).emit("receiveMessage", {
      from: socket.id,
      message,
    });
  });
}