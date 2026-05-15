"use client";

import { useEffect } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import { useVipGuard } from "@/hooks/useVipGuard";
import { useState } from "react";

function VipWatcher() {
  const [userId, setUserId] = useState<string | undefined>();
  const [role,   setRole]   = useState<string | undefined>();

  useEffect(() => {
  console.log("🔵 Layout MONTADO");

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log("🔵 Layout onAuthStateChange:", event, !!session);
      if (event === "SIGNED_OUT") {
        console.log("🔴 Layout: SIGNED_OUT → redirigiendo a /");
        setUserId(undefined);
        setRole(undefined);
        return;
      }
      if (session) {
        setUserId(session.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (profile?.role) setRole(profile.role);
      }
    }
  );

  return () => {
    console.log("🔵 Layout DESMONTADO");
    subscription.unsubscribe();
  };
}, []);

  useVipGuard(userId, role);
  return null;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <VipWatcher />
      <BottomNav />
      <main id="main-content" style={{ marginLeft: "64px", minHeight: "100vh" }}>
        {children}
      </main>
    </>
  );
}