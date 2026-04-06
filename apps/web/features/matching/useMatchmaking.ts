"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/services/supabase.client";
import { matchingService } from "./matching.service";

export const useMatchmaking = () => {
  const [room, setRoom] = useState<any>(null);
  const [searching, setSearching] = useState(true);

  // ✅ ref para evitar stale closure en el polling
  const roomRef = useRef<any>(null);

  const setRoomSync = (data: any) => {
    roomRef.current = data;
    setRoom(data);
  };

  useEffect(() => {
    let matchChannel: any;
    let interval: any;
    let userId: string;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      userId = data.user.id;

      // 🔥 1. ESCUCHAR MATCHES (REALTIME) — primero suscribirse, DESPUÉS buscar match.
      // Si hacemos joinQueue antes de que el canal esté SUBSCRIBED podemos perder
      // el INSERT event y el usuario que espera queda pegado en "Conectando...".
      await new Promise<void>((resolve) => {
        matchChannel = matchingService.listenForMatch(userId, (roomData) => {
          console.log("🎯 MATCH (realtime):", roomData);
          setRoomSync(roomData);
          setSearching(false);
        }, resolve); // ← resolve se llama cuando el canal está SUBSCRIBED
      });

      // 🔥 2. AHORA SÍ: intentar matchear directo (canal ya activo)
      const newRoom = await matchingService.joinQueue(userId);

      if (newRoom) {
        console.log("🔥 MATCH (directo):", newRoom);
        setRoomSync(newRoom);
        setSearching(false);
      }

      // 🔥 3. POLLING (BACKUP para el usuario que espera en cola)
      interval = setInterval(async () => {
        if (roomRef.current) return; // ✅ usa ref, no state

        const { data: existingRoom } = await supabase
          .from("rooms")
          .select("*")
          .or(`user1.eq.${userId},user2.eq.${userId}`)
          .eq("ended", false) // ✅ ignorar rooms terminadas
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingRoom) {
          console.log("🔁 MATCH (polling):", existingRoom);
          setRoomSync(existingRoom);
          setSearching(false);
        }
      }, 1500);
    };

    start();

    return () => {
      if (matchChannel) supabase.removeChannel(matchChannel);
      if (interval) clearInterval(interval);

      supabase.auth.getUser().then(({ data }) => {
        if (!data.user) return;
        supabase.from("queue").delete().eq("user_id", data.user.id);
      });
    };
  }, []);

  // 🔥 4. ESCUCHAR CUANDO LA ROOM TERMINA (SKIP SINCRONIZADO)
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel("room-end-" + room.id) // nombre único por room
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.new.ended === true) {
            console.log("⏭️ Room terminada, volviendo a buscar...");
            window.location.reload();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room]);

  return { room, searching };
};