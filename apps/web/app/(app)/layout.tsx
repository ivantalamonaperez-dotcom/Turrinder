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

  // Interceptar cualquier navegación para ver quién redirige
  const originalPush = window.history.pushState.bind(window.history);
  const originalReplace = window.history.replaceState.bind(window.history);

  window.history.pushState = function(...args) {
    console.log("🚨 pushState hacia:", args[2]);
    console.trace("🚨 pushState stack");
    return originalPush(...args);
  };

  window.history.replaceState = function(...args) {
    console.log("🚨 replaceState hacia:", args[2]);
    console.trace("🚨 replaceState stack");
    return originalReplace(...args);
  };

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
    // Restaurar funciones originales
    window.history.pushState = originalPush;
    window.history.replaceState = originalReplace;
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