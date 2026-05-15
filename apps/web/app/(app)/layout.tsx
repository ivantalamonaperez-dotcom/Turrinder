"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import { useVipGuard } from "@/hooks/useVipGuard";

function AuthGuard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | undefined>();
  const [role,   setRole]   = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      let { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        await new Promise(r => setTimeout(r, 3000)); // 3s en vez de 1.5s
        const retry = await supabase.auth.getSession();
        session = retry.data.session;
      }

      if (cancelled) return;

      if (!session) {
        router.push("/");
        return;
      }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!cancelled && profile?.role) setRole(profile.role);
    };

    check();

    // Escuchar solo SIGNED_OUT para limpiar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.push("/");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  useVipGuard(userId, role);
  return null;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthGuard />
      <BottomNav />
      <main id="main-content" style={{ marginLeft: "64px", minHeight: "100vh" }}>
        {children}
      </main>
    </>
  );
}