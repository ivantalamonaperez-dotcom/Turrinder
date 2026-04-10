"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/services/supabase.client";
import { matchingService } from "./matching.service";

export const useMatchmaking = () => {
  const [room, setRoom]         = useState<any>(null);
  const [searching, setSearching] = useState(true);
  const roomRef   = useRef<any>(null);
  const userIdRef = useRef<string>("");

  const setRoomSync = (data: any) => {
    roomRef.current = data;
    setRoom(data);
  };

  useEffect(() => {
    let matchChannel: any;
    let interval:     NodeJS.Timeout;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const userId = data.user.id;
      userIdRef.current = userId;

      // 1. Suscribirse al canal ANTES de joinQueue para no perder el INSERT
      await new Promise<void>((resolve) => {
        matchChannel = matchingService.listenForMatch(
          userId,
          (roomData) => {
            if (roomRef.current) return; // ya tengo room, ignorar
            setRoomSync(roomData);
            setSearching(false);
          },
          resolve,
        );
      });

      // 2. Intentar match directo
      const newRoom = await matchingService.joinQueue(userId);
      if (newRoom) {
        setRoomSync(newRoom);
        setSearching(false);
        return;
      }

      // 3. Polling de backup — por si el realtime pierde el INSERT
      interval = setInterval(async () => {
        if (roomRef.current) return;

        const { data: myRoom } = await supabase
          .from("rooms")
          .select("*")
          .or(`user1.eq.${userId},user2.eq.${userId}`)
          .eq("ended", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!myRoom) return;

        console.log("Match (polling):", myRoom);
        setRoomSync(myRoom);
        setSearching(false);
      }, 1500);
    };

    start();

    return () => {
      if (matchChannel) supabase.removeChannel(matchChannel);
      if (interval)     clearInterval(interval);
      // Limpiar cola al desmontar
      const uid = userIdRef.current;
      if (uid) supabase.from("queue").delete().eq("user_id", uid);
    };
  }, []);

  // 4. Escuchar cuando la room termina — recargar para volver a buscar
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel("room-end-" + room.id)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.new.ended === true) {
            console.log("Room terminada, volviendo a buscar...");
            window.location.reload();
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room]);

  return { room, searching };
};