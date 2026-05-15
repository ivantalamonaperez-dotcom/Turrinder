import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Alternativa a Omegle en Español 2025 — Turrinder",
  description:
    "Omegle cerró. Turrinder es la mejor alternativa a Omegle en español: videochat aleatorio gratis, sin registro, con gente real de Argentina, México y España. Entrá ahora.",
  keywords: [
    "alternativa omegle", "omegle cerro", "omegle no funciona", "omegle 2025",
    "paginas como omegle", "sitios como omegle", "omegle en español",
    "reemplazo omegle", "omegle alternativa gratis",
  ],
  alternates: { canonical: "https://www.turrinder.com/alternativa-omegle" },
  openGraph: {
    title: "La Mejor Alternativa a Omegle en Español — Turrinder",
    description: "Videochat con desconocidos, debates y citas. Gratis y en español.",
    url: "https://www.turrinder.com/alternativa-omegle",
    images: [{ url: "https://www.turrinder.com/og-image.jpg", width: 1200, height: 630 }],
  },
};

export default function AlternativaOmegePage() {
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
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:24px 0 40px}
        .card{background:rgba(84,199,248,0.04);border:1px solid rgba(84,199,248,0.12);border-radius:16px;padding:20px}
        .card-icon{font-size:28px;margin-bottom:12px}
        .card-title{font-family:'Syne',system-ui,sans-serif;font-size:14px;font-weight:700;color:#f5f8ff;margin-bottom:6px}
        .card-desc{font-size:13px;color:rgba(180,215,240,0.45);line-height:1.55}
        .faq{display:flex;flex-direction:column;gap:16px;margin:24px 0}
        .faq-item{background:rgba(84,199,248,0.03);border:1px solid rgba(84,199,248,0.1);border-radius:12px;padding:18px 20px}
        .faq-q{font-family:'Syne',system-ui,sans-serif;font-size:14px;font-weight:700;color:#f5f8ff;margin-bottom:8px}
        .faq-a{font-size:13.5px;color:rgba(180,215,240,0.5);line-height:1.6}
        .links{display:flex;gap:12px;flex-wrap:wrap;margin-top:48px;padding-top:24px;border-top:1px solid rgba(84,199,248,0.08)}
        .links a{font-size:13px;color:rgba(84,199,248,0.5);text-decoration:none;transition:color .2s}
        .links a:hover{color:rgba(84,199,248,.9)}
        .flag{height:3px;background:linear-gradient(90deg,#54c7f8 33%,rgba(245,248,255,.8) 33% 66%,#54c7f8 66%);opacity:.6;position:fixed;top:0;left:0;right:0;z-index:100}
      `}</style>

      <div className="flag" />

      <div className="land">
        <div className="land-badge">
          <div className="land-badge-dot" />
          Alternativa activa a Omegle
        </div>

        <h1>La Mejor <span>Alternativa a Omegle</span> en Español</h1>

        <p className="lead">
          Omegle cerró sus puertas en noviembre de 2023. Si estás buscando una alternativa a Omegle
          en español, Turrinder es la plataforma que lo reemplaza: videochat aleatorio con personas
          reales, debates en vivo y la posibilidad de conocer gente de toda Latinoamérica y España.
        </p>

        <Link href="/" className="cta">
          Empezar gratis ahora →
        </Link>

        <h2>¿Por qué Turrinder es mejor que Omegle?</h2>
        <p>
          Omegle fue durante años la plataforma de referencia para chatear con desconocidos por video.
          Pero cerró definitivamente en 2023. Turrinder nace como su evolución natural: misma idea,
          mejor ejecución, enfocada en el público hispanohablante.
        </p>

        <div className="grid">
          <div className="card">
            <div className="card-icon">🌎</div>
            <div className="card-title">100% en español</div>
            <div className="card-desc">Comunidad de Argentina, México, España, Colombia y más países hispanohablantes.</div>
          </div>
          <div className="card">
            <div className="card-icon">🎛️</div>
            <div className="card-title">Filtros inteligentes</div>
            <div className="card-desc">Filtrá por género, idioma y tipo de conexión. Omegle no tenía nada de esto.</div>
          </div>
          <div className="card">
            <div className="card-icon">🔥</div>
            <div className="card-title">Debates en vivo</div>
            <div className="card-desc">Modo debate único: discutí ideas con personas que piensan diferente.</div>
          </div>
          <div className="card">
            <div className="card-icon">✅</div>
            <div className="card-title">Sin registro obligatorio</div>
            <div className="card-desc">Entrás en segundos. Sin formularios largos ni verificaciones complicadas.</div>
          </div>
          <div className="card">
            <div className="card-icon">💬</div>
            <div className="card-title">Chat y videollamada</div>
            <div className="card-desc">Elegís cómo conectar: solo texto, solo video, o los dos a la vez.</div>
          </div>
          <div className="card">
            <div className="card-icon">🆓</div>
            <div className="card-title">Completamente gratis</div>
            <div className="card-desc">Acceso completo sin pagar. Plan VIP opcional para quienes quieren más.</div>
          </div>
        </div>

        <h2>¿Qué pasó con Omegle?</h2>
        <p>
          Omegle cerró en noviembre de 2023 después de 14 años en línea. Su fundador, Leif K-Brooks,
          anunció el cierre debido a la presión legal y los costos de moderar una plataforma de esa
          escala. Millones de usuarios quedaron sin su herramienta favorita para conocer personas
          por video en internet.
        </p>
        <p>
          Desde entonces, muchos buscaron alternativas. Turrinder es la opción más completa en
          español: misma esencia, mejor comunidad, más funciones.
        </p>

        <h2>Preguntas frecuentes</h2>
        <div className="faq">
          <div className="faq-item">
            <div className="faq-q">¿Turrinder es completamente gratis?</div>
            <div className="faq-a">Sí. Podés usar Turrinder sin pagar nada. Existe un plan VIP opcional que desbloquea funciones extra como sin anuncios y salas privadas.</div>
          </div>
          <div className="faq-item">
            <div className="faq-q">¿Necesito registrarme para usarlo?</div>
            <div className="faq-a">Podés explorar sin registro. Para guardar tu perfil y acceder a todas las funciones, el registro es rápido y gratuito.</div>
          </div>
          <div className="faq-item">
            <div className="faq-q">¿Está disponible en Argentina y México?</div>
            <div className="faq-a">Sí. Turrinder tiene comunidad activa en Argentina, México, España, Colombia, Chile y toda Latinoamérica.</div>
          </div>
          <div className="faq-item">
            <div className="faq-q">¿Es seguro?</div>
            <div className="faq-a">Turrinder tiene sistema de reportes y moderación. Solo para mayores de 18 años.</div>
          </div>
        </div>

        <div className="links">
          <Link href="/alternativa-ometv">Alternativa a OmeTV →</Link>
          <Link href="/videochat-aleatorio">Videochat aleatorio →</Link>
          <Link href="/chat-con-desconocidos">Chat con desconocidos →</Link>
          <Link href="/pagina-de-citas">Página de citas →</Link>
        </div>
      </div>
    </>
  );
}