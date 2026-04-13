import { Socket, Server } from "socket.io";
import { userSocketMap } from "../../webrtc/webrtc.events"; // Asegúrate de que tu map se importe bien

let queue: string[] = [];
const activeMatches = new Map<string, string>();

export const matchmakingHandler = {
  handleFindMatch: (io: Server, socket: Socket) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;

    // ACTUALIZACIÓN DE SOCKET
    userSocketMap.set(supabaseId, socket.id);
    
    // 1. LIMPIEZA
    queue = queue.filter(id => id !== supabaseId);
    
    const oldPartnerUUID = activeMatches.get(supabaseId);
    if (oldPartnerUUID) {
      matchmakingHandler.handleLeave(socket, io);
    }
    
    console.log(`[Matchmaking] 👤 Usuario ${supabaseId} buscando...`);

    // 2. INTENTO DE EMPAREJAMIENTO
    queue = queue.filter(uid => {
      const sid = userSocketMap.get(uid);
      return sid && io.sockets.sockets.has(sid);
    });

    if (queue.length > 0) {
      const partnerUUID = queue.shift()!;
      const partnerSocketId = userSocketMap.get(partnerUUID);

      if (partnerSocketId && io.sockets.sockets.has(partnerSocketId)) {
        // Registro bidireccional
        activeMatches.set(supabaseId, partnerUUID);
        activeMatches.set(partnerUUID, supabaseId);
        
        // Notificar a ambos
        socket.emit("match-found", { partnerId: partnerUUID, isInitiator: true });
        io.to(partnerSocketId).emit("match-found", { partnerId: supabaseId, isInitiator: false });
        
        console.log(`[Matchmaking] ❤️ MATCH ÉXITO: ${supabaseId} <-> ${partnerUUID}`);
        return; // 🛑 CRUCIAL: Esto evita que el usuario se sume a la cola
      }
    }

    // 3. ENTRAR A COLA
    queue.push(supabaseId);
    socket.emit("waiting"); 
    console.log(`[Matchmaking] ⏳ En cola: ${supabaseId} (total: ${queue.length})`);
  },

  handleLeave: (socket: Socket, io: Server) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;

    queue = queue.filter(id => id !== supabaseId);

    const partnerUUID = activeMatches.get(supabaseId);
    if (partnerUUID) {
      const partnerSid = userSocketMap.get(partnerUUID);
      activeMatches.delete(supabaseId);
      activeMatches.delete(partnerUUID);
      if (partnerSid) {
        io.to(partnerSid).emit("partner-left");
      }
    }
    
    console.log(`[Matchmaking] 🚪 ${supabaseId} abandonó búsqueda/match.`);
  }
};
