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

      // 3. Polling con jitter aleatorio para evitar race conditions con 3+ usuarios
      // Cada usuario tiene un offset distinto para que no intenten crear rooms al mismo tiempo
      const jitter = Math.floor(Math.random() * 1000); // 0-1000ms de offset inicial
      let pollCount = 0;
      await new Promise(r => setTimeout(r, jitter)); // esperar el jitter antes de empezar

      interval = setInterval(async () => {
        if (roomRef.current) return;
        pollCount++;

        // A) Verificar si ya hay room para mí (backup del realtime)
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

        // B) Cada 4 ciclos (6s), reintentar joinQueue con jitter adicional
        //    El jitter evita que 3 usuarios intenten crear rooms simultáneamente
        if (pollCount % 4 === 0) {
          // Pequeño delay aleatorio antes del retry para desincronizar usuarios
          await new Promise(r => setTimeout(r, Math.floor(Math.random() * 500)));
          if (roomRef.current) return; // revisar de nuevo después del delay
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

  // 4. Escuchar cuando la room termina — realtime + polling de seguridad
  useEffect(() => {
    if (!room) return;

    // Realtime: reacción inmediata cuando llega el evento
    const channel = supabase
      .channel("room-end-" + room.id)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.new.ended === true) {
            console.log("⏭️ Room terminada (realtime)");
            window.location.reload();
          }
        }
      )
      .subscribe();

    // Polling de seguridad: por si el realtime llega tarde o se pierde
    // Chequea cada 800ms si la room fue terminada por el otro usuario
    const roomPoll = setInterval(async () => {
      const { data } = await supabase
        .from("rooms")
        .select("ended")
        .eq("id", room.id)
        .single();

      if (data?.ended === true) {
        console.log("⏭️ Room terminada (polling)");
        clearInterval(roomPoll);
        window.location.reload();
      }
    }, 800);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(roomPoll);
    };
  }, [room]);

  return { room, searching };
};