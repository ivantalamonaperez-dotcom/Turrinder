"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase.client";
import { logLogin } from "@/lib/logLogin";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
  console.log("🔴 handleLogin ejecutado"); // ← agregá esto primero
  setError(""); 
  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    console.log("🔴 resultado supabase:", { data, error }); // ← y esto

    if (error) {
      setError(error.message);
      return;
    }
    if (!data.user) {
      setError("No se pudo iniciar sesión.");
      return;
    }

    console.log("🔴 llamando logLogin..."); // ← y esto
    await logLogin(data.user.id, "email");
    router.push("/discover");
  } catch (e) {
    console.error("🔴 error catch:", e);
    setError("Error inesperado. Revisá tu conexión.");
  } finally {
    setLoading(false);
  }
};

  // ── Login con Google ─────────────────────────────────────────
  const handleGoogle = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    // La IP de Google se guarda en /auth/callback (ya lo tenés hecho)
  };

  return (
    <div style={styles.container}>
      <h2>Login</h2>
      {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
      />
      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
      <button onClick={handleGoogle}>
        Entrar con Google
      </button>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },
};