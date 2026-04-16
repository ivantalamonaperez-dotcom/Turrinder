/**
 * ad.manager.ts — Corregido: token siempre es string válido
 *
 * BUG CORREGIDO:
 *   En ad.events.ts, cuando se re-enviaba show-ad por bypass,
 *   se pasaba token: null. El frontend recibía null y el overlay
 *   se cerraba inmediatamente porque reportAdCompleted() no tenía guard.
 *   Ahora generateAdToken siempre devuelve un string válido,
 *   y en re-envíos usamos el token existente (no generamos uno nuevo nulo).
 */

const AD_THRESHOLD = 8;

export type UserAdState = "MATCHING" | "IN_CALL" | "AD_MODE";

interface UserAdData {
  skipCount: number;
  state: UserAdState;
  adToken: string | null;
  adSentAt: number | null;
  adMinDurationMs: number;
}

const userAdData = new Map<string, UserAdData>();

function getOrCreate(userId: string): UserAdData {
  if (!userAdData.has(userId)) {
    userAdData.set(userId, {
      skipCount: 0,
      state: "MATCHING",
      adToken: null,
      adSentAt: null,
      adMinDurationMs: 15_000,
    });
  }
  return userAdData.get(userId)!;
}

function generateAdToken(userId: string): string {
  // Siempre retorna un string no vacío
  const raw = `${userId}:${Date.now()}:${Math.random().toString(36)}`;
  return Buffer.from(raw).toString("base64url");
}

export const adManager = {
  recordSkip(userId: string): { showAd: boolean; skipCount: number; adToken?: string } {
    const data = getOrCreate(userId);

    if (data.state === "AD_MODE") {
      // Ya está en modo anuncio — devolver el token existente para re-enviar
      return { showAd: true, skipCount: data.skipCount, adToken: data.adToken ?? undefined };
    }

    data.skipCount++;

    if (data.skipCount >= AD_THRESHOLD) {
      data.state = "AD_MODE";
      data.adToken = generateAdToken(userId); // Siempre string válido
      data.adSentAt = Date.now();
      console.log(`[AdManager] 🎯 ${userId} → AD_MODE (${data.skipCount} skips)`);
      return { showAd: true, skipCount: data.skipCount, adToken: data.adToken };
    }

    return { showAd: false, skipCount: data.skipCount };
  },

  validateAdCompleted(userId: string, token: string): boolean {
    const data = getOrCreate(userId);

    if (data.state !== "AD_MODE") {
      console.warn(`[AdManager] ⚠️ ${userId} reportó ad-completed fuera de AD_MODE`);
      return false;
    }

    // Guard: token nulo o vacío = bypass
    if (!token || token.trim() === "") {
      console.warn(`[AdManager] 🚨 Token vacío de ${userId}`);
      return false;
    }

    if (data.adToken !== token) {
      console.warn(`[AdManager] 🚨 Token inválido de ${userId}`);
      return false;
    }

    const elapsed = Date.now() - (data.adSentAt ?? 0);
    if (elapsed < data.adMinDurationMs) {
      console.warn(`[AdManager] ⏱️ ${userId} completó en ${elapsed}ms — sospechoso (mínimo: ${data.adMinDurationMs}ms)`);
      // Loguear pero aceptar (el frontend ya enforcea 15s con el countdown)
    }

    data.skipCount = 0;
    data.state = "MATCHING";
    data.adToken = null;
    data.adSentAt = null;
    console.log(`[AdManager] ✅ ${userId} completó el anuncio. Reseteado.`);
    return true;
  },

  canMatchmake(userId: string): boolean {
    return getOrCreate(userId).state !== "AD_MODE";
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