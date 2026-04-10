"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/services/supabase.client";
import { matchingService } from "./matching.service";

export const useMatchmaking = () => {
  const [room, setRoom] = useState<any>(null);
  const [searching, setSearching] = useState(true);
  const roomRef = useRef<any>(null);

  const setRoomSync = (data: any) => {
    roomRef.current = data;
    setRoom(data);
  };

  useEffect(() => {
    let matchChannel: any;
    let interval: any;
    let userId: string;
    let inQueue = false; // saber si ya entramos a la cola

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      userId = data.user.id;

      // 1. Suscribirse al realtime PRIMERO
      await new Promise<void>((resolve) => {
        matchChannel = matchingService.listenForMatch(userId, (roomData) => {
          if (roomRef.current) return; // ya tenemos room
          console.log("🎯 MATCH (realtime):", roomData);
          setRoomSync(roomData);
          setSearching(false);
        }, resolve);
      });

      // 2. Intentar matchear directo
      const newRoom = await matchingService.joinQueue(userId);
      if (newRoom) {
        console.log("🔥 MATCH (directo):", newRoom);
        setRoomSync(newRoom);
        setSearching(false);
        return;
      }
      inQueue = true;

      // 3. Polling — dos responsabilidades:
      //    A) Detectar si el otro nos creó una room (backup del realtime)
      //    B) Reintentar joinQueue periódicamente para matchear con quien
      //       entró a la cola DESPUÉS de nosotros
      let pollCount = 0;
      interval = setInterval(async () => {
        if (roomRef.current) return;
        pollCount++;

        // A) Verificar si ya hay room para mí
        const { data: existingRoom } = await supabase
          .from("rooms")
          .select("*")
          .or(`user1.eq.${userId},user2.eq.${userId}`)
          .eq("ended", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingRoom) {
          const otherId = existingRoom.user1 === userId ? existingRoom.user2 : existingRoom.user1;
          const { data: otherProfile } = await supabase
            .from("profiles").select("is_online").eq("id", otherId).single();

          if (!otherProfile?.is_online) {
            await supabase.from("rooms").delete().eq("id", existingRoom.id);
            return;
          }

          console.log("🔁 MATCH (polling room):", existingRoom);
          setRoomSync(existingRoom);
          setSearching(false);
          return;
        }

        // B) Cada 3 ciclos (4.5s), reintentar joinQueue
        //    Esto cubre el caso donde los dos están en cola pero
        //    ninguno fue el "creador" del match
        if (pollCount % 3 === 0) {
          const retryRoom = await matchingService.joinQueue(userId);
          if (retryRoom) {
            console.log("🔄 MATCH (retry polling):", retryRoom);
            setRoomSync(retryRoom);
            setSearching(false);
          }
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

  // 4. Escuchar cuando la room termina
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel("room-end-" + room.id)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.new.ended === true) {
            console.log("⏭️ Room terminada");
            window.location.reload();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room]);

  return { room, searching };
};