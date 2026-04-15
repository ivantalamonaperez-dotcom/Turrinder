/**
 * ad.events.ts — Socket Events para el sistema de anuncios
 *
 * Eventos que escucha:
 *   "skip"          → Usuario hizo skip (reemplaza el find-match directo)
 *   "ad-completed"  → Frontend dice que el anuncio terminó (con token)
 *
 * Eventos que emite:
 *   "show-ad"       → Decirle al frontend que muestre el anuncio (con token)
 *   "ad-done"       → Anuncio validado, puede volver a matchmaking
 *   "skip-count"    → Actualización del contador para la UI
 */

import { Server, Socket } from "socket.io";
import { adManager } from "../ad/ad.manager";
import { matchmakingHandler } from "../realtime/handlers/matchmaking.handler";

export default function registerAdEvents(io: Server, socket: Socket) {
  const supabaseId = socket.handshake.query.userId as string;
  if (!supabaseId) return;

  /**
   * "skip": el usuario presionó el botón PASAR.
   * 
   * ANTES el frontend emitía directamente "find-match".
   * AHORA emite "skip" y el servidor decide si hacer matchmaking
   * o entrar en AD_MODE.
   */
  socket.on("skip", () => {
    console.log(`[AdEvents] ⏭️  Skip de ${supabaseId}`);

    // Notificar al compañero actual que fue saltado
    matchmakingHandler.handleLeave(socket, io);

    // Registrar el skip
    const result = adManager.recordSkip(supabaseId);

    // Informar al usuario su contador actual
    socket.emit("skip-count", {
      count: result.skipCount,
      threshold: 8,
      remaining: Math.max(0, 8 - result.skipCount),
    });

    if (result.showAd) {
      // ── MODO ANUNCIO ──────────────────────────────────────────────────
      console.log(`[AdEvents] 📺 Enviando show-ad a ${supabaseId}`);
      socket.emit("show-ad", {
        token: result.adToken,  // El frontend DEBE devolver este token
        type: "interstitial",   // Tipo de anuncio para el frontend
      });
    } else {
      // ── CONTINUAR MATCHMAKING ────────────────────────────────────────
      matchmakingHandler.handleFindMatch(io, socket);
    }
  });

  /**
   * "ad-completed": el frontend reporta que el anuncio terminó.
   * Validamos con el token y solo entonces habilitamos el matchmaking.
   */
  socket.on("ad-completed", ({ token }: { token: string }) => {
    console.log(`[AdEvents] 🏁 ad-completed de ${supabaseId}`);

    const valid = adManager.validateAdCompleted(supabaseId, token);

    if (valid) {
      socket.emit("ad-done"); // ← El frontend puede volver a buscar
      // Iniciar búsqueda automáticamente
      matchmakingHandler.handleFindMatch(io, socket);
    } else {
      // Token inválido o tiempo insuficiente — forzar a mostrar otro anuncio
      console.warn(`[AdEvents] 🚨 Validación fallida para ${supabaseId}`);
      socket.emit("ad-error", { message: "El anuncio no fue completado correctamente." });
    }
  });

  /**
   * Override: bloquear "find-match" directo si está en AD_MODE.
   * Esto es la última línea de defensa contra bypass desde el frontend.
   */
  socket.on("find-match", () => {
    if (!adManager.canMatchmake(supabaseId)) {
      console.warn(`[AdEvents] 🚫 find-match bloqueado — ${supabaseId} está en AD_MODE`);
      socket.emit("show-ad", {
        // Si intenta bypass, re-enviamos el show-ad
        token: null, // Sin token, forzará ver anuncio desde cero
        type: "interstitial",
      });
      return;
    }
    // Si puede, delegar al matchmaking normal
    matchmakingHandler.handleFindMatch(io, socket);
  });
}