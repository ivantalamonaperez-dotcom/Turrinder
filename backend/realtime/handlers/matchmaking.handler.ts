import { Socket, Server } from "socket.io";
import { userSocketMap } from "../../webrtc/webrtc.events";

/**
 * matchmaking.handler.ts — VERSIÓN REFORZADA
 *
 * Garantías del sistema:
 * ─────────────────────
 * 1. Un usuario solo puede estar en UN lugar a la vez:
 *    en cola  O  en activeMatches. Nunca en ambos.
 *
 * 2. Una sala (activeMatch) tiene EXACTAMENTE dos usuarios.
 *    El mapa es bidireccional: A→B y B→A.
 *    Antes de crear un match nuevo se destruye el anterior.
 *
 * 3. Al hacer skip/disconnect, el compañero recibe 'partner-left'
 *    y vuelve a buscar automáticamente (lo maneja useMatchmaking.ts).
 *
 * 4. La cola se sanea antes de cada emparejamiento para eliminar
 *    sockets stale (desconectados sin haber hecho disconnect limpio).
 */

let queue: string[] = [];

// Mapa bidireccional: supabaseId → supabaseId del compañero
const activeMatches = new Map<string, string>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Verifica si un userId tiene socket activo en este momento */
const isSocketAlive = (io: Server, userId: string): boolean => {
  const sid = userSocketMap.get(userId);
  if (!sid) return false;
  return io.sockets.sockets.has(sid);
};

/** Elimina un usuario de la cola si está */
const removeFromQueue = (userId: string) => {
  queue = queue.filter((id) => id !== userId);
};

/**
 * Rompe el match activo de un usuario y notifica a su compañero.
 * No dispara nueva búsqueda — eso lo hace el frontend al recibir 'partner-left'.
 */
const breakActiveMatch = (io: Server, userId: string) => {
  const partnerUUID = activeMatches.get(userId);
  if (!partnerUUID) return;

  activeMatches.delete(userId);
  activeMatches.delete(partnerUUID);

  console.log(`[Matchmaking] 💔 Match roto: ${userId} <-> ${partnerUUID}`);

  // Notificar al compañero si sigue conectado
  const partnerSid = userSocketMap.get(partnerUUID);
  if (partnerSid && io.sockets.sockets.has(partnerSid)) {
    io.to(partnerSid).emit("partner-left");
    console.log(`[Matchmaking] 📢 'partner-left' enviado a ${partnerUUID}`);
  }
};

// ─── Handler principal ───────────────────────────────────────────────────────

export const matchmakingHandler = {

  handleFindMatch: (io: Server, socket: Socket) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) {
      console.warn("[Matchmaking] find-match sin userId, ignorado.");
      return;
    }

    // Siempre actualizamos el mapa socket con el socket más reciente
    userSocketMap.set(supabaseId, socket.id);

    // ── PASO 1: Limpiar estado anterior del usuario ──────────────────────────
    removeFromQueue(supabaseId);
    breakActiveMatch(io, supabaseId); // si tenía match activo, lo rompe

    console.log(`[Matchmaking] 👤 ${supabaseId} buscando match...`);

    // ── PASO 2: Sanear la cola (eliminar sockets muertos) ────────────────────
    queue = queue.filter((uid) => isSocketAlive(io, uid));

    // ── PASO 3: Intentar emparejar ────────────────────────────────────────────
    if (queue.length > 0) {
      const partnerUUID = queue.shift()!; // sacamos el primero de la cola

      // Doble verificación: el compañero sigue vivo
      if (!isSocketAlive(io, partnerUUID)) {
        console.warn(`[Matchmaking] Compañero ${partnerUUID} ya no está vivo, descartado.`);
        // Nos metemos en cola en lugar de emparejar con un zombie
        queue.push(supabaseId);
        socket.emit("waiting");
        console.log(`[Matchmaking] ⏳ ${supabaseId} en cola (total: ${queue.length})`);
        return;
      }

      const partnerSocketId = userSocketMap.get(partnerUUID)!;

      // Registro bidireccional en activeMatches
      activeMatches.set(supabaseId, partnerUUID);
      activeMatches.set(partnerUUID, supabaseId);

      // ✅ Notificar a ambos con sus roles WebRTC
      socket.emit("match-found", { partnerId: partnerUUID, isInitiator: true });
      io.to(partnerSocketId).emit("match-found", { partnerId: supabaseId, isInitiator: false });

      console.log(`[Matchmaking] ❤️  MATCH: ${supabaseId} (iniciador) <-> ${partnerUUID}`);
      return;
    }

    // ── PASO 4: No hay nadie en cola → entrar a esperar ───────────────────────
    queue.push(supabaseId);
    socket.emit("waiting");
    console.log(`[Matchmaking] ⏳ ${supabaseId} en cola (total: ${queue.length})`);
  },

  handleLeave: (socket: Socket, io: Server) => {
    const supabaseId = socket.handshake.query.userId as string;
    if (!supabaseId) return;

    removeFromQueue(supabaseId);
    breakActiveMatch(io, supabaseId);

    console.log(`[Matchmaking] 🚪 ${supabaseId} salió.`);
  },

  // Expuesto para diagnóstico / tests
  getQueueLength: () => queue.length,
  getActiveMatchCount: () => activeMatches.size / 2,
};