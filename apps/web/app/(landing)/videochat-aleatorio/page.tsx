import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Videochat Aleatorio Gratis en Español 2025 — Turrinder",
  description:
    "Videochat aleatorio gratis con personas reales en español. Sin registro, sin descargas. Conectá al instante con gente de Argentina, México y España en Turrinder.",
  keywords: [
    "videochat aleatorio", "video chat aleatorio gratis", "chat por video con desconocidos",
    "videollamada con desconocidos", "chat con camara gratis", "random video chat español",
    "videochat gratis sin registro", "chat por camara online",
  ],
  alternates: { canonical: "https://www.turrinder.com/videochat-aleatorio" },
  openGraph: {
    title: "Videochat Aleatorio Gratis en Español — Turrinder",
    description: "Conectá por video con desconocidos al instante. Gratis y en español.",
    url: "https://www.turrinder.com/videochat-aleatorio",
    images: [{ url: "https://www.turrinder.com/og-image.jpg", width: 1200, height: 630 }],
  },
};

export default function VideochatAleatorioPage() {
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
        h1 span{background:linear-gradient(135deg,#54c7f8,#3b9eda);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .lead{font-size:17px;color:rgba(180,215,240,0.65);line-height:1.75;margin-bottom:40px;max-width:640px}
        .cta{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#54c7f8,#3b9eda,#1a6fa8);color:#020d18;padding:16px 32px;border-radius:14px;font-family:'Syne',system-ui,sans-serif;font-size:16px;font-weight:800;text-decoration:none;box-shadow:0 8px 32px rgba(84,199,248,0.4);transition:transform .2s,box-shadow .2s;margin-bottom:64px}
        .cta:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(84,199,248,0.55)}
        h2{font-family:'Syne',system-ui,sans-serif;font-size:22px;font-weight:800;color:#f5f8ff;margin:48px 0 16px;letter-spacing:-.5px}
        p{font-size:15px;color:rgba(180,215,240,0.6);line-height:1.75;margin-bottom:16px}
        .steps{display:flex;flex-direction:column;gap:16px;margin:24px 0 40px}
        .step{display:flex;align-items:flex-start;gap:16px;background:rgba(84,199,248,0.03);border:1px solid rgba(84,199,248,0.1);border-radius:14px;padding:18px 20px}
        .step-num{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#54c7f8,#3b9eda);color:#020d18;font-family:'Syne',system-ui,sans-serif;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .step-text{flex:1}
        .step-title{font-family:'Syne',system-ui,sans-serif;font-size:14px;font-weight:700;color:#f5f8ff;margin-bottom:5px}
        .step-desc{font-size:13px;color:rgba(180,215,240,0.45);line-height:1.55}
        .modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin:24px 0 40px}
        .mode{background:rgba(84,199,248,0.04);border:1px solid rgba(84,199,248,0.12);border-radius:14px;padding:18px;text-align:center}
        .mode-icon{font-size:32px;margin-bottom:10px}
        .mode-title{font-family:'Syne',system-ui,sans-serif;font-size:14px;font-weight:700;color:#f5f8ff;margin-bottom:5px}
        .mode-desc{font-size:12px;color:rgba(180,215,240,0.4);line-height:1.5}
        .links{display:flex;gap:12px;flex-wrap:wrap;margin-top:48px;padding-top:24px;border-top:1px solid rgba(84,199,248,0.08)}
        .links a{font-size:13px;color:rgba(84,199,248,0.5);text-decoration:none;transition:color .2s}
        .links a:hover{color:rgba(84,199,248,.9)}
        .flag{height:3px;background:linear-gradient(90deg,#54c7f8 33%,rgba(245,248,255,.8) 33% 66%,#54c7f8 66%);opacity:.6;position:fixed;top:0;left:0;right:0;z-index:100}
      `}</style>

      <div className="flag" />

      <div className="land">
        <div className="land-badge">
          <div className="land-badge-dot" />
          Miles de personas conectadas ahora
        </div>

        <h1><span>Videochat Aleatorio</span> Gratis en Español</h1>

        <p className="lead">
          Conectá por video con personas reales al instante. Sin descargas, sin registro obligatorio,
          sin esperas. Turrinder es el videochat aleatorio en español más completo de Latinoamérica.
        </p>

        <Link href="/" className="cta">
          Iniciar videochat ahora →
        </Link>

        <h2>¿Cómo funciona?</h2>

        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-text">
              <div className="step-title">Entrás a Turrinder</div>
              <div className="step-desc">Sin descargas. Funciona directo en el navegador, desde cualquier dispositivo.</div>
            </div>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-text">
              <div className="step-title">Elegís tu modo de conexión</div>
              <div className="step-desc">Discover para conocer gente, Ligues para algo más especial, o Debates para intercambiar ideas.</div>
            </div>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-text">
              <div className="step-title">Conectás al instante</div>
              <div className="step-desc">El sistema te empareja automáticamente con alguien disponible. ¿No conectaste? Siguiente.</div>
            </div>
          </div>
        </div>

        <h2>Modos de videochat disponibles</h2>

        <div className="modes">
          <div className="mode">
            <div className="mode-icon">🎲</div>
            <div className="mode-title">Discover</div>
            <div className="mode-desc">Videochat aleatorio clásico. Conocé a alguien nuevo con cada conexión.</div>
          </div>
          <div className="mode">
            <div className="mode-icon">❤️</div>
            <div className="mode-title">Ligues</div>
            <div className="mode-desc">Para conocer personas con intención romántica o de amistad profunda.</div>
          </div>
          <div className="mode">
            <div className="mode-icon">🔥</div>
            <div className="mode-title">Debates</div>
            <div className="mode-desc">Discutí ideas, política, cultura o cualquier tema con alguien que opine diferente.</div>
          </div>
          <div className="mode">
            <div className="mode-icon">🌐</div>
            <div className="mode-title">Idiomas</div>
            <div className="mode-desc">Practicá inglés, portugués u otros idiomas con hablantes nativos.</div>
          </div>
        </div>

        <h2>¿Es realmente gratis?</h2>
        <p>
          Sí. El videochat aleatorio en Turrinder es completamente gratis. Podés conectar con
          personas, usar el chat de texto, filtrar por género e idioma, todo sin pagar nada.
        </p>
        <p>
          Existe un plan VIP opcional para quienes quieren una experiencia premium: sin anuncios,
          likes ilimitados y salas privadas. Pero la experiencia base es y seguirá siendo gratuita.
        </p>

        <div className="links">
          <Link href="/alternativa-omegle">Alternativa a Omegle →</Link>
          <Link href="/alternativa-ometv">Alternativa a OmeTV →</Link>
          <Link href="/chat-con-desconocidos">Chat con desconocidos →</Link>
          <Link href="/pagina-de-citas">Página de citas →</Link>
        </div>
      </div>
    </>
  );
}