"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";

export type UserGender = "male" | "female" | "other" | undefined;

function normalizeGender(raw?: string | null): UserGender {
  if (!raw) return undefined;
  const v = raw.toLowerCase().trim();
  if (v === "hombre") return "male";
  if (v === "mujer")  return "female";
  return "other";
}

export const useProfile = () => {
  const [profile, setProfile] = useState<{
    id:     string;
    role:   string;
    gender: UserGender;
  } | null>(null);

  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      // Reintentar hasta 3 veces si no hay sesión todavía
      let user = null;
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase.auth.getUser();
        if (data.user) { user = data.user; break; }
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!user) {
        setProfileReady(true); // marcar como listo aunque no haya usuario
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("id, role, gender")
        .eq("id", user.id)
        .single();

      if (p) {
        setProfile({
          id:     p.id,
          role:   p.role,
          gender: normalizeGender(p.gender),
        });
      }

      // Siempre marcar como listo, con o sin perfil
      setProfileReady(true);
    };

    checkProfile();
  }, []);

  return { profile, profileReady };
};