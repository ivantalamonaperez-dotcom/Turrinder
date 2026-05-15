import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Chat con Desconocidos Gratis en Español 2025 — Turrinder",
  description:
    "Chateá con desconocidos por texto o video en español. Turrinder es la plataforma más segura y completa para hablar con personas nuevas de Argentina, México y España.",
  keywords: [
    "chat con desconocidos", "hablar con desconocidos", "chat con extraños",
    "chatear con desconocidos gratis", "hablar con gente nueva",
    "conocer personas por chat", "chat anonimo en español",
    "chat random en español", "hablar con gente online gratis",
  ],
  alternates: { canonical: "https://www.turrinder.com/chat-con-desconocidos" },
  openGraph: {
    title: "Chat con Desconocidos Gratis en Español — Turrinder",
    description: "Hablá con personas nuevas por texto o video. Seguro, gratis y en español.",
    url: "https://www.turrinder.com/chat-con-desconocidos",
    images: [{ url: "https://www.turrinder.com/og-image.jpg", width: 1200, height: 630 }],
  },
};

export default function ChatConDesconocidosPage() {
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
        .reasons{display:flex;flex-direction:column;gap:12px;margin:24px 0 40px}
        .reason{display:flex;align-items:flex-start;gap:14px;padding:16px 18px;background:rgba(84,199,248,0.03);border:1px solid rgba(84,199,248,0.09);border-radius:12px}
        .reason-icon{font-size:22px;flex-shrink:0;margin-top:2px}
        .reason-title{font-family:'Syne',system-ui,sans-serif;font-size:14px;font-weight:700;color:#f5f8ff;margin-bottom:4px}
        .reason-desc{font-size:13px;color:rgba(180,215,240,0.45);line-height:1.55}
        .safety{background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.18);border-radius:14px;padding:20px 22px;margin:24px 0 40px}
        .safety-title{font-family:'Syne',system-ui,sans-serif;font-size:15px;font-weight:700;color:#4ade80;margin-bottom:10px}
        .safety-list{display:flex;flex-direction:column;gap:7px}
        .safety-item{display:flex;align-items:center;gap:10px;font-size:13.5px;color:rgba(180,215,240,0.55)}
        .safety-check{color:#22c55e;font-weight:700;flex-shrink:0}
        .links{display:flex;gap:12px;flex-wrap:wrap;margin-top:48px;padding-top:24px;border-top:1px solid rgba(84,199,248,0.08)}
        .links a{font-size:13px;color:rgba(84,199,248,0.5);text-decoration:none;transition:color .2s}
        .links a:hover{color:rgba(84,199,248,.9)}
        .flag{height:3px;background:linear-gradient(90deg,#54c7f8 33%,rgba(245,248,255,.8) 33% 66%,#54c7f8 66%);opacity:.6;position:fixed;top:0;left:0;right:0;z-index:100}
      `}</style>

      <div className="flag" />

      <div className="land">
        <div className="land-badge">
          <div className="land-badge-dot" />
          Chat activo ahora mismo
        </div>

        <h1><span>Chat con Desconocidos</span> en Español</h1>

        <p className="lead">
          Conocé personas nuevas por texto o video en español. Turrinder te conecta al instante
          con gente real de Argentina, México, España y toda Latinoamérica. Sin bots, sin perfiles
          falsos, sin esperas.
        </p>

        <Link href="/" className="cta">
          Empezar a chatear →
        </Link>

        <h2>¿Por qué chatear con desconocidos en Turrinder?</h2>

        <div className="reasons">
          <div className="reason">
            <div className="reason-icon">🌎</div>
            <div>
              <div className="reason-title">Comunidad hispanohablante real</div>
              <div className="reason-desc">La mayoría de usuarios habla español. Conectás con gente de tu región, con referencias culturales en común.</div>
            </div>
          </div>
          <div className="reason">
            <div className="reason-icon">⚡</div>
            <div>
              <div className="reason-title">Conexión instantánea</div>
              <div className="reason-desc">En segundos te emparejamos con alguien disponible. Sin esperas, sin listas de espera.</div>
            </div>
          </div>
          <div className="reason">
            <div className="reason-icon">🎭</div>
            <div>
              <div className="reason-title">Múltiples modos</div>
              <div className="reason-desc">Charla casual, debates, ligues o práctica de idiomas. Elegís qué tipo de conversación querés tener.</div>
            </div>
          </div>
          <div className="reason">
            <div className="reason-icon">📱</div>
            <div>
              <div className="reason-title">Funciona en cualquier dispositivo</div>
              <div className="reason-desc">Celular, tablet o computadora. Sin app que descargar. Directo desde el navegador.</div>
            </div>
          </div>
        </div>

        <h2>Seguridad y moderación</h2>

        <div className="safety">
          <div className="safety-title">🛡️ Tu seguridad es nuestra prioridad</div>
          <div className="safety-list">
            <div className="safety-item"><span className="safety-check">✓</span> Sistema de reportes en tiempo real</div>
            <div className="safety-item"><span className="safety-check">✓</span> Moderación activa de contenido inapropiado</div>
            <div className="safety-item"><span className="safety-check">✓</span> Ban inmediato ante comportamientos abusivos</div>
            <div className="safety-item"><span className="safety-check">✓</span> Solo para mayores de 18 años</div>
            <div className="safety-item"><span className="safety-check">✓</span> Podés saltar al siguiente usuario con un clic</div>
          </div>
        </div>

        <h2>¿Para qué usa la gente el chat con desconocidos?</h2>
        <p>
          Las razones son muchas. Algunos quieren practicar idiomas con hablantes nativos.
          Otros buscan conversaciones interesantes sobre temas que les apasionan. Muchos simplemente
          quieren conocer gente nueva sin la presión de las redes sociales tradicionales.
        </p>
        <p>
          En Turrinder también hay personas buscando amistad genuina, debates intelectuales,
          o incluso una conexión romántica. Cada conversación es única porque cada persona lo es.
        </p>

        <div className="links">
          <Link href="/alternativa-omegle">Alternativa a Omegle →</Link>
          <Link href="/alternativa-ometv">Alternativa a OmeTV →</Link>
          <Link href="/videochat-aleatorio">Videochat aleatorio →</Link>
          <Link href="/pagina-de-citas">Página de citas →</Link>
        </div>
      </div>
    </>
  );
}