"use client";

import { useEffect } from "react";
import { supabase } from "@/services/supabase.client";

export const usePresence = () => {
  useEffect(() => {
    let interval: any;
    let userId: string | null = null;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      userId = data.user.id;

      // 🔥 marcar online inmediatamente
      await supabase
        .from("profiles")
        .update({
          is_online: true,
          last_seen: new Date(),
        })
        .eq("id", userId);

      console.log("🟢 ONLINE:", userId);

      // 🔥 heartbeat cada 5s
      interval = setInterval(async () => {
        await supabase
          .from("profiles")
          .update({
            is_online: true,
            last_seen: new Date(),
          })
          .eq("id", userId);
      }, 5000);
    };

    const setOffline = async () => {
      if (!userId) return;

      await supabase
        .from("profiles")
        .update({
          is_online: false,
          last_seen: new Date(),
        })
        .eq("id", userId);

      console.log("🔴 OFFLINE:", userId);
    };

    start();

    window.addEventListener("beforeunload", setOffline);

    return () => {
      clearInterval(interval);
      setOffline();
      window.removeEventListener("beforeunload", setOffline);
    };
  }, []);
};