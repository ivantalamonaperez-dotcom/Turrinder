import { supabase } from "@/services/supabase.client";

export const matchingService = {
  joinQueue: async (userId: string) => {
    try {
      // 1. Limpiar cola propia
      await supabase.from("queue").delete().eq("user_id", userId);

      // 2. Borrar rooms terminadas propias
      await supabase
        .from("rooms").delete()
        .or(`user1.eq.${userId},user2.eq.${userId}`)
        .eq("ended", true);

      // 3. Si tengo room activa, terminarla — el usuario recargó la página
      //    El realtime notificará al otro usuario para que vuelva a buscar
      const { data: myRoom } = await supabase
        .from("rooms").select("id")
        .or(`user1.eq.${userId},user2.eq.${userId}`)
        .eq("ended", false).maybeSingle();

      if (myRoom) {
        console.log("🔄 Room activa encontrada al entrar — terminándola (recarga de página)");
        await supabase.from("signals").delete().eq("room_id", myRoom.id);
        await supabase.from("rooms").update({ ended: true }).eq("id", myRoom.id);
        // Pequeña espera para que el realtime notifique al otro antes de continuar
        await new Promise(r => setTimeout(r, 400));
      }

      // 4. Buscar candidatos disponibles en la cola
      //    Sin JOIN con profiles para evitar errores de permisos
      const { data: queue, error } = await supabase
        .from("queue")
        .select("*")
        .eq("is_matching", false)
        .neq("user_id", userId)
        .gt("created_at", new Date(Date.now() - 60000).toISOString()) // ventana de 60s
        .order("created_at", { ascending: true })
        .limit(10);

      if (error) {
        console.error("❌ Queue error:", error.message);
        // Entrar igual a la cola
        await supabase.from("queue").insert({ user_id: userId, is_matching: false });
        return null;
      }

      if (!queue || queue.length === 0) {
        // No hay nadie — entrar a esperar
        await supabase.from("queue").insert({ user_id: userId, is_matching: false });
        console.log("🟡 Esperando en cola...");
        return null;
      }

      // 5. Elegir el primer candidato disponible
      //    Intentar uno por uno hasta que uno funcione
      for (const other of queue) {

        // Verificar que el candidato no esté ya en una room activa
        const { data: otherRoom } = await supabase
          .from("rooms").select("id")
          .or(`user1.eq.${other.user_id},user2.eq.${other.user_id}`)
          .eq("ended", false).maybeSingle();

        if (otherRoom) {
          // Está ocupado — limpiar su entrada stale de la cola
          await supabase.from("queue").delete().eq("id", other.id);
          console.log("🧹 Candidato ya en room, saltando...");
          continue;
        }

        // Verificar que esté online
        const { data: profile } = await supabase
          .from("profiles").select("is_online").eq("id", other.user_id).single();

        if (!profile?.is_online) {
          await supabase.from("queue").delete().eq("id", other.id);
          console.log("🧹 Candidato offline, saltando...");
          continue;
        }

        // Lock atómico
        const { data: locked, error: lockError } = await supabase
          .from("queue")
          .update({ is_matching: true })
          .eq("id", other.id)
          .eq("is_matching", false)
          .select().single();

        if (lockError || !locked) {
          console.log("⚠️ Lock fallido, siguiente candidato...");
          continue;
        }

        // Crear room
        const { data: room, error: roomError } = await supabase
          .from("rooms")
          .insert({ user1: userId, user2: other.user_id, ended: false })
          .select().single();

        if (roomError) {
          console.error("❌ Room error:", roomError.message);
          await supabase.from("queue").update({ is_matching: false }).eq("id", other.id);
          continue;
        }

        // Limpiar cola de ambos
        await supabase.from("queue").delete().eq("id", other.id);
        await supabase.from("queue").delete().eq("user_id", userId);

        console.log("🔥 MATCH:", room);
        return room;
      }

      // Ningún candidato funcionó — entrar a la cola
      await supabase.from("queue").insert({ user_id: userId, is_matching: false });
      console.log("🟡 Sin candidatos válidos, esperando...");
      return null;

    } catch (err) {
      console.error("❌ joinQueue crash:", err);
      return null;
    }
  },

  listenForMatch: (userId: string, callback: (room: any) => void, onSubscribed?: () => void) => {
    return supabase
      .channel("matchmaking-" + userId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rooms" },
        (payload) => {
          const room = payload.new;
          if (room.user1 === userId || room.user2 === userId) {
            console.log("🎯 Match recibido:", room);
            callback(room);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onSubscribed?.();
      });
  },
};