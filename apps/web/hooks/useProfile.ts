"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase.client";

export type UserGender = "male" | "female" | "other" | undefined;

/** Normaliza el valor de `gender` guardado en español a los valores internos del servidor */
function normalizeGender(raw?: string | null): UserGender {
  if (!raw) return undefined;
  const v = raw.toLowerCase().trim();
  if (v === "hombre")  return "male";
  if (v === "mujer")   return "female";
  // "no binario", "prefiero no decir", cualquier otro valor
  return "other";
}

export const useProfile = () => {
  const router = useRouter();

  const [profile, setProfile] = useState<{
    id:     string;
    role:   string;
    gender: UserGender;
  } | null>(null);

  /**
   * profileReady: true en cuanto el fetch de Supabase terminó (con o sin gender).
   * Mientras sea false, useMatchmaking NO emite find-match para evitar que el
   * usuario entre a la cola con myGender=undefined y rompa el filtro de género.
   */
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("id, role, gender")
        .eq("id", data.user.id)
        .single();

      if (!p) {
        router.push("/auth/register");
        return;
      }

      setProfile({
        id:     p.id,
        role:   p.role,
        gender: normalizeGender(p.gender),
      });

      // Marcar como listo DESPUÉS de setProfile para que ambos estados
      // se vean juntos en el siguiente render
      setProfileReady(true);
    };

    checkProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { profile, profileReady };
};