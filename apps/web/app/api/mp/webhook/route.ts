import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "crypto";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ── Verificar firma del webhook de MP ──────────────────────────────
   MP envía en el header: x-signature → ts=...,v1=...
   Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
─────────────────────────────────────────────────────────────────── */
function verifySignature(req: NextRequest, rawBody: string): boolean {
  const secret    = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // Si no configuraste el secret, saltar (no recomendado en prod)

  const signature = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";

  // Extraer ts y v1 del header
  const parts: Record<string, string> = {};
  signature.split(",").forEach(part => {
    const [k, v] = part.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  });

  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  // La URL tiene el query param data.id o id
  const url       = new URL(req.url);
  const dataId    = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";

  // Template del manifest según docs de MP
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return expected === v1;
}

/* ── Asignar VIP en Supabase ──────────────────────────────────────── */
async function assignVip(userId: string, plan: string, days: number, paymentId: string) {
  const vipUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  // 1. Actualizar perfil
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      role:      "vip",
      vip_since: new Date().toISOString(),
      vip_until: vipUntil,
    })
    .eq("id", userId);

  if (profileError) throw new Error(`Error actualizando perfil: ${profileError.message}`);

  // 2. Registrar el pago en tabla payments
  await supabaseAdmin
    .from("vip_payments")
    .insert({
      user_id:       userId,
      payment_id:    paymentId,
      plan,
      days,
      vip_until:     vipUntil,
      status:        "approved",
      created_at:    new Date().toISOString(),
    });

  console.log(`✅ VIP asignado: userId=${userId} plan=${plan} hasta=${vipUntil}`);
}

/* ── Handler principal ────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verificar firma
  if (!verifySignature(req, rawBody)) {
    console.warn("❌ Firma de webhook inválida");
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  const { type, data, action } = body;

  console.log(`📦 Webhook MP: type=${type} action=${action} id=${data?.id}`);

  // MP envía distintos tipos: payment, merchant_order, etc.
  // Solo nos importan los de pago aprobado
  if (type !== "payment" && action !== "payment.updated" && action !== "payment.created") {
    return NextResponse.json({ received: true });
  }

  const paymentId = data?.id;
  if (!paymentId) return NextResponse.json({ received: true });

  try {
    // Consultar el pago a la API de MP para obtener el estado real
    const paymentClient = new Payment(mp);
    const payment = await paymentClient.get({ id: String(paymentId) });

    console.log(`💳 Pago ${paymentId}: status=${payment.status}`);

    // Solo procesar pagos aprobados
    if (payment.status !== "approved") {
      return NextResponse.json({ received: true });
    }

    // Parsear external_reference que pusimos en el checkout
    let meta: { userId: string; plan: string; days: number };
    try {
      meta = JSON.parse(payment.external_reference ?? "{}");
    } catch {
      console.error("external_reference inválido:", payment.external_reference);
      return NextResponse.json({ error: "Metadata inválida" }, { status: 400 });
    }

    const { userId, plan, days } = meta;
    if (!userId || !plan || !days) {
      console.error("Metadata incompleta:", meta);
      return NextResponse.json({ error: "Metadata incompleta" }, { status: 400 });
    }

    // Verificar que no se procesó antes (idempotencia)
    const { data: existing } = await supabaseAdmin
      .from("vip_payments")
      .select("id")
      .eq("payment_id", String(paymentId))
      .single();

    if (existing) {
      console.log(`⚠️  Pago ${paymentId} ya procesado, ignorando`);
      return NextResponse.json({ received: true });
    }

    await assignVip(userId, plan, days, String(paymentId));

  } catch (err) {
    console.error("❌ Error procesando webhook:", err);
    // Devolver 200 igual para que MP no reintente infinitamente
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}

/* ── MP también envía GET para verificar el endpoint ─────────────── */
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true });
}