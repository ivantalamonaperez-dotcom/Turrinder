/**
 * ad.events.ts — Corregido: siempre enviar token válido en show-ad
 *
 * BUG CORREGIDO:
 *   Antes, en el caso de bypass (find-match directo en AD_MODE),
 *   se enviaba token: null → el overlay del frontend se cerraba solo
 *   porque reportAdCompleted no tenía guard (ya corregido en useAd.ts).
 *   Ahora siempre enviamos el adToken existente del manager.
 */

import { Server, Socket } from "socket.io";
import { adManager } from "./ad.manager";
import { matchmakingHandler } from "../realtime/handlers/matchmaking.handler";

export default function registerAdEvents(io: Server, socket: Socket) {
  const supabaseId = socket.handshake.query.userId as string;
  if (!supabaseId) return;

  // "skip": usuario presionó PASAR
  socket.on("skip", () => {
    console.log(`[AdEvents] ⏭️  Skip de ${supabaseId}`);

    // Notificar al compañero actual
    matchmakingHandler.handleLeave(socket, io);

    // Registrar el skip
    const result = adManager.recordSkip(supabaseId);

    // Siempre informar el contador actual
    socket.emit("skip-count", {
      count: result.skipCount,
      threshold: 8,
      remaining: Math.max(0, 8 - result.skipCount),
    });

    if (result.showAd) {
      console.log(`[AdEvents] 📺 Enviando show-ad a ${supabaseId} (token: ${result.adToken?.slice(0, 8)}...)`);
      socket.emit("show-ad", {
        token: result.adToken, // Siempre string válido ahora
        type: "popunder",
      });
    } else {
      // Continuar matchmaking normal
      matchmakingHandler.handleFindMatch(io, socket);
    }
  });

  // "ad-completed": frontend dice que el anuncio terminó
  socket.on("ad-completed", ({ token }: { token: string }) => {
    console.log(`[AdEvents] 🏁 ad-completed de ${supabaseId}`);

    // Guard adicional server-side: token vacío = rechazar
    if (!token || token.trim() === "") {
      console.warn(`[AdEvents] 🚨 Token vacío de ${supabaseId} — rechazado`);
      socket.emit("ad-error", { message: "Token inválido." });
      return;
    }

    const valid = adManager.validateAdCompleted(supabaseId, token);

    if (valid) {
      socket.emit("ad-done");
      // Iniciar búsqueda automáticamente
      matchmakingHandler.handleFindMatch(io, socket);
    } else {
      console.warn(`[AdEvents] 🚨 Validación fallida para ${supabaseId}`);
      socket.emit("ad-error", { message: "El anuncio no fue completado correctamente." });
    }
  });

  // Guard: bloquear "find-match" directo si está en AD_MODE
  socket.on("find-match", () => {
    if (!adManager.canMatchmake(supabaseId)) {
      console.warn(`[AdEvents] 🚫 find-match bloqueado — ${supabaseId} en AD_MODE`);
      // Re-enviar show-ad con el token existente (no null)
      const currentState = adManager.getSkipCount(supabaseId);
      const result = adManager.recordSkip(supabaseId); // Esto retorna el token existente en AD_MODE
      socket.emit("show-ad", {
        token: result.adToken,
        type: "popunder",
      });
      return;
    }
    matchmakingHandler.handleFindMatch(io, socket);
  });
}