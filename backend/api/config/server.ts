import express from "express";
import cors from "cors";
import { createServer } from "http"; 
import { Server } from "socket.io";   
import routes from "../routes/index"; // Verifica que la ruta sea correcta

// Importaciones desde las carpetas que me pasaste
import registerMatchmakingEvents from "../../realtime/events/matchmaking.events";
import registerWebRTCEvents from "../../webrtc/webrtc.events";
import registerChatEvents from "../../realtime/events/chat.events";
import { matchmakingHandler } from "../../realtime/handlers/matchmaking.handler";

const app = express();
app.use(cors());
app.use(express.json());

// 1. Rutas normales (Login, Perfil, etc.)
app.use("/api", routes);

// 2. Servidor de Sockets y Video
const httpServer = createServer(app); 
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Usuario conectado:", socket.id);

  registerMatchmakingEvents(io, socket);
  registerWebRTCEvents(io, socket);
  registerChatEvents(io, socket);

  socket.on("disconnect", () => {
    console.log("🔴 Usuario desconectado:", socket.id);
    matchmakingHandler.handleLeave(socket, io);
  });
});

// 3. Un solo puerto para TODO
const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Sistema único (API + Video) corriendo en el puerto ${PORT}`);
});