import { Server, Socket } from "socket.io";

export default function registerWebRTCEvents(io: Server, socket: Socket) {
  socket.on("signal", ({ to, data }) => {
    if (to) {
      io.to(to).emit("signal", {
        from: socket.id,
        data: data
      });
    }
  });
}