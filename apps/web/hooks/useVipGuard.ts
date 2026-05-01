/**
 * useVipGuard — ejecutar en layout.tsx o en cada página autenticada
 *
 * Comprueba si el VIP del usuario venció y lo revoca en Supabase.
 * Esto reemplaza la necesidad de un cron job externo.
 */

import { useEffect } from "react";
import { supabase } from "@/services/supabase.client";

export function useVipGuard(userId: string | undefined, role: string | undefined) {
  useEffect(() => {
    if (!userId || role !== "vip") return;

    const check = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("vip_until")
        .eq("id", userId)
        .single();

      if (!profile?.vip_until) return;

      const expired = new Date(profile.vip_until) < new Date();
      if (!expired) return;

      // VIP vencido → revocar
      await supabase
        .from("profiles")
        .update({ role: "viewer", vip_since: null, vip_until: null })
        .eq("id", userId);

      console.log("⏰ VIP vencido — rol revocado");
      // Opcional: recargar la página para reflejar el cambio
      window.location.reload();
    };

    check();
  }, [userId, role]);
}