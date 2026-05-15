import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Alternativa a OmeTV en Español 2025 — Turrinder",
  description:
    "Buscás una alternativa a OmeTV? Turrinder es el videochat aleatorio en español más completo. Gratis, sin registro, con comunidad latinoamericana activa.",
  keywords: [
    "alternativa ometv", "ometv alternativa", "ometv en español",
    "paginas como ometv", "sitios como ometv", "ometv gratis",
    "videochat como ometv", "reemplazo ometv",
  ],
  alternates: { canonical: "https://www.turrinder.com/alternativa-ometv" },
  openGraph: {
    title: "Alternativa a OmeTV en Español — Turrinder",
    description: "Videochat aleatorio gratis en español. Mejor que OmeTV.",
    url: "https://www.turrinder.com/alternativa-ometv",
    images: [{ url: "https://www.turrinder.com/og-image.jpg", width: 1200, height: 630 }],
  },
};

export default function AlternativaOmeTVPage() {
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
        .compare{width:100%;border-collapse:collapse;margin:24px 0 40px;font-size:14px}
        .compare th{background:rgba(84,199,248,0.08);color:rgba(84,199,248,0.8);font-family:'Syne',system-ui,sans-serif;font-weight:700;padding:12px 16px;text-align:left;border-bottom:1px solid rgba(84,199,248,0.15)}
        .compare td{padding:12px 16px;border-bottom:1px solid rgba(84,199,248,0.07);color:rgba(180,215,240,0.6)}
        .compare tr:last-child td{border-bottom:none}
        .yes{color:#22c55e;font-weight:700}
        .no{color:rgba(248,113,113,0.7);font-weight:700}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:24px 0 40px}
        .card{background:rgba(84,199,248,0.04);border:1px solid rgba(84,199,248,0.12);border-radius:16px;padding:20px}
        .card-icon{font-size:28px;margin-bottom:12px}
        .card-title{font-family:'Syne',system-ui,sans-serif;font-size:14px;font-weight:700;color:#f5f8ff;margin-bottom:6px}
        .card-desc{font-size:13px;color:rgba(180,215,240,0.45);line-height:1.55}
        .links{display:flex;gap:12px;flex-wrap:wrap;margin-top:48px;padding-top:24px;border-top:1px solid rgba(84,199,248,0.08)}
        .links a{font-size:13px;color:rgba(84,199,248,0.5);text-decoration:none;transition:color .2s}
        .links a:hover{color:rgba(84,199,248,.9)}
        .flag{height:3px;background:linear-gradient(90deg,#54c7f8 33%,rgba(245,248,255,.8) 33% 66%,#54c7f8 66%);opacity:.6;position:fixed;top:0;left:0;right:0;z-index:100}
      `}</style>

      <div className="flag" />

      <div className="land">
        <div className="land-badge">
          <div className="land-badge-dot" />
          Mejor alternativa a OmeTV
        </div>

        <h1>Alternativa a <span>OmeTV</span> en Español</h1>

        <p className="lead">
          OmeTV tiene limitaciones, anuncios constantes y poca comunidad hispanohablante.
          Turrinder es la alternativa que estabas buscando: videochat aleatorio en español,
          gratis, con filtros reales y una comunidad activa de toda Latinoamérica.
        </p>

        <Link href="/" className="cta">
          Probarlo gratis →
        </Link>

        <h2>Turrinder vs OmeTV — Comparación</h2>

        <table className="compare">
          <thead>
            <tr>
              <th>Característica</th>
              <th>Turrinder</th>
              <th>OmeTV</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>En español</td><td className="yes">✓ Sí</td><td className="no">✗ Limitado</td></tr>
            <tr><td>Gratis sin anuncios</td><td className="yes">✓ Sí (plan free)</td><td className="no">✗ Anuncios constantes</td></tr>
            <tr><td>Filtro por género</td><td className="yes">✓ Sí</td><td className="no">✗ Solo VIP</td></tr>
            <tr><td>Modo debates</td><td className="yes">✓ Exclusivo</td><td className="no">✗ No existe</td></tr>
            <tr><td>Chat de texto</td><td className="yes">✓ Incluido</td><td className="yes">✓ Sí</td></tr>
            <tr><td>Comunidad latina</td><td className="yes">✓ Mayoritaria</td><td className="no">✗ Mixta/global</td></tr>
            <tr><td>Sin registro</td><td className="yes">✓ Opcional</td><td className="no">✗ Requerido</td></tr>
          </tbody>
        </table>

        <h2>¿Qué tiene Turrinder que OmeTV no tiene?</h2>

        <div className="grid">
          <div className="card">
            <div className="card-icon">🔥</div>
            <div className="card-title">Modo Debates</div>
            <div className="card-desc">Discutí ideas con desconocidos. Un modo que no existe en ninguna otra plataforma similar.</div>
          </div>
          <div className="card">
            <div className="card-icon">❤️</div>
            <div className="card-title">Modo Ligues</div>
            <div className="card-desc">Conectá con personas que buscan algo especial. Más que un videochat, una experiencia de citas.</div>
          </div>
          <div className="card">
            <div className="card-icon">🎙️</div>
            <div className="card-title">Streamers en vivo</div>
            <div className="card-desc">Seguí a streamers de la comunidad o conviértete en uno. Audiencia real en tiempo real.</div>
          </div>
          <div className="card">
            <div className="card-icon">🌎</div>
            <div className="card-title">Comunidad latina</div>
            <div className="card-desc">La mayoría de usuarios habla español. Sin barreras de idioma ni frustración.</div>
          </div>
        </div>

        <h2>¿Por qué la gente deja OmeTV?</h2>
        <p>
          OmeTV tiene varios problemas que frustran a sus usuarios: anuncios invasivos que interrumpen
          las conversaciones, el filtro de género bloqueado detrás de un pago, y una comunidad
          mayormente angloparlante que dificulta conectar con gente de habla hispana.
        </p>
        <p>
          Turrinder resuelve todos estos puntos. La experiencia base es gratis y sin anuncios,
          los filtros están disponibles para todos, y la comunidad es mayoritariamente latinoamericana.
        </p>

        <div className="links">
          <Link href="/alternativa-omegle">Alternativa a Omegle →</Link>
          <Link href="/videochat-aleatorio">Videochat aleatorio →</Link>
          <Link href="/chat-con-desconocidos">Chat con desconocidos →</Link>
          <Link href="/pagina-de-citas">Página de citas →</Link>
        </div>
      </div>
    </>
  );
}