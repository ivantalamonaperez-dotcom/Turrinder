import { supabase } from "@/services/supabase.client";

export const matchingService = {
  /**
   * Entra en la cola y busca match. 
   * El RPC se encarga de cerrar salas previas automáticamente.
   */
  joinQueue: async (userId: string): Promise<any | null> => {
    try {
      const { data, error } = await supabase.rpc("find_and_match", { 
        uid: userId 
      });

      if (error) throw error;

      const room = Array.isArray(data) && data.length > 0 ? data[0] : null;
      return room;
    } catch (err) {
      console.error("❌ Error en joinQueue:", err);
      return null;
    }
  },

  /**
   * Finaliza la sala y ELIMINA las señales.
   * Esto evita que el próximo match reciba datos de conexión viejos.
   */
  endRoom: async (roomId: string): Promise<void> => {
    try {
      // 1. Terminar la sala en la DB
      await supabase.from("rooms").update({ ended: true }).eq("id", roomId);
      
      // 2. Limpiar señales de WebRTC para esta sala específica
      await supabase.from("signals").delete().eq("room_id", roomId);
      
      console.log("✅ Sala y señales destruidas:", roomId);
    } catch (err) {
      console.error("❌ Error al cerrar sala:", err);
    }
  },

  /**
   * Salida limpia de la cola (ej. al cerrar pestaña)
   */
  leaveQueue: async (userId: string): Promise<void> => {
    try {
      await supabase.from("queue").delete().eq("user_id", userId);
    } catch (err) {
      console.error("❌ Error al salir de la cola:", err);
    }
  },

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
          if (room.user2 === userId && !room.ended) {
            console.log("🎯 Match recibido por invitación!");
            callback(room);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onSubscribed?.();
      });
  },
};