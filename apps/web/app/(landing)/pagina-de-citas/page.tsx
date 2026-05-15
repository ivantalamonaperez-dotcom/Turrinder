import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página de Citas Online Gratis en Español 2025 — Turrinder",
  description:
    "Encontrá citas online en Turrinder. La alternativa a Tinder y Bumble con videochat en tiempo real. Conocé personas reales de Argentina, México y España. Gratis.",
  keywords: [
    "pagina de citas", "app de citas", "citas online gratis",
    "conocer personas para citas", "alternativa tinder", "alternativa bumble",
    "ligar por internet", "encontrar pareja online", "citas en español",
    "conocer gente para salir", "pagina para ligar", "chat para ligar gratis",
  ],
  alternates: { canonical: "https://www.turrinder.com/pagina-de-citas" },
  openGraph: {
    title: "Página de Citas Online Gratis — Turrinder",
    description: "Conocé personas reales por video. La alternativa a Tinder con videochat.",
    url: "https://www.turrinder.com/pagina-de-citas",
    images: [{ url: "https://www.turrinder.com/og-image.jpg", width: 1200, height: 630 }],
  },
};

export default function PaginaDeCitasPage() {
  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#030a14;color:#f0f8ff;font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
        .land{max-width:780px;margin:0 auto;padding:60px 24px 80px}
        .land-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(84,199,248,0.08);border:1px solid rgba(84,199,248,0.2);border-radius:100px;padding:5px 16px;font-size:12px;font-weight:600;color:rgba(84,199,248,0.8);letter-spacing:.5px;margin-bottom:24px}
        .land-badge-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.7)}70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
        h1{font-family:'Syne',system-ui,sans-serif;font-size:clamp(28px,4vw,48px);font-weight:800;letter-spacing:-1.5px;line-height:1.08;margin-bottom:18px;color:#f5f8ff}
        h1 span{background:linear-gradient(135deg,#f472b6,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lead{font-size:17px;color:rgba(180,215,240,0.65);line-height:1.75;margin-bottom:40px;max-width:640px}
        .cta{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#f472b6,#ec4899,#db2777);color:#fff;padding:16px 32px;border-radius:14px;font-family:'Syne',system-ui,sans-serif;font-size:16px;font-weight:800;text-decoration:none;box-shadow:0 8px 32px rgba(236,72,153,0.4);transition:transform .2s,box-shadow .2s;margin-bottom:64px}
        .cta:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(236,72,153,0.55)}
        h2{font-family:'Syne',system-ui,sans-serif;font-size:22px;font-weight:800;color:#f5f8ff;margin:48px 0 16px;letter-spacing:-.5px}
        p{font-size:15px;color:rgba(180,215,240,0.6);line-height:1.75;margin-bottom:16px}
        .diff{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0 40px}
        @media(max-width:520px){.diff{grid-template-columns:1fr}}
        .diff-card{background:rgba(84,199,248,0.03);border:1px solid rgba(84,199,248,0.1);border-radius:16px;padding:20px}
        .diff-card.pink{background:rgba(236,72,153,0.05);border-color:rgba(236,72,153,0.18)}
        .diff-title{font-family:'Syne',system-ui,sans-serif;font-size:14px;font-weight:800;margin-bottom:12px}
        .diff-card.pink .diff-title{color:#f9a8d4}
        .diff-card:not(.pink) .diff-title{color:rgba(180,215,240,0.5)}
        .diff-list{display:flex;flex-direction:column;gap:8px}
        .diff-item{font-size:13px;line-height:1.5;display:flex;align-items:flex-start;gap:8px}
        .diff-card.pink .diff-item{color:rgba(249,168,212,0.7)}
        .diff-card:not(.pink) .diff-item{color:rgba(180,215,240,0.4)}
        .diff-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-top:6px}
        .diff-card.pink .diff-dot{background:#ec4899}
        .diff-card:not(.pink) .diff-dot{background:rgba(180,215,240,0.25)}
        .features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:24px 0 40px}
        .feat{background:rgba(236,72,153,0.04);border:1px solid rgba(236,72,153,0.12);border-radius:14px;padding:18px}
        .feat-icon{font-size:26px;margin-bottom:10px}
        .feat-title{font-family:'Syne',system-ui,sans-serif;font-size:14px;font-weight:700;color:#f5f8ff;margin-bottom:5px}
        .feat-desc{font-size:13px;color:rgba(180,215,240,0.4);line-height:1.55}
        .testimonials{display:flex;flex-direction:column;gap:12px;margin:24px 0 40px}
        .testi{background:rgba(84,199,248,0.03);border:1px solid rgba(84,199,248,0.09);border-radius:12px;padding:16px 18px}
        .testi-text{font-size:14px;color:rgba(180,215,240,0.6);line-height:1.6;margin-bottom:10px;font-style:italic}
        .testi-author{font-size:12px;color:rgba(84,199,248,0.4);font-weight:600}
        .links{display:flex;gap:12px;flex-wrap:wrap;margin-top:48px;padding-top:24px;border-top:1px solid rgba(84,199,248,0.08)}
        .links a{font-size:13px;color:rgba(84,199,248,0.5);text-decoration:none;transition:color .2s}
        .links a:hover{color:rgba(84,199,248,.9)}
        .flag{height:3px;background:linear-gradient(90deg,#54c7f8 33%,rgba(245,248,255,.8) 33% 66%,#54c7f8 66%);opacity:.6;position:fixed;top:0;left:0;right:0;z-index:100}
      `}</style>

      <div className="flag" />

      <div className="land">
        <div className="land-badge">
          <div className="land-badge-dot" />
          Citas en tiempo real
        </div>

        <h1>La Página de <span>Citas Online</span> con Videochat Real</h1>

        <p className="lead">
          ¿Cansado de chatear semanas antes de saber si hay química? En Turrinder conocés personas
          por video desde el primer momento. Sin perfiles falsos, sin filtros de Instagram.
          Gente real, conexiones reales.
        </p>

        <Link href="/" className="cta">
          Conocer personas ahora →
        </Link>

        <h2>¿Por qué Turrinder es diferente a Tinder o Bumble?</h2>

        <div className="diff">
          <div className="diff-card pink">
            <div className="diff-title">✨ Turrinder</div>
            <div className="diff-list">
              <div className="diff-item"><div className="diff-dot" />Videochat en tiempo real desde el primer momento</div>
              <div className="diff-item"><div className="diff-dot" />Sin algoritmos que ocultan tu perfil</div>
              <div className="diff-item"><div className="diff-dot" />Sin swipes infinitos ni matches que nunca responden</div>
              <div className="diff-item"><div className="diff-dot" />Sabés si hay química antes de escribir</div>
              <div className="diff-item"><div className="diff-dot" />Comunidad latinoamericana activa</div>
              <div className="diff-item"><div className="diff-dot" />Gratis sin funciones bloqueadas</div>
            </div>
          </div>
          <div className="diff-card">
            <div className="diff-title">❌ Apps tradicionales</div>
            <div className="diff-list">
              <div className="diff-item"><div className="diff-dot" />Solo fotos — no sabés cómo es la persona de verdad</div>
              <div className="diff-item"><div className="diff-dot" />Algoritmos que priorizan perfiles de pago</div>
              <div className="diff-item"><div className="diff-dot" />Semanas de chat antes de una videollamada</div>
              <div className="diff-item"><div className="diff-dot" />Perfiles falsos y bots frecuentes</div>
              <div className="diff-item"><div className="diff-dot" />Las mejores funciones son pagas</div>
              <div className="diff-item"><div className="diff-dot" />Pocos usuarios de Latinoamérica</div>
            </div>
          </div>
        </div>

        <h2>Funciones para encontrar citas</h2>

        <div className="features">
          <div className="feat">
            <div className="feat-icon">❤️</div>
            <div className="feat-title">Modo Ligues</div>
            <div className="feat-desc">Videochat especialmente diseñado para conocer personas con intención romántica o de amistad especial.</div>
          </div>
          <div className="feat">
            <div className="feat-icon">🎛️</div>
            <div className="feat-title">Filtro de género</div>
            <div className="feat-desc">Elegís con quién querés conectar. Sin sorpresas, sin perder tiempo con personas que no te interesan.</div>
          </div>
          <div className="feat">
            <div className="feat-icon">💬</div>
            <div className="feat-title">Chat después de conectar</div>
            <div className="feat-desc">Si la conexión fue buena, podés seguir chateando. Guardá el contacto de las personas que te gustaron.</div>
          </div>
          <div className="feat">
            <div className="feat-icon">👁️</div>
            <div className="feat-title">Perfil real</div>
            <div className="feat-desc">Fotos, bio, intereses y lo que buscás. Sin filtros imposibles, con verificación de usuarios reales.</div>
          </div>
        </div>

        <h2>Lo que dicen nuestros usuarios</h2>

        <div className="testimonials">
          <div className="testi">
            <div className="testi-text">"Con Tinder mandé mensajes por semanas sin saber si había onda. En Turrinder en 5 minutos ya sabía si la persona me gustaba de verdad."</div>
            <div className="testi-author">— Usuario de Buenos Aires</div>
          </div>
          <div className="testi">
            <div className="testi-text">"Lo que más me gustó es que podés ver cómo es la persona antes de comprometerte a una cita. Te ahorrás un montón de tiempo."</div>
            <div className="testi-author">— Usuario de Ciudad de México</div>
          </div>
          <div className="testi">
            <div className="testi-text">"Conocí a mi actual pareja en Turrinder. Lo que empezó como un chat aleatorio terminó siendo algo serio."</div>
            <div className="testi-author">— Usuario de Montevideo</div>
          </div>
        </div>

        <div className="links">
          <Link href="/alternativa-omegle">Alternativa a Omegle →</Link>
          <Link href="/alternativa-ometv">Alternativa a OmeTV →</Link>
          <Link href="/videochat-aleatorio">Videochat aleatorio →</Link>
          <Link href="/chat-con-desconocidos">Chat con desconocidos →</Link>
        </div>
      </div>
    </>
  );
}