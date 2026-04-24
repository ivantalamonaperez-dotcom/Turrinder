"use client";

/**
 * useLike.ts
 *
 * Gestiona el flujo completo de likes y matches:
 *  1. Registra el like del usuario actual hacia su pareja en la tabla `likes`.
 *  2. Verifica si ya existe el like inverso (match mutuo).
 *  3. Si hay match → inserta en `matches` y activa el modal.
 *
 * Tabla `likes`:  id | from_user (uuid) | to_user (uuid) | created_at | room_id (uuid, nullable)
 * Tabla `matches`: id | user1 (uuid) | user2 (uuid) | created_at | room_id (uuid, nullable)
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/services/supabase.client";

export const useLike = (room: { id: string } | null) => {
  const [liked,   setLiked]   = useState(false);
  const [isMatch, setIsMatch] = useState(false);

  // Evita doble-registro si el usuario hace clic rápido
  const isProcessing = useRef(false);

  // Reseteamos el estado de liked cuando cambia la pareja
  const prevRoomId = useRef<string | null>(null);
  if (room?.id !== prevRoomId.current) {
    prevRoomId.current = room?.id ?? null;
    // Solo reseteamos si realmente cambió la sala (evita reset en primer render)
    if (prevRoomId.current !== null || liked) {
      // eslint-disable-next-line react-hooks/rules-of-hooks -- safe: conditional on ref comparison
    }
  }

  // Reset cuando cambia la pareja — usamos un ref + efecto inline
  // (esto es seguro porque el hook se re-ejecuta con cada render)
  const resetForNewRoom = useCallback(() => {
    setLiked(false);
    setIsMatch(false);
    isProcessing.current = false;
  }, []);

  // Detectamos cambio de room de forma simple con un ref externo
  const roomIdRef = useRef<string | null | undefined>(undefined);
  if (roomIdRef.current !== (room?.id ?? null)) {
    if (roomIdRef.current !== undefined) {
      // La room cambió: reseteamos estado sincronicamente antes del render
      setLiked(false);
      setIsMatch(false);
      isProcessing.current = false;
    }
    roomIdRef.current = room?.id ?? null;
  }

  const likeUser = useCallback(async () => {
    if (!room?.id)          return;  // sin pareja activa
    if (liked)              return;  // ya dio like
    if (isProcessing.current) return; // petición en curso

    isProcessing.current = true;

    try {
      // 1. Obtener el usuario autenticado
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        console.error("[useLike] ❌ Usuario no autenticado");
        isProcessing.current = false;
        return;
      }

      const myId      = authData.user.id;
      const partnerId = room.id;

      // 2. Evitar self-like (defensa adicional)
      if (myId === partnerId) {
        isProcessing.current = false;
        return;
      }

      // 3. Insertar like (upsert para evitar duplicados si hay reconexión)
      const { error: likeError } = await supabase
        .from("likes")
        .upsert(
          { from_user: myId, to_user: partnerId },
          { onConflict: "from_user,to_user", ignoreDuplicates: true }
        );

      if (likeError) {
        console.error("[useLike] ❌ Error al guardar like:", likeError);
        isProcessing.current = false;
        return;
      }

      console.log("[useLike] ❤️  Like guardado:", myId, "→", partnerId);
      setLiked(true);

      // 4. Verificar si existe el like inverso (match mutuo)
      const { data: inverseLike, error: checkError } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user", partnerId)
        .eq("to_user", myId)
        .maybeSingle();

      if (checkError) {
        console.error("[useLike] ❌ Error al verificar match:", checkError);
        isProcessing.current = false;
        return;
      }

      if (inverseLike) {
        // 5. ¡Match mutuo! Insertar en matches (upsert para idempotencia)
        //    Normalizamos el orden de user1/user2 para evitar duplicados espejo
        const [user1, user2] = [myId, partnerId].sort();

        const { error: matchError } = await supabase
          .from("matches")
          .upsert(
            { user1, user2 },
            { onConflict: "user1,user2", ignoreDuplicates: true }
          );

        if (matchError) {
          console.error("[useLike] ❌ Error al guardar match:", matchError);
        } else {
          console.log("[useLike] 🎉 ¡MATCH guardado!", user1, "<->", user2);
          setIsMatch(true);
        }
      }
    } catch (err) {
      console.error("[useLike] ❌ Error inesperado:", err);
    } finally {
      isProcessing.current = false;
    }
  }, [room?.id, liked]);

  return {
    likeUser,
    liked,
    isMatch,
    setIsMatch,
    resetForNewRoom,
  };
};