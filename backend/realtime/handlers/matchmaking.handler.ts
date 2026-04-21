/**
 * matchmaking.handler.ts
 * - Previene self-match
 * - Previene cross-mode match (discover <-> ligues)
 * - Incluye el modo en el evento match-found para que el cliente pueda validar
 */

import { Socket, Server } from "socket.io";
import { userSocketMap } from "../../webrtc/webrtc.events";

export type MatchMode = "discover" | "ligues" | string;

const queues        = new Map<MatchMode, string[]>();
const activeMatches = new Map<string, string>();
// Registro del modo en que cada usuario está buscando
const userMode      = new Map<string, MatchMode>();

const getQueue = (mode: MatchMode): string[] => {
  if (!queues.has(mode)) queues.set(mode, []);
  return queues.get(mode)!;
};

const isSocketAlive = (io: Server, userId: string): boolean => {
  const sid = userSocketMap.get(userId);
  if (!sid) return false;
  return io.sockets.sockets.has(sid);
};

const removeFromAllQueues = (userId: string) => {
  queues.forEach((queue, mode) => {
    queues.set(mode, queue.filter(id => id !== userId));
  });
  userMode.delete(userId);
};

const breakActiveMatch = (io: Server, userId: string) => {
  const partnerId = activeMatches.get(userId);
  if (partnerId) {
    activeMatches.delete(userId);
    activeMatches.delete(partnerId);
    const partnerSocketId = userSocketMap.get(partnerId);
    if (partnerSocketId) io.to(partnerSocketId).emit("partner-left");
  }
};

export const matchmakingHandler = {
  handleFindMatch: (io: Server, socket: Socket, mode: MatchMode = "discover") => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;

    userSocketMap.set(supabaseId, socket.id);

    // Si ya tiene match activo en el MISMO modo, no interrumpir
    if (activeMatches.has(supabaseId)) {
      const currentMode = userMode.get(supabaseId);
      if (currentMode === mode) return;
      // Si cambió de modo, romper el match actual antes de continuar
      breakActiveMatch(io, supabaseId);
    }

    // Salir de cualquier cola previa
    removeFromAllQueues(supabaseId);

    // Registrar el modo actual del usuario
    userMode.set(supabaseId, mode);

    // Delay mínimo para dejar que el estado del cliente se estabilice
    setTimeout(() => {
      // Re-validar que el usuario no cambió de modo mientras esperaba
      const latestMode = userMode.get(supabaseId);
      if (latestMode !== mode) {
        console.log(`[Matchmaking] ⏭️  ${supabaseId.slice(0,8)} cambió de modo antes del delay, abortando "${mode}"`);
        return;
      }

      console.log(`[Matchmaking] 👤 ${supabaseId.slice(0,8)} buscando en "${mode}"`);

      let queue = getQueue(mode);

      // Limpiar la cola: sin muertos, sin el mismo usuario
      queue = queue.filter(uid => uid !== supabaseId && isSocketAlive(io, uid));
      queues.set(mode, queue);

      if (queue.length > 0) {
        const partnerUUID = queue.shift()!;

        // Validaciones antes de confirmar el match
        if (
          partnerUUID === supabaseId ||          // self-match
          !isSocketAlive(io, partnerUUID) ||     // partner desconectado
          userMode.get(partnerUUID) !== mode     // partner cambió de modo (cross-mode)
        ) {
          queue.push(supabaseId);
          socket.emit("waiting", { mode });
          return;
        }

        const partnerSocketId = userSocketMap.get(partnerUUID)!;
        activeMatches.set(supabaseId, partnerUUID);
        activeMatches.set(partnerUUID, supabaseId);

        // Incluimos el modo en el evento para que el cliente pueda verificar
        socket.emit("match-found", { partnerId: partnerUUID, isInitiator: true, mode });
        io.to(partnerSocketId).emit("match-found", { partnerId: supabaseId, isInitiator: false, mode });

        console.log(`[Matchmaking] ❤️  MATCH [${mode}]: ${supabaseId.slice(0,8)} <-> ${partnerUUID.slice(0,8)}`);
        return;
      }

      queue.push(supabaseId);
      socket.emit("waiting", { mode });
    }, 100);
  },

  handleLeave: (socket: Socket, io: Server) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);
  },

  handleDisconnect: (socket: Socket, io: Server) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;
    removeFromAllQueues(supabaseId);
    breakActiveMatch(io, supabaseId);
    userSocketMap.delete(supabaseId);
  },
};