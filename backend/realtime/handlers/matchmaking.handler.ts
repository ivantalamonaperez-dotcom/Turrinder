import { Socket, Server } from "socket.io";

// Cola de IDs esperando (Seguimos usando socket.id para la gestión de red)
let queue: string[] = []; 
// Mapa de parejas activas: [socketId]: partnerSocketId
const activeMatches = new Map<string, string>();

/** * NUEVO: Mapa para vincular Socket ID con UUID de Supabase 
 * [socketId]: supabaseUserId
 */
const socketToUser = new Map<string, string>();

const isSocketAlive = (io: Server, socketId: string): boolean => {
  return io.sockets.sockets.has(socketId);
};

export const matchmakingHandler = {
  
  handleFindMatch: (io: Server, socket: Socket) => {
    // EXTRAER el UUID que el front debe enviar al conectar (query params)
    const supabaseId = socket.handshake.query.userId as string;

    if (!supabaseId) {
      console.error(`❌ El socket ${socket.id} no envió userId de Supabase.`);
      return;
    }

    // Registrar la relación Socket <-> Supabase
    socketToUser.set(socket.id, supabaseId);

    matchmakingHandler.handleLeave(socket, io);
    queue = queue.filter(id => isSocketAlive(io, id));

    if (queue.length > 0) {
      const partnerSocketId = queue.shift()!;

      if (partnerSocketId === socket.id) {
        return matchmakingHandler.handleFindMatch(io, socket);
      }

      const partnerSocket = io.sockets.sockets.get(partnerSocketId);
      const partnerSupabaseId = socketToUser.get(partnerSocketId); // Obtener su UUID real

      if (partnerSocket && partnerSupabaseId) {
        activeMatches.set(socket.id, partnerSocketId);
        activeMatches.set(partnerSocketId, socket.id);

        // --- LA CLAVE ESTÁ AQUÍ ---
        // Enviamos el UUID de Supabase al partnerId, NO el socket.id
        socket.emit("match-found", { 
          partnerId: partnerSupabaseId, // UUID real para Supabase
          isInitiator: true 
        });

        partnerSocket.emit("match-found", { 
          partnerId: supabaseId, // Tu UUID real para su Supabase
          isInitiator: false 
        });
        
        console.log(`🎯 Match establecido: ${supabaseId} <-> ${partnerSupabaseId}`);
      } else {
        matchmakingHandler.handleFindMatch(io, socket);
      }
    } else {
      queue.push(socket.id);
      socket.emit("waiting", { message: "Buscando..." });
      socket.emit("match-found", { partnerId: null, isInitiator: false }); 
      console.log(`⏳ ${supabaseId} en cola.`);
    }
  },

  handleLeave: (socket: Socket, io: Server) => {
    // ... tu lógica de limpieza anterior ...
    const partnerId = activeMatches.get(socket.id);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit("partner-left");
      }
      activeMatches.delete(partnerId);
    }
    activeMatches.delete(socket.id);
    // Limpiamos también el mapa de usuarios al desconectar
    // socketToUser.delete(socket.id); // Opcional, mejor en el evento disconnect global
  }
};