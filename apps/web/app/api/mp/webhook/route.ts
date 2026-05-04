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

function verifySignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) { console.warn("⚠️  MP_WEBHOOK_SECRET no configurado"); return true; }

  const signature = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";

  if (!signature) { console.warn("⚠️  Sin x-signature — probable cuenta de prueba"); return true; }

  const parts: Record<string, string> = {};
  signature.split(",").forEach(part => {
    const [k, ...rest] = part.split("=");
    if (k) parts[k.trim()] = rest.join("=").trim();
  });

  const { ts, v1 } = parts;
  if (!ts || !v1) { console.warn("⚠️  x-signature mal formado:", signature); return true; }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const valid    = expected === v1;
  if (!valid) console.warn(`⚠️  Firma inválida. Expected=${expected} Got=${v1}`);
  return valid;
}

async function assignVip(userId: string, plan: string, days: number, paymentId: string) {
  const vipUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ role: "vip", vip_since: new Date().toISOString(), vip_until: vipUntil })
    .eq("id", userId);

  if (profileError) throw new Error(`Error profiles: ${profileError.message}`);

  const { error: paymentError } = await supabaseAdmin
    .from("vip_payments")
    .insert({ user_id: userId, payment_id: paymentId, plan, days, vip_until: vipUntil, status: "approved", created_at: new Date().toISOString() });

  if (paymentError) console.warn("⚠️  Error vip_payments:", paymentError.message);

  console.log(`✅ VIP asignado → userId=${userId} plan=${plan} hasta=${vipUntil}`);
}

export async function POST(req: NextRequest) {
  const headersObj: Record<string, string> = {};
  req.headers.forEach((v, k) => { headersObj[k] = v; });
  console.log("📨 Webhook headers:", JSON.stringify(headersObj));

  const rawBody = await req.text();
  console.log("📨 Webhook body:", rawBody);

  let body: any;
  try { body = JSON.parse(rawBody); }
  catch { console.error("❌ Body no es JSON:", rawBody); return NextResponse.json({ received: true }); }

  const { type, data, action, topic } = body;
  const paymentId = data?.id ?? body.id;

  console.log(`📦 type="${type}" topic="${topic}" action="${action}" paymentId="${paymentId}"`);

  const isPaymentEvent =
    type === "payment" || topic === "payment" ||
    action === "payment.updated" || action === "payment.created";

  if (!isPaymentEvent) {
    console.log(`ℹ️  Evento no es de pago → ignorando`);
    return NextResponse.json({ received: true });
  }

  if (!paymentId) {
    console.error("❌ Sin paymentId:", body);
    return NextResponse.json({ received: true });
  }

  verifySignature(req, String(paymentId));

  try {
    console.log(`🔍 Consultando pago ${paymentId}...`);
    const paymentClient = new Payment(mp);
    const payment = await paymentClient.get({ id: String(paymentId) });

    console.log(`💳 status="${payment.status}" external_reference="${payment.external_reference}"`);

    if (payment.status !== "approved") {
      console.log(`ℹ️  Pago no aprobado (${payment.status})`);
      return NextResponse.json({ received: true });
    }

    let meta: { userId?: string; plan?: string; days?: number } = {};
    try { meta = JSON.parse(payment.external_reference ?? "{}"); }
    catch { console.error("❌ external_reference no es JSON:", payment.external_reference); return NextResponse.json({ received: true }); }

    console.log("📋 Meta:", meta);

    const { userId, plan, days } = meta;
    if (!userId || !plan || !days) {
      console.error("❌ Meta incompleta:", meta);
      return NextResponse.json({ received: true });
    }

    const { data: existing } = await supabaseAdmin
      .from("vip_payments").select("id").eq("payment_id", String(paymentId)).maybeSingle();

    if (existing) {
      console.log(`⚠️  Pago ${paymentId} ya procesado`);
      return NextResponse.json({ received: true });
    }

    await assignVip(userId, plan, days, String(paymentId));

  } catch (err: any) {
    console.error("❌ Error webhook:", err?.message ?? err);
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  console.log("✅ Webhook GET ping");
  return NextResponse.json({ ok: true });
}