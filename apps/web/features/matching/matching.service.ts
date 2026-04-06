import { supabase } from "@/services/supabase.client";

export const matchingService = {
  joinQueue: async (userId: string) => {
    try {
      // 🔥 1. LIMPIAR ESTADO VIEJO — solo queue y rooms YA terminadas
      await supabase.from("queue").delete().eq("user_id", userId);

      // ✅ Borrar TODAS las rooms del usuario — si está entrando a buscar
      // es porque no está en ninguna conversación activa. El otro usuario
      // ya fue notificado antes del reload (ended=true + 300ms delay).
      await supabase
        .from("rooms")
        .delete()
        .or(`user1.eq.${userId},user2.eq.${userId}`);

      // 🔥 2. BUSCAR USUARIO DISPONIBLE (NO BLOQUEADO + ONLINE)
      const { data: queue, error } = await supabase
        .from("queue")
        .select("*, profiles!inner(is_online)")
        .eq("is_matching", false)
        .eq("profiles.is_online", true) // ✅ solo usuarios online
        .neq("user_id", userId)
        .gt("created_at", new Date(Date.now() - 30000).toISOString())
        .order("created_at", { ascending: true })
        .limit(1);

      if (error) {
        console.error("❌ Queue error (intentando fallback):", JSON.stringify(error, null, 2));
        return matchingService._joinQueueFallback(userId);
      }

      // 🔴 3. SI NO HAY NADIE → ENTRAR A COLA
      if (!queue || queue.length === 0) {
        await supabase.from("queue").insert({
          user_id: userId,
          is_matching: false,
        });
        console.log("🟡 Esperando en cola...");
        return null;
      }

      const other = queue[0];

      // 🔥 4. BLOQUEAR AL OTRO USUARIO (LOCK anti race condition)
      const { data: locked, error: lockError } = await supabase
        .from("queue")
        .update({ is_matching: true })
        .eq("id", other.id)
        .eq("is_matching", false)
        .select()
        .single();

      if (lockError || !locked) {
        console.log("⚠️ Otro usuario ganó el match, reintentando...");
        setTimeout(() => matchingService.joinQueue(userId), 1000);
        return null;
      }

      // 🔥 5. CREAR ROOM
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert({ user1: userId, user2: other.user_id, ended: false })
        .select()
        .single();

      if (roomError) {
        console.error("❌ Room error:", roomError);
        // desbloquear al otro si falló la creación de room
        await supabase
          .from("queue")
          .update({ is_matching: false })
          .eq("id", other.id);
        return null;
      }

      // 🔥 6. LIMPIAR COLA
      await supabase.from("queue").delete().eq("id", other.id);
      await supabase.from("queue").delete().eq("user_id", userId);

      console.log("🔥 MATCH REAL:", room);
      return room;
    } catch (err) {
      console.error("❌ joinQueue crash:", err);
      return null;
    }
  },

  // Fallback sin JOIN por si hay problemas de permisos con profiles
  _joinQueueFallback: async (userId: string) => {
    const { data: queue } = await supabase
      .from("queue")
      .select("*")
      .eq("is_matching", false)
      .neq("user_id", userId)
      .gt("created_at", new Date(Date.now() - 30000).toISOString())
      .order("created_at", { ascending: true })
      .limit(1);

    if (!queue || queue.length === 0) {
      await supabase.from("queue").insert({
        user_id: userId,
        is_matching: false,
      });
      return null;
    }

    const other = queue[0];

    // verificar manualmente que esté online
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_online")
      .eq("id", other.user_id)
      .single();

    if (!profile?.is_online) {
      // limpiar ese usuario offline de la cola y reintentar
      await supabase.from("queue").delete().eq("id", other.id);
      console.log("🧹 Usuario offline removido de cola, reintentando...");
      setTimeout(() => matchingService.joinQueue(userId), 800);
      return null;
    }

    const { data: locked, error: lockError } = await supabase
      .from("queue")
      .update({ is_matching: true })
      .eq("id", other.id)
      .eq("is_matching", false)
      .select()
      .single();

    if (lockError || !locked) {
      setTimeout(() => matchingService.joinQueue(userId), 1000);
      return null;
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ user1: userId, user2: other.user_id, ended: false })
      .select()
      .single();

    if (roomError) {
      await supabase
        .from("queue")
        .update({ is_matching: false })
        .eq("id", other.id);
      return null;
    }

    await supabase.from("queue").delete().eq("id", other.id);
    await supabase.from("queue").delete().eq("user_id", userId);

    return room;
  },

  listenForMatch: (userId: string, callback: (room: any) => void, onSubscribed?: () => void) => {
    return supabase
      .channel("matchmaking-" + userId) // ✅ canal único por usuario (evita colisiones)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rooms",
        },
        (payload) => {
          const room = payload.new;
          if (room.user1 === userId || room.user2 === userId) {
            console.log("🎯 Match recibido:", room);
            callback(room);
          }
        }
      )
      .subscribe((status) => {
        // ✅ Notificar cuando el canal está listo — el caller puede hacer joinQueue recién ahora
        if (status === "SUBSCRIBED") onSubscribed?.();
      });
  },
};