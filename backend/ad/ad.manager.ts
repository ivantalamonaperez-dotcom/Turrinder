/**
 * ad.manager.ts — Backend Ad State Manager
 *
 * Responsabilidades:
 * - Mantener el contador de skips por usuario en memoria del servidor
 * - Gestionar el estado: MATCHING | IN_CALL | AD_MODE
 * - Emitir eventos de control al frontend
 * - Validar que el usuario completó el anuncio antes de volver a matchmaking
 * - Anti-bypass: el servidor es quien decide cuándo el usuario puede seguir
 *
 * Flujo:
 *   skip → incrementar contador → si >= AD_THRESHOLD → emitir "show-ad"
 *   → usuario en AD_MODE (no puede hacer find-match)
 *   → frontend reporta "ad-completed" con token → servidor valida → resetea
 */

const AD_THRESHOLD = 8; // Skips antes de mostrar un anuncio

// ── Tipos de estado del usuario ───────────────────────────────────────────────
export type UserAdState = "MATCHING" | "IN_CALL" | "AD_MODE";

interface UserAdData {
  skipCount: number;
  state: UserAdState;
  adToken: string | null;       // Token único generado al enviar show-ad
  adSentAt: number | null;      // Timestamp para validar tiempo mínimo de visualización
  adMinDurationMs: number;      // Tiempo mínimo que debe haber pasado (15s)
}

// Mapa: supabaseUserId → datos de anuncio
const userAdData = new Map<string, UserAdData>();

function getOrCreate(userId: string): UserAdData {
  if (!userAdData.has(userId)) {
    userAdData.set(userId, {
      skipCount: 0,
      state: "MATCHING",
      adToken: null,
      adSentAt: null,
      adMinDurationMs: 15_000, // 15 segundos mínimo de visualización
    });
  }
  return userAdData.get(userId)!;
}

/** Genera un token único para la sesión de anuncio actual */
function generateAdToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}:${Math.random()}`).toString("base64url");
}

export const adManager = {
  /**
   * Llamar cuando el usuario hace skip.
   * Retorna `true` si debe mostrarse un anuncio ahora.
   */
  recordSkip(userId: string): { showAd: boolean; skipCount: number; adToken?: string } {
    const data = getOrCreate(userId);

    // Si ya está en AD_MODE, no contar más skips (no debería llegar aquí)
    if (data.state === "AD_MODE") {
      return { showAd: false, skipCount: data.skipCount };
    }

    data.skipCount++;

    if (data.skipCount >= AD_THRESHOLD) {
      data.state = "AD_MODE";
      data.adToken = generateAdToken(userId);
      data.adSentAt = Date.now();
      console.log(`[AdManager] 🎯 Usuario ${userId} alcanzó ${data.skipCount} skips → AD_MODE`);
      return { showAd: true, skipCount: data.skipCount, adToken: data.adToken };
    }

    return { showAd: false, skipCount: data.skipCount };
  },

  /**
   * Validar que el usuario realmente vio el anuncio.
   * El frontend envía el adToken recibido + el tiempo que pasó.
   * Retorna `true` si la validación pasa y se resetea el estado.
   */
  validateAdCompleted(userId: string, token: string): boolean {
    const data = getOrCreate(userId);

    if (data.state !== "AD_MODE") {
      console.warn(`[AdManager] ⚠️ ${userId} reportó ad-completed fuera de AD_MODE`);
      return false;
    }

    if (data.adToken !== token) {
      console.warn(`[AdManager] 🚨 Token inválido de ${userId} — posible bypass`);
      return false;
    }

    const elapsed = Date.now() - (data.adSentAt ?? 0);
    if (elapsed < data.adMinDurationMs) {
      console.warn(`[AdManager] ⏱️ ${userId} completó en ${elapsed}ms (mínimo: ${data.adMinDurationMs}ms) — sospechoso`);
      // Aún aceptamos pero logueamos — en producción podrías rechazar
    }

    // Reset
    data.skipCount = 0;
    data.state = "MATCHING";
    data.adToken = null;
    data.adSentAt = null;
    console.log(`[AdManager] ✅ ${userId} completó el anuncio. Skips reseteados.`);
    return true;
  },

  /**
   * Verificar si un usuario puede hacer matchmaking.
   * Retorna `false` si está en AD_MODE.
   */
  canMatchmake(userId: string): boolean {
    const data = getOrCreate(userId);
    return data.state !== "AD_MODE";
  },

  getState(userId: string): UserAdState {
    return getOrCreate(userId).state;
  },

  getSkipCount(userId: string): number {
    return getOrCreate(userId).skipCount;
  },

  setState(userId: string, state: UserAdState) {
    getOrCreate(userId).state = state;
  },

  cleanup(userId: string) {
    userAdData.delete(userId);
  },
};