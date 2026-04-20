"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase.client";

export const useProfile = () => {
  const router = useRouter();

  useEffect(() => {
    const checkProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      // Si el usuario está autenticado pero no tiene perfil,
      // algo falló en el register — lo mandamos a completarlo
      if (!profile) {
        router.push("/auth/register");
      }
    };

    checkProfile();
  }, []);
};