"use client";

/**
 * useGenderFilter
 *
 * Gestiona la preferencia de género del usuario para el filtro de matchmaking.
 * Persiste la selección en localStorage para que sobreviva recargas.
 *
 * Valores posibles:
 *   "all"    — sin filtro (hombres + mujeres)
 *   "male"   — solo hombres
 *   "female" — solo mujeres
 */

import { useState, useCallback } from "react";

export type GenderFilter = "all" | "male" | "female";

const STORAGE_KEY = "turrinder_gender_filter";

function readStored(): GenderFilter {
  if (typeof window === "undefined") return "all";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "male" || v === "female" || v === "all") return v;
  return "all";
}

export function useGenderFilter() {
  const [genderFilter, setGenderFilterState] = useState<GenderFilter>(readStored);

  const setGenderFilter = useCallback((next: GenderFilter) => {
    setGenderFilterState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const cycleFilter = useCallback(() => {
    setGenderFilterState((prev) => {
      const next: GenderFilter =
        prev === "all" ? "male" : prev === "male" ? "female" : "all";
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  return { genderFilter, setGenderFilter, cycleFilter };
}