import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Preference } from "mercadopago";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Precios según país/moneda
const PLANS = {
  AR: {
    monthly: { price: 4999,  currency: "ARS", label: "VIP Mensual",  days: 30  },
    annual:  { price: 39999, currency: "ARS", label: "VIP Anual",    days: 365 },
  },
  // Para cualquier otro país → USD
  USD: {
    monthly: { price: 4.99,  currency: "USD", label: "VIP Mensual",  days: 30  },
    annual:  { price: 39.99, currency: "USD", label: "VIP Anual",    days: 365 },
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, userId, country } = body as {
      plan: "monthly" | "annual";
      userId: string;
      country: string; // "AR" | "MX" | "BR" | etc.
    };

    if (!plan || !userId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // Elegir precios según país
    const priceSet = country === "AR" ? PLANS.AR : PLANS.USD;
    const selected = priceSet[plan];

    // Verificar usuario en Supabase
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!authUser?.user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    const email = authUser.user.email ?? "";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

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
        // Metadata que llega al webhook para asignar el VIP
        external_reference: JSON.stringify({ userId, plan, days: selected.days }),
        back_urls: {
          success: `${appUrl}/vip/success`,
          failure: `${appUrl}/vip?error=payment_failed`,
          pending: `${appUrl}/vip?pending=true`,
        },
        auto_return:        "approved",
        notification_url:   `${appUrl}/api/mp/webhook`,
        // Expiración de la preferencia: 24hs
        expiration_date_from: new Date().toISOString(),
        expiration_date_to:   new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    return NextResponse.json({
      url:          response.init_point,       // URL de pago producción
      url_sandbox:  response.sandbox_init_point, // URL de pago sandbox/test
      preferenceId: response.id,
    });

  } catch (err) {
    console.error("MP checkout error:", err);
    return NextResponse.json({ error: "Error al crear la preferencia de pago" }, { status: 500 });
  }
}