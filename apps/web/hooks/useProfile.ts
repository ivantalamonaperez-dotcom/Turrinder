"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/services/supabase.client";

export type UserGender = "male" | "female" | "other" | undefined;

function normalizeGender(raw?: string | null): UserGender {
  if (!raw) return undefined;
  const v = raw.toLowerCase().trim();
  if (v === "hombre") return "male";
  if (v === "mujer") return "female";
  return "other";
}

export const useProfile = () => {
  const [profile, setProfile] = useState<{
    id: string;
    role: string;
    gender: UserGender;
  } | null>(null);

  const [profileReady, setProfileReady] = useState(false);

  // ✅ Ref para evitar setState si el componente se desmontó
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const checkProfile = async () => {
      // ✅ Usar getSession() en vez de getUser() — más rápido, no hace
      // round-trip al servidor si ya hay sesión cacheada
      const { data: { session } } = await supabase.auth.getSession();

      if (!isMounted.current) return;

      if (!session?.user) {
        setProfileReady(true);
        return;
      }

      const { data: p, error } = await supabase
        .from("profiles")
        .select("id, role, gender")
        .eq("id", session.user.id)
        .single();

      if (!isMounted.current) return;

      // ✅ Manejar error explícitamente — no quedarse colgado en silencio
      if (error) {
        console.error("[useProfile] Error fetching profile:", error.message);
        setProfileReady(true);
        return;
      }

      if (p) {
        setProfile({
          id: p.id,
          role: p.role,
          gender: normalizeGender(p.gender),
        });
      }

      setProfileReady(true);
    };

    checkProfile();

    return () => {
      isMounted.current = false;
    };
  }, []);

  return { profile, profileReady };
};