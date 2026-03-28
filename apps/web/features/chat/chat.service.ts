import { supabase } from "@/services/supabase.client";

export const chatService = {
  sendMessage: async (to: string, message: string) => {
    await supabase.from("messages").insert([
      {
        to,
        message,
      },
    ]);
  },

  listenMessages: (callback: (msg: any) => void) => {
    supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  },
};