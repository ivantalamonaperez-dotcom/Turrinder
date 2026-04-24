"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/services/supabase.client";

export const useLike = (room: { id: string } | null) => {
  const [liked,   setLiked]   = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const isProcessing = useRef(false);

  // ── Reset cuando cambia la pareja ────────────────────────────────────────
  const prevRoomId = useRef<string | null>(null);
  useEffect(() => {
    if (prevRoomId.current !== (room?.id ?? null)) {
      prevRoomId.current = room?.id ?? null;
      setLiked(false);
      setIsMatch(false);
      isProcessing.current = false;
    }
  }, [room?.id]);

  // ── Realtime: escuchar match insertado por la otra persona ───────────────
  useEffect(() => {
    if (!room?.id) return;

    let myId: string;

    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      myId = data.user.id;
      const partnerId = room.id;

      console.log("[useLike] 🔔 Suscribiendo realtime. myId:", myId, "partnerId:", partnerId);

      const channel = supabase
        .channel(`matches-${myId}-${partnerId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "matches" },
          (payload) => {
            console.log("[useLike] 📡 Realtime INSERT en matches:", payload.new);
            const match = payload.new;
            const isMyMatch =
              (match.user1 === myId && match.user2 === partnerId) ||
              (match.user1 === partnerId && match.user2 === myId);

            console.log("[useLike] isMyMatch:", isMyMatch);
            if (isMyMatch) {
              setIsMatch(true);
            }
          }
        )
        .subscribe((status) => {
          console.log("[useLike] Canal realtime status:", status);
        });

      return () => { supabase.removeChannel(channel); };
    };

    let cleanup: (() => void) | undefined;
    setup().then((fn) => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [room?.id]);

  // ── likeUser ─────────────────────────────────────────────────────────────
  const likeUser = async () => {
    console.log("[useLike] likeUser llamado. room:", room, "liked:", liked, "processing:", isProcessing.current);

    if (!room?.id)            { console.warn("[useLike] ⛔ Sin room"); return; }
    if (liked)                { console.warn("[useLike] ⛔ Ya liked"); return; }
    if (isProcessing.current) { console.warn("[useLike] ⛔ Ya procesando"); return; }

    isProcessing.current = true;

    try {
      const { data: me, error: authError } = await supabase.auth.getUser();
      console.log("[useLike] Auth user:", me?.user?.id, "authError:", authError);
      if (!me?.user) return;

      const myId      = me.user.id;
      const partnerId = room.id;

      console.log("[useLike] myId:", myId, "partnerId:", partnerId);

      if (myId === partnerId) { console.warn("[useLike] ⛔ Self-like"); return; }

      // 1. Insertar like
      const { error: likeError } = await supabase
        .from("likes")
        .upsert(
          { from_user: myId, to_user: partnerId },
          { onConflict: "from_user,to_user", ignoreDuplicates: true }
        );

      console.log("[useLike] upsert like → error:", likeError);

      if (likeError) {
        console.error("❌ Error guardando like:", likeError.message);
        return;
      }

      setLiked(true);
      console.log("[useLike] ❤️ Like guardado OK");

      // 2. Verificar like inverso
      const { data: otherLike, error: checkError } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user", partnerId)
        .eq("to_user", myId)
        .maybeSingle();

      console.log("[useLike] Like inverso encontrado:", otherLike, "checkError:", checkError);

      if (otherLike) {
        const [user1, user2] = [myId, partnerId].sort();
        console.log("[useLike] 🎉 Match mutuo! Insertando en matches:", user1, "<->", user2);

        const { error: matchError } = await supabase
          .from("matches")
          .upsert(
            { user1, user2 },
            { onConflict: "user1,user2", ignoreDuplicates: true }
          );

        console.log("[useLike] upsert match → error:", matchError);

        if (!matchError) {
          console.log("[useLike] ✅ setIsMatch(true) — el modal DEBE aparecer ahora");
          setIsMatch(true);
        }
      } else {
        console.log("[useLike] ℹ️ No hay like inverso aún. Esperando que el otro dé like (realtime activo)...");
      }
    } finally {
      isProcessing.current = false;
    }
  };

  return { likeUser, liked, isMatch, setIsMatch };
};