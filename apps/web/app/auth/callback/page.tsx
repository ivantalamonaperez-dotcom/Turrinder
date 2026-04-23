"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/**
 * /auth/callback
 *
 * Supabase redirige aquí después del OAuth de Google.
 * Este componente:
 *  1. Espera a que Supabase procese el token de la URL
 *  2. Chequea si el usuario ya tiene perfil completo en la tabla "profiles"
 *  3. Si tiene perfil → /discover
 *     Si no tiene perfil → /auth/register?from=google (salta el paso 0 de email/contraseña)
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Supabase lee automáticamente el hash/code de la URL y establece la sesión
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // Algo salió mal, volver al login
        router.replace("/");
        return;
      }

      const userId = session.user.id;

      // Verificar si el usuario ya completó su perfil
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, age")
        .eq("id", userId)
        .single();

      // Si tiene nombre y edad cargados → perfil completo → discover
      if (profile && profile.name && profile.age) {
        router.replace("/discover");
      } else {
        // Perfil incompleto → ir al registro, saltando el paso de email/contraseña
        router.replace("/auth/register?from=google");
      }
    };

    handleCallback();
  }, [router]);

  // Pantalla de carga mientras procesa
  return (
    <div style={{
      minHeight: "100vh",
      background: "#030a14",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Spinner */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "3px solid rgba(84,199,248,0.12)",
        borderTop: "3px solid #54c7f8",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: "rgba(143,212,255,0.5)", fontSize: 14 }}>
        Verificando tu cuenta...
      </p>
    </div>
  );
}