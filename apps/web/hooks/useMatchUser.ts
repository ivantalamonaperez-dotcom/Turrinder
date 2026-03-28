"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";

export const useMatchUser = (room: any) => {
  const [matchUser, setMatchUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!room) return;

      const { data: current } = await supabase.auth.getUser();
      const myId = current.user?.id;

      const otherId =
        room.user1 === myId ? room.user2 : room.user1;

      const { data } = await supabase
        .from("profiles")
        .select("id, name, age")
        .eq("id", otherId)
        .single();

      setMatchUser(data);
    };

    load();
  }, [room]);

  return { matchUser };
};