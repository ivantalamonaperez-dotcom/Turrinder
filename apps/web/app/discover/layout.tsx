"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import { useVipGuard } from "@/hooks/useVipGuard"; 

export default function Layout({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const [userId, setUserId] = useState<string | undefined>();
  const [role,   setRole]   = useState<string | undefined>();

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.push("/"); return; }

      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role) setRole(profile.role);
    };
    init();
  }, [router]);

  // ✅ Revoca el VIP automáticamente si vip_until ya venció
  // No hace nada si el usuario no es VIP o si vip_until es null
  useVipGuard(userId, role);

  return (
    <>
      <BottomNav />
      {children}
    </>
  );
}