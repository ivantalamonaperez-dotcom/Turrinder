"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";

export const useMatchUser = (room: any) => {
  const [matchUser, setMatchUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      // 1. Si no hay room o la room no tiene ID, limpiamos y salimos
      if (!room || !room.id) {
        setMatchUser(null);
        return;
      }

      try {
        /**
         * NOTA: El objeto 'room' que viene de useMatchmaking ahora es { id: partnerId }.
         * Por lo tanto, room.id YA es el ID de la otra persona.
         */
        const otherId = room.id;

        console.log("📡 Cargando perfil de Supabase para el ID:", otherId);

        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, age, avatar_url") // Añadí avatar_url por si lo necesitas
          .eq("id", otherId)
          .single();

        if (error) {
          console.error("❌ Error al obtener perfil del match:", error.message);
          return;
        }

        if (data) {
          setMatchUser(data);
        }
      } catch (err) {
        console.error("❌ Error inesperado cargando matchUser:", err);
      }
    };

    load();
  }, [room]); // Reacciona cada vez que la sala cambia o se resetea a null

  return { matchUser };
};