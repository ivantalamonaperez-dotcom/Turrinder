"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase.client";

export const useProfile = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<{ id: string; role: string } | null>(null);

  useEffect(() => {
    const checkProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", data.user.id)
        .single();

      if (!profile) {
        router.push("/auth/register");
        return;
      }

      setProfile(profile);
    };

    checkProfile();
  }, []);

  return profile;
};