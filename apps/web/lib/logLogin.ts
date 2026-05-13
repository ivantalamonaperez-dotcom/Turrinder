export async function logLogin(user_id: string, method: "email" | "google") {
  try {
    await fetch("/api/log-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, method }),
    });
  } catch {
    // No bloqueamos el login si falla el log
    console.warn("No se pudo registrar el login");
  }
}