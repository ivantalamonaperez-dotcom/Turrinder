"use client";

/**
 * useLikeLimiter.ts
 *
 * Controla el límite diario de likes para usuarios con rol "viewer".
 * VIP y Streamer tienen likes ilimitados.
 *
 * Almacenamiento: localStorage  →  "like_limit_{userId}_{YYYY-MM-DD}"
 * Valor: número de likes usados hoy.
 *
 * Usage:
 *   const { canLike, remainingLikes, registerLike, isUnlimited } = useLikeLimiter(userId, role);
 */

import { useMemo, useState, useCallback } from "react";

const DAILY_LIMIT = 10;

function getTodayKey(userId: string) {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  return `like_limit_${userId}_${today}`;
}

function getUsedToday(userId: string): number {
  if (typeof window === "undefined") return 0;
  const key = getTodayKey(userId);
  return parseInt(localStorage.getItem(key) ?? "0", 10);
}

function incrementUsed(userId: string): number {
  const key  = getTodayKey(userId);
  const next = getUsedToday(userId) + 1;
  localStorage.setItem(key, String(next));
  return next;
}

export interface LikeLimiterResult {
  /** true si el usuario puede dar like ahora mismo */
  canLike: boolean;
  /** likes que quedan hoy (undefined si es ilimitado) */
  remainingLikes: number | undefined;
  /** true si el rol no tiene límite (vip / streamer) */
  isUnlimited: boolean;
  /** llamar cada vez que se da un like exitoso */
  registerLike: () => void;
}

export function useLikeLimiter(
  userId: string,
  role: string
): LikeLimiterResult {
  const isUnlimited = role === "vip" || role === "streamer";

  // Estado reactivo: cuántos likes usó hoy
  const [usedToday, setUsedToday] = useState<number>(() =>
    userId ? getUsedToday(userId) : 0
  );

  const canLike = isUnlimited || usedToday < DAILY_LIMIT;

  const remainingLikes = isUnlimited
    ? undefined
    : Math.max(0, DAILY_LIMIT - usedToday);

  const registerLike = useCallback(() => {
    if (isUnlimited || !userId) return;
    const next = incrementUsed(userId);
    setUsedToday(next);
  }, [isUnlimited, userId]);

  return { canLike, remainingLikes, isUnlimited, registerLike };
}