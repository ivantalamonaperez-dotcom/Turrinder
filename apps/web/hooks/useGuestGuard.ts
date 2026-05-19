import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";

/**
 * Devuelve:
 *  - null  → todavía cargando
 *  - true  → es invitado (sin sesión o sin profile.name)
 *  - false → usuario registrado completo
 */
export function useIsGuest(): boolean | null {
  const [isGuest, setIsGuest] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      // Si entró explícitamente como invitado, no hace falta ir a Supabase
      if (sessionStorage.getItem("guest_mode") === "true") {
        setIsGuest(true);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      setIsGuest(!profile?.name);
    };

    check();
  }, []);

  return isGuest;
}