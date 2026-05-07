import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import routes from "../routes/index";

import registerMatchmakingEvents from "../../realtime/events/matchmaking.events";
import registerWebRTCEvents from "../../webrtc/webrtc.events";
import registerChatEvents from "../../realtime/events/chat.events";
import registerAdEvents from "../../ad/ad.events";
import { matchmakingHandler } from "../../realtime/handlers/matchmaking.handler";

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

app.use("/api", routes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Usuario conectado:", socket.id);

  // ⚠️ ORDEN: Ad ANTES que Matchmaking.
  // registerAdEvents intercepta "find-match" con el guard de AD_MODE.
  // matchmaking.events también escucha "find-match" pero el guard del
  // handler lo bloquea si está en AD_MODE — doble seguridad.
  registerAdEvents(io, socket);
  registerMatchmakingEvents(io, socket);
  registerWebRTCEvents(io, socket);
  registerChatEvents(io, socket);

  socket.on("disconnect", () => {
    console.log("🔴 Usuario desconectado:", socket.id);
    matchmakingHandler.handleLeave(socket, io);
  });
});

const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Sistema único (API + Video) corriendo en el puerto ${PORT}`);
});