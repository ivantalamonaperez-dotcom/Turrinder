import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { user_id, method } = await req.json();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const userAgent = req.headers.get("user-agent") ?? "unknown";

  // Geolocalizar IP
  let geoInfo = "desconocida";
  try {
    const geo = await fetch(`https://ipapi.co/${ip}/json/`);
    const geoData = await geo.json();
    if (geoData.city) {
      geoInfo = `${geoData.city}, ${geoData.region}, ${geoData.country_name}`;
    }
  } catch {}

  const { error } = await supabase
    .from("login_logs")
    .insert({ user_id, ip, method });

  if (error) {
    console.error("❌ Supabase login_logs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  fetch(`${process.env.NEXT_PUBLIC_BOT_URL}/discord`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo: "log_login",
      datos: { userId: user_id, method, ip, userAgent, geoInfo },
    }),
  })
    .then(r => r.json())
    .then(d => console.log("✅ Bot notificado:", d))
    .catch(e => console.error("❌ Error bot:", e));

  return NextResponse.json({ ok: true });
}