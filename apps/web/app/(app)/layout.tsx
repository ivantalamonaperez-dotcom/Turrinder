"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/ui/BottomNav";
import { useVipGuard } from "@/hooks/useVipGuard";

// Componente separado para la lógica de auth/VIP.
// Al estar aislado, sus re-renders por cambios de estado (userId, role)
// NO re-montan <BottomNav />, que vive fuera de este árbol.
function AuthGuard() {
  const router = useRouter();
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
  useVipGuard(userId, role);

  return null;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* AuthGuard tiene su propio estado — sus re-renders no afectan a BottomNav */}
      <AuthGuard />
      <BottomNav />
      <main
        id="main-content"
        style={{
          marginLeft: "64px",
          minHeight: "100vh",
        }}
      >
        {children}
      </main>
    </>
  );
}