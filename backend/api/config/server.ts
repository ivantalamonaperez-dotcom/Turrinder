import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";

import routes from "../routes/index";

// existentes
import registerMatchmakingEvents from "../../realtime/events/matchmaking.events";
import registerWebRTCEvents from "../../webrtc/webrtc.events";
import registerChatEvents from "../../realtime/events/chat.events";
import registerAdEvents from "../../ad/ad.events";
import { matchmakingHandler } from "../../realtime/handlers/matchmaking.handler";

// NUEVO debates
import registerDebatesEvents from "../../realtime/debates/events/debates.events";
import { debateHandler } from "../../realtime/handlers/debate.handler";
// ─────────────────────────────────────────────────────────────
// Supabase admin client
// ─────────────────────────────────────────────────────────────
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────────────────────
// Express
// ─────────────────────────────────────────────────────────────
const app = express();

const ALLOWED_ORIGIN =
  process.env.FRONTEND_URL || "https://turrinder.com";

app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use("/api", routes);

// healthcheck opcional
app.get("/health", (_, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// ─────────────────────────────────────────────────────────────
// HTTP + Socket.IO
// ─────────────────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },

  transports: ["websocket", "polling"],

  pingInterval: 25000,
  pingTimeout: 20000,

  maxHttpBufferSize: 1e6,
});

// ─────────────────────────────────────────────────────────────
// Auth middleware Socket.IO
// ─────────────────────────────────────────────────────────────
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error("AUTH_REQUIRED"));
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return next(new Error("AUTH_INVALID"));
    }

    socket.data.userId = user.id;

    next();
  } catch (err) {
    console.error("[SOCKET AUTH ERROR]", err);
    next(new Error("AUTH_ERROR"));
  }
});

// ─────────────────────────────────────────────────────────────
// Connections
// ─────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  const userId = socket.data.userId as string;

  console.log("🟢 Socket conectado:", socket.id, "| user:", userId);

  // IMPORTANTE:
  // No rompemos lógica existente.
  // Se mantienen tus módulos actuales.
  registerAdEvents(io, socket);
  registerMatchmakingEvents(io, socket);
  registerWebRTCEvents(io, socket);
  registerChatEvents(io, socket);

  // NUEVO módulo separado debates
  registerDebatesEvents(io, socket);

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket desconectado:", socket.id, "|", reason);

    // lógica vieja
    matchmakingHandler.handleLeave(socket, io);

    // lógica nueva debates
    debateHandler.handleDisconnect(io, socket);
  });
});

// ─────────────────────────────────────────────────────────────
// Limpieza automática cada 60s
// ─────────────────────────────────────────────────────────────
setInterval(() => {
  try {
    debateHandler.runMaintenance(io);
  } catch (e) {
    console.error("[Debates Maintenance Error]", e);
  }
}, 60_000);

// ─────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 3001);

httpServer.listen(PORT, () => {
  console.log(`🚀 Sistema único corriendo en puerto ${PORT}`);
});