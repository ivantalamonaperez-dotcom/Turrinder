// app/api/paypal/activate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYPAL_BASE = process.env.PAYPAL_ENV === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscriptionId, plan, userId } = body;

    if (!subscriptionId || !userId || !plan) {
      return NextResponse.json({ error: "Faltan datos: subscriptionId, plan y userId son requeridos." }, { status: 400 });
    }

    // 1. Obtener access token de PayPal
    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken();
    } catch (err) {
      console.error("[PayPal] Error obteniendo access token:", err);
      return NextResponse.json({ error: "No se pudo autenticar con PayPal." }, { status: 502 });
    }

    // 2. Verificar la suscripción con PayPal
    const ppRes = await fetch(
      `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!ppRes.ok) {
      console.error("[PayPal] Error al verificar suscripción:", ppRes.status, await ppRes.text());
      return NextResponse.json({ error: "No se pudo verificar la suscripción en PayPal." }, { status: 502 });
    }

    const ppData = await ppRes.json();
    console.log("[PayPal] Subscription status:", ppData.status, "| ID:", subscriptionId);

    // PayPal puede devolver ACTIVE o APPROVAL_PENDING justo después del pago
    const validStatuses = ["ACTIVE", "APPROVAL_PENDING"];
    if (!validStatuses.includes(ppData.status)) {
      return NextResponse.json(
        { error: `Suscripción no válida. Estado: ${ppData.status}` },
        { status: 400 }
      );
    }

    // 3. Calcular fecha de expiración (1 mes o 1 año)
    const now = new Date();
    const vipExpiresAt = new Date(now);
    if (plan === "annual") {
      vipExpiresAt.setFullYear(vipExpiresAt.getFullYear() + 1);
    } else {
      vipExpiresAt.setMonth(vipExpiresAt.getMonth() + 1);
    }

    // 4. Actualizar el usuario en Supabase
    const { error: dbError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_vip: true,
        vip_plan: plan,
        vip_subscription_id: subscriptionId,
        vip_provider: "paypal",
        vip_activated_at: now.toISOString(),
        vip_expires_at: vipExpiresAt.toISOString(),
      })
      .eq("id", userId);

    if (dbError) {
      console.error("[Supabase] Error al actualizar usuario:", dbError);
      return NextResponse.json({ error: "Error al activar VIP en la base de datos." }, { status: 500 });
    }

    console.log("[VIP] Activado para userId:", userId, "| plan:", plan, "| expira:", vipExpiresAt.toISOString());
    return NextResponse.json({ ok: true, expiresAt: vipExpiresAt.toISOString() });

  } catch (err) {
    console.error("[PayPal activate] Error inesperado:", err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_SECRET;  // ← NUNCA uses NEXT_PUBLIC para el secret

  if (!clientId || !secret) {
    throw new Error("NEXT_PUBLIC_PAYPAL_CLIENT_ID o PAYPAL_SECRET no están configurados.");
  }

  const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal token error ${res.status}: ${text}`);
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error("PayPal no devolvió access_token: " + JSON.stringify(data));
  }

  return data.access_token;
}