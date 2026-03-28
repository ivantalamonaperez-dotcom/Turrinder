"use client";

import { useEffect } from "react";
import { supabase } from "@/services/supabase.client";

export const useProfile = () => {
  useEffect(() => {
    const createProfile = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) return;

      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (!existing) {
        await supabase.from("profiles").insert([
          {
            id: data.user.id,
            name: "Usuario " + Math.floor(Math.random() * 1000),
            age: 20,
          },
        ]);
      }
    };

    createProfile();
  }, []);
};