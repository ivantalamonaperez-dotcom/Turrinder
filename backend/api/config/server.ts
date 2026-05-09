import dotenv from "dotenv";
dotenv.config();

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
import { createClient } from "@supabase/supabase-js";

// ─── Supabase admin client (solo para verificar tokens) ───────────────────────
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://turrinder.com";

app.use(cors({
  origin: ALLOWED_ORIGIN,
  credentials: true,
}));

app.use(express.json());
app.use("/api", routes);

// ─── HTTP + Socket.IO ─────────────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ─── Middleware de autenticación Socket.IO ────────────────────────────────────
// Verifica el JWT de Supabase ANTES de aceptar cualquier conexión.
// El cliente debe enviar el access_token en socket.auth.token
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error("AUTH_REQUIRED: No se proporcionó token"));
    }

    // Verificar el token con Supabase — esto valida firma y expiración
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return next(new Error("AUTH_INVALID: Token inválido o expirado"));
    }

    // Guardar el userId verificado en socket.data para usarlo en los handlers
    // A partir de aquí, socket.data.userId es confiable — viene de Supabase
    socket.data.userId = user.id;

    next();
  } catch (err) {
    console.error("[Auth Middleware] Error inesperado:", err);
    next(new Error("AUTH_ERROR: Error interno de autenticación"));
  }
});

// ─── Conexiones ───────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("🟢 Usuario conectado:", socket.id, "| UUID:", socket.data.userId);

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

// ─── Arranque ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Sistema único (API + Video) corriendo en el puerto ${PORT}`);
});