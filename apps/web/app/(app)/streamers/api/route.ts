import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, usuario, email, categoria, seguidores, link, bio } = body;

    if (!nombre || !usuario || !email || !categoria || !bio) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,   // tu cuenta gmail que envía
        pass: process.env.GMAIL_PASS,   // contraseña de aplicación de Google
      },
    });

    await transporter.sendMail({
      from: `"Turrinder Streamers" <${process.env.GMAIL_USER}>`,
      to: "bicodeservices.info@gmail.com",
      subject: `🎙 Nueva aplicación de streamer — @${usuario}`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; background: #020a16; color: #f5f8ff; padding: 32px; border-radius: 16px; max-width: 560px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 48px; margin-bottom: 8px;">🎙</div>
            <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #c4b5fd;">Nueva aplicación de Streamer</h1>
            <p style="color: rgba(180,215,240,0.5); font-size: 13px; margin: 6px 0 0;">Turrinder · ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            ${[
              ["👤 Nombre",      nombre],
              ["🎮 Usuario",     `@${usuario}`],
              ["📧 Email",       email],
              ["🏷 Categoría",   categoria],
              ["👥 Seguidores",  seguidores || "No especificado"],
              ["🔗 Link",        link       || "No especificado"],
            ].map(([label, value]) => `
              <tr>
                <td style="padding: 10px 14px; background: rgba(167,139,250,0.08); border-radius: 8px; font-size: 12px; font-weight: 700; color: rgba(196,181,253,0.7); white-space: nowrap; width: 140px;">${label}</td>
                <td style="padding: 10px 14px; font-size: 13px; color: #f5f8ff;">${value}</td>
              </tr>
              <tr><td colspan="2" style="height: 6px;"></td></tr>
            `).join("")}
          </table>

          <div style="margin-top: 20px; padding: 16px; background: rgba(167,139,250,0.06); border: 1px solid rgba(167,139,250,0.18); border-radius: 12px;">
            <p style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(196,181,253,0.5); margin: 0 0 8px;">📝 Bio / Descripción</p>
            <p style="font-size: 13px; color: rgba(240,248,255,0.8); line-height: 1.6; margin: 0;">${bio}</p>
          </div>

          <div style="margin-top: 24px; text-align: center; font-size: 11px; color: rgba(180,215,240,0.25);">
            Turrinder © ${new Date().getFullYear()} · Esta aplicación fue enviada desde la plataforma
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error enviando email:", err);
    return NextResponse.json({ error: "Error al enviar el email." }, { status: 500 });
  }
}