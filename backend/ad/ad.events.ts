/**
 * ad.events.ts — Socket Events para el sistema de anuncios
 *
 * BUGS CORREGIDOS:
 *   1. "ad-done" ahora se emite SOLO después de "ad-completed" del cliente.
 *      Antes había un path donde matchmakingHandler.handleFindMatch() podía
 *      triggear "ad-done" indirectamente, cerrando el overlay antes de tiempo.
 *
 *   2. Los skips no se reiniciaban sin recargar: el servidor ya reseteaba
 *      skipCount en adManager, pero el frontend nunca recibía la confirmación
 *      limpia porque el flujo se cortaba. Ahora "ad-done" siempre llega.
 *
 *   3. El matchmaking post-anuncio se inicia automáticamente DESPUÉS de
 *      emitir "ad-done" (con un tick de delay para que el cliente procese
 *      el reset de estado primero).
 *
 * Eventos que escucha:
 *   "skip"          → Usuario hizo skip
 *   "ad-completed"  → Frontend confirma que el usuario esperó el anuncio
 *   "find-match"    → Bloqueado en AD_MODE (guard de último recurso)
 *
 * Eventos que emite:
 *   "show-ad"       → Muestra el overlay con token único
 *   "ad-done"       → Anuncio validado, overlay puede cerrarse
 *   "ad-error"      → Validación fallida, reintentar
 *   "skip-count"    → Contador actual para la UI
 */

import { Server, Socket } from "socket.io";
import { adManager } from "../ad/ad.manager";
import { matchmakingHandler } from "../realtime/handlers/matchmaking.handler";

export default function registerAdEvents(io: Server, socket: Socket) {
  const supabaseId = socket.handshake.query.userId as string;
  if (!supabaseId) return;

  /**
   * "skip": el usuario presionó PASAR.
   * Registra el skip y decide si mostrar anuncio o seguir con matchmaking.
   */
  socket.on("skip", () => {
    console.log(`[AdEvents] ⏭️  Skip de ${supabaseId}`);

    // Notificar al compañero actual que fue saltado
    matchmakingHandler.handleLeave(socket, io);

    const result = adManager.recordSkip(supabaseId);

    // Informar el contador actual al cliente
    socket.emit("skip-count", {
      count:     result.skipCount,
      threshold: 8,
      remaining: Math.max(0, 8 - result.skipCount),
    });

    if (result.showAd) {
      // ── MODO ANUNCIO ─────────────────────────────────────────────────
      console.log(`[AdEvents] 📺 show-ad → ${supabaseId} (token: ${result.adToken?.slice(0, 8)}...)`);
      socket.emit("show-ad", {
        token: result.adToken,
        type:  "popunder",
      });
      // NO hacemos nada más aquí — esperamos "ad-completed" del cliente
    } else {
      // ── MATCHMAKING NORMAL ───────────────────────────────────────────
      matchmakingHandler.handleFindMatch(io, socket);
    }
  });

  /**
   * "ad-completed": el frontend confirma que el usuario vio el anuncio.
   *
   * FLUJO CORRECTO:
   *   1. Validar token + tiempo mínimo
   *   2. Emitir "ad-done" → cliente cierra overlay y resetea skipInfo
   *   3. DESPUÉS (nextTick) iniciar matchmaking automáticamente
   *
   * El delay entre "ad-done" y handleFindMatch es intencional:
   * el cliente necesita un tick para procesar el reset de estado
   * antes de recibir "match-found" o "waiting".
   */
  socket.on("ad-completed", ({ token }: { token: string }) => {
    console.log(`[AdEvents] 🏁 ad-completed de ${supabaseId}`);

    const valid = adManager.validateAdCompleted(supabaseId, token);

    if (valid) {
      // BUG FIX: emitir "ad-done" PRIMERO, SIEMPRE, antes de cualquier otra cosa
      socket.emit("ad-done");
      console.log(`[AdEvents] ✅ ad-done emitido a ${supabaseId}`);

      // Iniciar matchmaking en el siguiente tick para dar tiempo al cliente
      // de procesar "ad-done" y actualizar su estado antes de recibir
      // "match-found" o "waiting"
      setImmediate(() => {
        matchmakingHandler.handleFindMatch(io, socket);
      });
    } else {
      // Validación fallida → forzar nuevo ciclo de anuncio
      console.warn(`[AdEvents] 🚨 Validación fallida para ${supabaseId}`);
      socket.emit("ad-error", { message: "El anuncio no fue completado correctamente." });
    }
  });

  /**
   * Guard de último recurso: bloquear "find-match" directo en AD_MODE.
   * Esto cubre cualquier bypass directo desde el cliente.
   */
  socket.on("find-match", () => {
    if (!adManager.canMatchmake(supabaseId)) {
      console.warn(`[AdEvents] 🚫 find-match bloqueado — ${supabaseId} en AD_MODE`);
      // Re-emitir show-ad sin token (el cliente mostrará el overlay desde cero)
      socket.emit("show-ad", { token: null, type: "popunder" });
      return;
    }
    matchmakingHandler.handleFindMatch(io, socket);
  });
}