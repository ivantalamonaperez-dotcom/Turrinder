import { Server, Socket } from "socket.io";
import { getPartner, removeSession } from "./webrtc.service";

export default function registerWebRTCEvents(io: Server, socket: Socket) {
  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", {
      from: socket.id,
      offer,
    });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", {
      from: socket.id,
      answer,
    });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  socket.on("endCall", () => {
    const partner = getPartner(socket.id);

    if (partner) {
      io.to(partner).emit("callEnded");
    }

    removeSession(socket.id);
  });
}