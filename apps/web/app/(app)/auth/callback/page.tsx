"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase.client";
import { logLogin } from "@/lib/logLogin";

async function continueWithSession(userId: string, router: ReturnType<typeof useRouter>) {
  const banRes = await fetch("/api/check-ban", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  const banData = await banRes.json();

  if (banData.banned) {
    await supabase.auth.signOut();
    router.replace("/?banned=true");
    return;
  }

  await logLogin(userId, "google");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, age")
    .eq("id", userId)
    .single();

  if (profile && profile.name && profile.age) {
    router.replace("/profile");
  } else {
    router.replace("/auth/register?from=google");
  }
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
  const handleCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) {
        router.replace("/");
        return;
      }
      await continueWithSession(data.session.user.id, router);
      return; // ← termina acá, nunca llega al setTimeout
    }

    // Solo si NO hay code, usar el fallback con timeout
    let timeoutId: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          clearTimeout(timeoutId); // ← cancelar el timeout
          subscription.unsubscribe();
          await continueWithSession(session.user.id, router);
        }
      }
    );

    timeoutId = setTimeout(() => {
      subscription.unsubscribe();
      router.replace("/");
    }, 8000);
  };

  handleCallback();
}, [router]);

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