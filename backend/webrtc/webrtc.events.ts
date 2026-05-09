import { Server, Socket } from "socket.io";

// Mapa compartido: supabaseUserId → socketId
// Se exporta para que matchmaking.handler lo use también
export const userSocketMap = new Map<string, string>();

export default function registerWebRTCEvents(io: Server, socket: Socket) {

  // ✅ userId verificado desde socket.data (puesto por el middleware JWT)
  // Ya NO se lee de socket.handshake.query.userId (era falsificable)
  const supabaseId = socket.data.userId as string;

  if (supabaseId) {
    userSocketMap.set(supabaseId, socket.id);
    console.log(`[WebRTC] Registrado: ${supabaseId} → ${socket.id}`);
  }

  // Cola de ICE candidates pendientes por userId
  // Cubre el caso: candidates llegan antes que offer/answer (timing race)
  const pendingCandidates = new Map<string, any[]>();

  // Retransmitir señales WebRTC
  socket.on("signal", ({ to, data }) => {
    if (!to || !data) return;

    const targetSocketId = userSocketMap.get(to);

    if (!targetSocketId) {
      console.warn(`[WebRTC] No se encontró socket para userId: ${to}`);
      return;
    }

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      console.warn(`[WebRTC] Socket desconectado para userId: ${to}`);
      userSocketMap.delete(to);
      return;
    }

    targetSocket.emit("signal", {
      from: supabaseId,
      data,
    });
  });

  // Limpiar al desconectar
  socket.on("disconnect", () => {
    if (supabaseId) {
      userSocketMap.delete(supabaseId);
      pendingCandidates.delete(supabaseId);
      console.log(`[WebRTC] Desregistrado: ${supabaseId}`);
    }
  });
}