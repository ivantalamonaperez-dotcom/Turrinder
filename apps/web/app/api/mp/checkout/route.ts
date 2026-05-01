import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Preference } from "mercadopago";

// ── Validar variables de entorno al arrancar ──────────────────────
// Si falta alguna, el error aparece claro en los logs de Vercel
const MP_ACCESS_TOKEN        = process.env.MP_ACCESS_TOKEN;
const SUPABASE_URL           = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL                = process.env.NEXT_PUBLIC_APP_URL;

if (!MP_ACCESS_TOKEN)      console.error("❌ ENV FALTANTE: MP_ACCESS_TOKEN");
if (!SUPABASE_URL)         console.error("❌ ENV FALTANTE: NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_SERVICE_KEY) console.error("❌ ENV FALTANTE: SUPABASE_SERVICE_ROLE_KEY");
if (!APP_URL)              console.error("❌ ENV FALTANTE: NEXT_PUBLIC_APP_URL");

const mp = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN ?? "",
});

const supabaseAdmin = createClient(
  SUPABASE_URL    ?? "",
  SUPABASE_SERVICE_KEY ?? ""
);

// Precios según país/moneda
const PLANS = {
  AR: {
    monthly: { price: 4999,  currency: "ARS", label: "VIP Mensual",  days: 30  },
    annual:  { price: 39999, currency: "ARS", label: "VIP Anual",    days: 365 },
  },
  USD: {
    monthly: { price: 4.99,  currency: "USD", label: "VIP Mensual",  days: 30  },
    annual:  { price: 39.99, currency: "USD", label: "VIP Anual",    days: 365 },
  },
};

export async function POST(req: NextRequest) {
  // Verificar envs antes de hacer cualquier cosa
  if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !APP_URL) {
    console.error("❌ Variables de entorno faltantes en /api/mp/checkout");
    return NextResponse.json(
      { error: "Configuración del servidor incompleta. Contactá al soporte." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { plan, userId, country } = body as {
      plan: "monthly" | "annual";
      userId: string;
      country: string;
    };

    if (!plan || !userId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // Elegir precios según país
    const priceSet = country === "AR" ? PLANS.AR : PLANS.USD;
    const selected = priceSet[plan];

    // Verificar usuario en Supabase
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError) {
      console.error("❌ Supabase auth error:", authError.message);
      return NextResponse.json({ error: "Error verificando usuario" }, { status: 500 });
    }
    if (!authUser?.user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    const email = authUser.user.email ?? "";

    // Crear preferencia de Mercado Pago
    const preference = new Preference(mp);
    const response = await preference.create({
      body: {
        items: [
          {
            id:          `turrinder-vip-${plan}`,
            title:       `Turrinder ${selected.label}`,
            description: `Acceso VIP por ${selected.days} días — sin anuncios, likes ilimitados y más.`,
            quantity:    1,
            unit_price:  selected.price,
            currency_id: selected.currency,
          },
        ],
        payer: { email },
        external_reference: JSON.stringify({ userId, plan, days: selected.days }),
        back_urls: {
          success: `${APP_URL}/vip/success`,
          failure: `${APP_URL}/vip?error=payment_failed`,
          pending: `${APP_URL}/vip?pending=true`,
        },
        auto_return:          "approved",
        notification_url:     `${APP_URL}/api/mp/webhook`,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to:   new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    return NextResponse.json({
      url:          response.init_point,
      url_sandbox:  response.sandbox_init_point,
      preferenceId: response.id,
    });

  } catch (err: any) {
    // Log detallado para Vercel
    console.error("❌ MP checkout error:", err?.message ?? err);
    return NextResponse.json({ error: "Error al crear la preferencia de pago" }, { status: 500 });
  }
}