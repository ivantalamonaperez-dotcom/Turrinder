"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";
import BottomNav from "@/components/ui/BottomNav";
import { useVipGuard } from "@/hooks/useVipGuard";

// ─── Cache de rol a nivel módulo ─────────────────────────────────────────────
// Evita re-fetchear el rol en cada navegación entre rutas
let _cachedUserId: string | null = null;
let _cachedRole:   string | null = null;

function VipWatcher() {
  const [userId, setUserId] = useState<string | undefined>(
    _cachedUserId ?? undefined
  );
  const [role, setRole] = useState<string | undefined>(
    _cachedRole ?? undefined
  );

  useEffect(() => {
    console.log("🔵 Layout MONTADO");
    let isMounted = true;

    const loadRole = async (uid: string) => {
      // ✅ Si ya tenemos el rol cacheado para este usuario, no re-fetching
      if (_cachedUserId === uid && _cachedRole) {
        if (isMounted) {
          setUserId(uid);
          setRole(_cachedRole);
        }
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error("❌ Layout: error cargando role:", error.message);
        return;
      }

      const role = profile?.role ?? "viewer";
      _cachedUserId = uid;
      _cachedRole   = role;
      setUserId(uid);
      setRole(role);
    };

    // ✅ Primero intentar sesión cacheada — no esperar al evento
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        loadRole(session.user.id);
      }
    });

    // ✅ Escuchar solo cambios reales de auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("🔵 Layout onAuthStateChange:", event, !!session);

        if (event === "SIGNED_OUT") {
          // Limpiar cache al cerrar sesión
          _cachedUserId = null;
          _cachedRole   = null;
          if (isMounted) {
            setUserId(undefined);
            setRole(undefined);
          }
          return;
        }

        // Solo actuar en login nuevo, no en TOKEN_REFRESHED ni INITIAL_SESSION
        if (event === "SIGNED_IN" && session?.user) {
          loadRole(session.user.id);
        }
      }
    );

    return () => {
      console.log("🔵 Layout DESMONTADO");
      isMounted = false;
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