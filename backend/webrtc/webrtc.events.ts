import { Server, Socket } from "socket.io";

// Mapa compartido: supabaseUserId → socketId
// Se exporta para que matchmaking.handler lo use también
export const userSocketMap = new Map<string, string>();

export default function registerWebRTCEvents(io: Server, socket: Socket) {

  // Registrar el userId de Supabase al conectar
  const supabaseId = socket.handshake.query.userId as string;
  if (supabaseId) {
    userSocketMap.set(supabaseId, socket.id);
    console.log(`[WebRTC] Registrado: ${supabaseId} → ${socket.id}`);
  }

  // Retransmitir señales WebRTC
  // El frontend envía `to` como UUID de Supabase — necesitamos convertirlo a socket.id
  socket.on("signal", ({ to, data }) => {
    if (!to || !data) return;

    // Resolver socket.id real desde UUID de Supabase
    const targetSocketId = userSocketMap.get(to);

    if (!targetSocketId) {
      console.warn(`[WebRTC] No se encontró socket para userId: ${to}`);
      return;
    }

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) {
      console.warn(`[WebRTC] Socket desconectado para userId: ${to}`);
      userSocketMap.delete(to); // Limpiar entrada stale
      return;
    }

    // Enviar señal — el `from` también como UUID para que el frontend pueda responder
    targetSocket.emit("signal", {
      from: supabaseId, // UUID de Supabase, no socket.id
      data,
    });
  });

  // Limpiar el mapa al desconectar
  socket.on("disconnect", () => {
    if (supabaseId) {
      userSocketMap.delete(supabaseId);
      console.log(`[WebRTC] Desregistrado: ${supabaseId}`);
    }
  });
}