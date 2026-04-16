"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";
import type { MatchUserProfile } from "@/components/user/UserChip";

export const useMatchUser = (room: any) => {
  const [matchUser, setMatchUser] = useState<MatchUserProfile | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!room || !room.id) {
        setMatchUser(null);
        return;
      }

      try {
        const otherId = room.id;
        console.log("📡 Cargando perfil de Supabase para el ID:", otherId);

        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, age, avatar_url, bio, photos, interests, looking_for, gender")
          .eq("id", otherId)
          .single();

        if (error) {
          console.error("❌ Error al obtener perfil del match:", error.message);
          return;
        }

        if (data) setMatchUser(data);
      } catch (err) {
        console.error("❌ Error inesperado cargando matchUser:", err);
      }
    };

    load();
  }, [room]);

  return { matchUser };
};