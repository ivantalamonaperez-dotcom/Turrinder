"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, Session } from "@supabase/supabase-js";

/**
 * /auth/callback
 *
 * Supabase redirige aquí después del OAuth de Google.
 * Cuando usa el flujo implícito, el token llega en el HASH de la URL
 * (#access_token=...), no como query param. getSession() solo funciona
 * si el cliente ya procesó ese hash, por eso usamos onAuthStateChange
 * como fuente de verdad.
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Esperar sesión de forma confiable:
      // 1. Si ya existe (recarga de página), getSession() la devuelve de inmediato.
      // 2. Si viene del hash de OAuth, onAuthStateChange la captura cuando
      //    el cliente JS de Supabase procesa el fragmento de URL.
      const session = await new Promise<Session | null>((resolve) => {
        // Primero: verificar si ya hay sesión activa
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            resolve(data.session);
            return;
          }

          // Segundo: esperar el evento SIGNED_IN que Supabase dispara
          // automáticamente al detectar #access_token en la URL
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (event === "SIGNED_IN" && session) {
                subscription.unsubscribe();
                resolve(session);
              }
            }
          );

          // Timeout de seguridad: 8 segundos máximo
          setTimeout(() => {
            subscription.unsubscribe();
            resolve(null);
          }, 8000);
        });
      });

      if (!session) {
        // Sin sesión → volver al login
        router.replace("/");
        return;
      }

      const userId = session.user.id;

      // Verificar si el usuario ya completó su perfil
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, age")
        .eq("id", userId)
        .single();

      // Si tiene nombre y edad → perfil completo → discover
      if (profile && profile.name && profile.age) {
        router.replace("/discover");
      } else {
        // Perfil incompleto → registro, saltando paso de email/contraseña
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