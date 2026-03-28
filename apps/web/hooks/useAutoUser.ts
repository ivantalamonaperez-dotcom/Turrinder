"use client";

import { useEffect } from "react";
import { supabase } from "@/services/supabase.client";

export const useAutoUser = () => {
  useEffect(() => {
    const createUser = async () => {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        const email = `test${Math.random()}@test.com`;

        await supabase.auth.signUp({
          email,
          password: "123456",
        });
      }
    };

    createUser();
  }, []);
};