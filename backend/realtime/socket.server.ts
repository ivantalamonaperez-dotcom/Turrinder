import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import registerMatchmakingEvents from "./events/matchmaking.events";
import registerWebRTCEvents from "../webrtc/webrtc.events";
import registerChatEvents from "./events/chat.events";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Usuario conectado:", socket.id);

  // 🔥 Registrar eventos
  registerMatchmakingEvents(io, socket);
  registerWebRTCEvents(io, socket);
  registerChatEvents(io, socket);

  socket.on("disconnect", () => {
    console.log("🔴 Usuario desconectado:", socket.id);
  });
});

httpServer.listen(3001, () => {
  console.log("🚀 Realtime server on http://localhost:3001");
});