import { supabase } from "@/services/supabase.client";

export const matchingService = {

  // Entrar a la cola y buscar match via RPC atomico
  joinQueue: async (userId: string) => {
    try {
      // 1. Limpiar mi entrada vieja de la cola y rooms terminadas
      await supabase.from("queue").delete().eq("user_id", userId);
      await supabase
        .from("rooms").delete()
        .or(`user1.eq.${userId},user2.eq.${userId}`)
        .eq("ended", true);

      // 2. Intentar match atomico via RPC (transaccion Postgres con FOR UPDATE SKIP LOCKED)
      const { data: rooms, error } = await supabase
        .rpc("find_and_match", { p_user_id: userId });

      if (error) {
        console.error("RPC find_and_match error:", error.message);
        await supabase.from("queue").insert({ user_id: userId, is_matching: false });
        return null;
      }

      const room = rooms?.[0] ?? null;

      if (room) {
        console.log("MATCH (RPC directo):", room);
        return room;
      }

      // 3. No encontro a nadie — entrar a la cola y esperar
      await supabase.from("queue").insert({ user_id: userId, is_matching: false });
      console.log("Esperando en cola...");
      return null;

    } catch (err) {
      console.error("joinQueue crash:", err);
      return null;
    }
  },

  // Terminar una room y limpiar senales de WebRTC
  endRoom: async (roomId: string, userId: string) => {
    try {
      await supabase.rpc("end_room", { p_room_id: roomId, p_user_id: userId });
    } catch {
      // Fallback directo si falla el RPC
      await supabase.from("rooms").update({ ended: true }).eq("id", roomId);
      await supabase.from("signals").delete().eq("room_id", roomId);
    }
  },

  // Escuchar nuevo match via realtime
  listenForMatch: (
    userId: string,
    callback: (room: any) => void,
    onSubscribed?: () => void,
  ) => {
    return supabase
      .channel("matchmaking-" + userId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rooms" },
        (payload) => {
          const room = payload.new;
          if (room.user1 === userId || room.user2 === userId) {
            console.log("Match recibido (realtime):", room);
            callback(room);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onSubscribed?.();
      });
  },
};