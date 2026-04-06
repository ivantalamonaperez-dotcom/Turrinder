"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";

export const useLike = (room: any) => {
  const [liked, setLiked] = useState(false);
  const [isMatch, setIsMatch] = useState(false);

  // Verificar si ya hubo match previo entre estos dos usuarios
  useEffect(() => {
    if (!room) return;

    const checkExistingMatch = async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) return;

      const myId = me.user.id;
      const otherId = room.user1 === myId ? room.user2 : room.user1;

      const { data: existing } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user1.eq.${myId},user2.eq.${otherId}),and(user1.eq.${otherId},user2.eq.${myId})`)
        .maybeSingle();

      if (existing) {
        setLiked(true);
        console.log("ℹ️ Ya hubo match previo con este usuario");
      }
    };

    checkExistingMatch();
  }, [room]);

  // Escuchar INSERT en matches — filtrando por user (sin room_id)
  useEffect(() => {
    if (!room) return;

    let myId: string;

    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      myId = data.user.id;

      const otherId = room.user1 === myId ? room.user2 : room.user1;

      const channel = supabase
        .channel("matches-users-" + myId + "-" + otherId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "matches",
          },
          (payload) => {
            const match = payload.new;
            // Verificar que el match es entre estos dos usuarios
            const isMyMatch =
              (match.user1 === myId && match.user2 === otherId) ||
              (match.user1 === otherId && match.user2 === myId);

            if (isMyMatch) {
              console.log("🎉 MATCH detectado via realtime");
              setIsMatch(true);
            }
          }
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    };

    let cleanup: (() => void) | undefined;
    setup().then((fn) => { cleanup = fn; });

    return () => { cleanup?.(); };
  }, [room]);

  const likeUser = async () => {
    if (!room || liked) return;

    const { data: me } = await supabase.auth.getUser();
    if (!me.user) return;

    const myId = me.user.id;
    const otherId = room.user1 === myId ? room.user2 : room.user1;

    // Verificar match existente antes de insertar
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("id")
      .or(`and(user1.eq.${myId},user2.eq.${otherId}),and(user1.eq.${otherId},user2.eq.${myId})`)
      .maybeSingle();

    if (existingMatch) {
      console.log("ℹ️ Match ya existente, no se repite");
      setLiked(true);
      return;
    }

    setLiked(true);

    // ✅ Insertar like SIN room_id (evita el problema de FK con rooms borradas)
    const { error } = await supabase.from("likes").insert({
      from_user: myId,
      to_user: otherId,
    });

    if (error) {
      console.error("❌ Error guardando like:", JSON.stringify(error), error.message);
      setLiked(false);
      return;
    }

    // Verificar si el otro ya dio like (sin filtrar por room_id)
    const { data: otherLike } = await supabase
      .from("likes")
      .select("id")
      .eq("from_user", otherId)
      .eq("to_user", myId)
      .maybeSingle();

    if (otherLike) {
      // ✅ MATCH MUTUAL — upsert con ignoreDuplicates para que si ambos usuarios
      // detectan el match al mismo tiempo y los dos intentan insertar,
      // el segundo simplemente se ignore sin error 409.
      const { error: matchError } = await supabase.from("matches").upsert(
        { user1: myId, user2: otherId },
        { onConflict: "user1,user2", ignoreDuplicates: true }
      );

      if (!matchError) {
        setIsMatch(true);
      } else {
        console.error("❌ Error guardando match:", JSON.stringify(matchError));
      }
    }
  };

  return { likeUser, liked, isMatch, setIsMatch };
};