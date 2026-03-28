"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";

export const useUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any;

    const loadUsers = async () => {
      const { data: current } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_online", true) // 🔥 SOLO ONLINE
        .neq("id", current.user?.id);

      setUsers(data || []);
      setLoading(false);

      // 🔥 REALTIME (cuando alguien se conecta/desconecta)
      channel = supabase
        .channel("users-online")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          async () => {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .eq("is_online", true)
              .neq("id", current.user?.id);

            setUsers(data || []);
          }
        )
        .subscribe();
    };

    loadUsers();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { users, loading };
};