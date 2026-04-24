"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";

import imgLigues  from "../../Images/ligues.png";
import imgDebates from "../../Images/debates.png";
import imgIdiomas from "../../Images/idiomas.png";

const MODALIDADES = [
  {
    id: "ligues",
    label: "Ligues",
    number: "01",
    tagline: "Conocé gente nueva en tiempo real",
    description: "Video en vivo con personas al azar. Dale like si hay química, pasá si no. Simple.",
    href: "/modalidades/ligues",
    active: true,
    image: imgLigues,
    accentFrom: "#54c7f8",
    accentTo: "#1a6fa8",
    glowColor: "rgba(84,199,248,0.28)",
    glowColorSoft: "rgba(84,199,248,0.08)",
  },
  {
    id: "debate",
    label: "Debate",
    number: "02",
    tagline: "Creá salas y debatí con quien elijas",
    description: "Iniciá una sala privada o pública e invitá a personas para debatir sobre cualquier tema en tiempo real.",
    href: "/modalidades/salas",
    active: true,
    image: imgDebates,
    accentFrom: "#f59e0b",
    accentTo: "#b45309",
    glowColor: "rgba(245,158,11,0.28)",
    glowColorSoft: "rgba(245,158,11,0.07)",
  },
  {
    id: "amigos",
    label: "Amigos",
    number: "03",
    tagline: "Encontrá tu próximo mejor amigo",
    description: "Modo sin presión. Conocé gente con intereses en común sin el factor romántico.",
    href: "/modalidades/amigos",
    active: false,
    image: imgLigues,
    accentFrom: "#34d399",
    accentTo: "#059669",
    glowColor: "rgba(52,211,153,0.28)",
    glowColorSoft: "rgba(52,211,153,0.06)",
  },
  {
    id: "idiomas",
    label: "Idiomas",
    number: "04",
    tagline: "Practicá con nativos",
    description: "Conversaciones reales con hablantes nativos del idioma que estás aprendiendo.",
    href: "/modalidades/idiomas",
    active: false,
    image: imgIdiomas,
    accentFrom: "#a78bfa",
    accentTo: "#6d28d9",
    glowColor: "rgba(167,139,250,0.28)",
    glowColorSoft: "rgba(167,139,250,0.06)",
  },
];

export default function ModalidadesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/");
    };
    checkUser();
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }

        :root {
          --sky:#54c7f8; --sky2:#3b9eda; --sky3:#1a6fa8;
          --white-arg:#f5f8ff;
          --bg:#030a14;
          --glass-b:rgba(84,199,248,0.10);
          --text:rgba(240,248,255,0.88);
          --muted:rgba(180,215,240,0.42);
        }

        html, body { height:100%; background:var(--bg); overflow-x:hidden }
        body { font-family:'DM Sans',sans-serif; -webkit-font-smoothing:antialiased; color:var(--text) }

        body::before {
          content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity:.22;
        }

        /* ── AURORA ── */
        .aurora {
          position:fixed; inset:0; z-index:0; pointer-events:none;
          background:
            radial-gradient(ellipse 75% 55% at 8% 12%,  rgba(84,199,248,0.13) 0%, transparent 62%),
            radial-gradient(ellipse 55% 45% at 92% 85%, rgba(59,158,218,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 45% 38% at 72% 8%,  rgba(26,111,168,0.08) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 22% 95%, rgba(143,212,255,0.05) 0%, transparent 52%);
          animation:auroraAnim 22s ease-in-out infinite alternate;
        }
        @keyframes auroraAnim {
          0%   { opacity:.7;  transform:scale(1)    }
          50%  { opacity:1;   transform:scale(1.04) }
          100% { opacity:.85; transform:scale(1.07) }
        }

        /* ── FLAG STRIPE ── */
        .mp-flag {
          position:fixed; top:0; left:0; right:0; height:3px; z-index:200;
          background:linear-gradient(90deg,
            var(--sky) 0%,var(--sky) 33%,
            rgba(245,248,255,0.9) 33%,rgba(245,248,255,0.9) 66%,
            var(--sky) 66%,var(--sky) 100%);
          opacity:.65;
        }

        /* ── PAGE ── */
        .mp {
          position:relative; z-index:1;
          min-height:100vh;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:56px 32px 48px;
          gap:0;
        }

        /* ── HEADER ── */
        .mp-header {
          width:100%; max-width:960px;
          display:flex; flex-direction:column; align-items:center;
          text-align:center;
          margin-bottom:48px;
          opacity:0; transform:translateY(22px);
          transition:opacity .7s ease, transform .7s ease;
        }
        .mp-header.in { opacity:1; transform:translateY(0) }

        .mp-pill {
          display:inline-flex; align-items:center; gap:7px;
          background:rgba(84,199,248,0.07); border:1px solid rgba(84,199,248,0.18);
          border-radius:100px; padding:5px 16px; margin-bottom:22px;
          font-size:10px; font-weight:600; letter-spacing:2.5px; text-transform:uppercase;
          color:rgba(143,212,255,0.85);
        }
        .mp-pill-dot {
          width:5px; height:5px; border-radius:50%; background:var(--sky);
          box-shadow:0 0 6px rgba(84,199,248,0.9);
          animation:skyPulse 2.2s infinite;
        }
        @keyframes skyPulse {
          0%   { box-shadow:0 0 0 0   rgba(84,199,248,0.7) }
          70%  { box-shadow:0 0 0 8px rgba(84,199,248,0)   }
          100% { box-shadow:0 0 0 0   rgba(84,199,248,0)   }
        }

        .mp-h1 {
          font-family:'Syne',sans-serif;
          font-size:clamp(44px,5.5vw,78px);
          font-weight:900; color:var(--white-arg);
          letter-spacing:-4px; line-height:.91;
          margin-bottom:18px;
        }
        .mp-h1 em {
          font-style:normal;
          background:linear-gradient(120deg,var(--sky) 0%,#c8f2ff 45%,var(--sky2) 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }

        .mp-sub {
          font-size:15px; color:var(--muted); line-height:1.8; max-width:400px;
        }

        /* ── GRID ── */
        .mp-grid {
          width:100%; max-width:960px;
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:16px;
        }

        /* ── CARD ── */
        .mp-card {
          position:relative;
          border-radius:24px;
          border:1px solid rgba(255,255,255,0.055);
          background:rgba(5,13,26,0.78);
          backdrop-filter:blur(24px);
          overflow:hidden;
          display:flex; flex-direction:column;
          opacity:0; transform:translateY(32px) scale(.975);
          transition:
            opacity .65s ease,
            transform .65s ease,
            border-color .3s ease,
            box-shadow .3s ease;
          -webkit-tap-highlight-color:transparent;
        }
        .mp-card.in { opacity:1; transform:translateY(0) scale(1) }
        .mp-card.active { cursor:pointer }
        .mp-card.inactive.in { opacity:.2 }

        .mp-card.active:hover {
          border-color:var(--ca, rgba(84,199,248,0.3));
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04),
            0 28px 68px rgba(0,0,0,0.65),
            0 6px 28px var(--cg, rgba(84,199,248,0.15));
          transform:translateY(-7px) scale(1.018);
        }
        .mp-card.active:active { transform:scale(.972); transition-duration:.1s }

        /* top accent */
        .mp-card-topbar {
          position:absolute; top:0; left:0; right:0; height:2px;
          border-radius:24px 24px 0 0; z-index:4; opacity:.85;
        }

        /* ambient glow */
        .mp-card-glow {
          position:absolute; inset:0; pointer-events:none; z-index:0; border-radius:24px;
          background:radial-gradient(ellipse 85% 55% at 50% 0%, var(--cgs, rgba(84,199,248,0.07)) 0%, transparent 70%);
          opacity:0; transition:opacity .4s ease;
        }
        .mp-card.active:hover .mp-card-glow { opacity:1 }

        /* shimmer sweep */
        .mp-shimmer {
          position:absolute; inset:0; pointer-events:none; z-index:5; border-radius:24px;
          background:linear-gradient(115deg,
            transparent 20%,
            rgba(255,255,255,.016) 45%,
            rgba(255,255,255,.05) 50%,
            rgba(255,255,255,.016) 55%,
            transparent 80%);
          transform:translateX(-120%); transition:none;
        }
        .mp-card.active:hover .mp-shimmer { transform:translateX(120%); transition:transform .8s ease }

        /* image */
        .mp-card-img-wrap {
          width:100%; flex-shrink:0;
          position:relative; overflow:hidden; height:168px;
        }
        .mp-card-img {
          width:100%; height:100%; padding:26px;
          object-fit:contain; object-position:center;
          filter:saturate(.8) brightness(.84);
          animation:levitate 5.5s ease-in-out infinite;
          transition:filter .4s ease;
        }
        .mp-card:nth-child(1) .mp-card-img { animation-delay:0s    }
        .mp-card:nth-child(2) .mp-card-img { animation-delay:-1.6s }
        .mp-card:nth-child(3) .mp-card-img { animation-delay:-0.9s }
        .mp-card:nth-child(4) .mp-card-img { animation-delay:-2.4s }
        @keyframes levitate {
          0%,100% { transform:translateY(0)    scale(1)     }
          45%     { transform:translateY(-10px) scale(1.028) }
          70%     { transform:translateY(-4px)  scale(1.012) }
        }
        .mp-card.active:hover .mp-card-img {
          filter:saturate(1.15) brightness(1.08);
          animation-play-state:paused;
          transform:translateY(-16px) scale(1.1) !important;
          transition:transform .45s cubic-bezier(0.16,1,0.3,1), filter .4s ease;
        }
        .mp-card.inactive .mp-card-img {
          filter:saturate(0) brightness(.28);
          animation-play-state:paused;
        }
        .mp-card-img-wrap::after {
          content:''; position:absolute; inset:0; z-index:1; pointer-events:none;
          background:linear-gradient(to bottom, transparent 36%, rgba(5,13,26,.96) 100%);
        }

        /* body */
        .mp-card-body {
          flex:1; padding:16px 20px 20px;
          display:flex; flex-direction:column; gap:7px;
          position:relative; z-index:2;
        }

        .mp-card-row {
          display:flex; align-items:center; justify-content:space-between; gap:8px;
        }

        .mp-card-label {
          font-family:'Syne',sans-serif; font-size:22px; font-weight:900;
          color:var(--white-arg); letter-spacing:-.5px; line-height:1;
        }

        .mp-badge-on {
          display:inline-flex; align-items:center; gap:5px;
          background:rgba(84,199,248,.08); border:1px solid rgba(84,199,248,.22);
          border-radius:100px; padding:4px 11px;
          font-size:8px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;
          color:rgba(143,212,255,.9); flex-shrink:0;
          animation:badgeBreath 3s ease-in-out infinite;
        }
        @keyframes badgeBreath { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 14px rgba(84,199,248,.22)} }

        .mp-dot {
          width:5px; height:5px; border-radius:50%;
          background:#54c7f8; box-shadow:0 0 6px rgba(84,199,248,.9);
          animation:dotPulse 2s ease-in-out infinite;
        }
        @keyframes dotPulse { 0%,100%{opacity:1} 50%{opacity:.2} }

        .mp-badge-off {
          display:inline-flex;
          background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07);
          border-radius:100px; padding:4px 11px;
          font-size:8px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;
          color:rgba(160,205,240,.2); flex-shrink:0;
        }

        .mp-card-tagline { font-size:12px; font-weight:500; line-height:1.45 }
        .mp-card-desc { font-size:11.5px; color:rgba(160,205,240,.42); line-height:1.7 }

        .mp-card-num {
          position:absolute; bottom:14px; right:16px;
          font-family:'Syne',sans-serif; font-size:11px; font-weight:800;
          letter-spacing:1px; opacity:.11; transition:opacity .3s; z-index:2;
        }
        .mp-card.active:hover .mp-card-num { opacity:.42 }

        /* CTA arrow */
        .mp-card-cta {
          display:inline-flex; align-items:center; gap:6px;
          margin-top:4px;
          font-size:11px; font-weight:600; letter-spacing:.4px;
          opacity:0; transform:translateX(-6px);
          transition:opacity .28s ease, transform .28s ease;
        }
        .mp-card.active:hover .mp-card-cta { opacity:1; transform:translateX(0) }
        .mp-cta-arrow { transition:transform .22s ease }
        .mp-card.active:hover .mp-cta-arrow { transform:translateX(4px) }

        /* ── FOOTER ── */
        .mp-footer {
          width:100%; max-width:960px;
          display:flex; align-items:center; justify-content:center; gap:10px;
          padding-top:30px;
          opacity:0; transition:opacity .6s ease 1.1s;
        }
        .mp-footer.in { opacity:1 }
        .mp-footer-line { flex:1; height:1px; background:rgba(84,199,248,.055) }
        .mp-footer-txt {
          font-size:9px; letter-spacing:2.5px; text-transform:uppercase;
          color:rgba(160,205,240,.13);
        }

        /* ── RESPONSIVE ── */
        @media(max-width:700px) {
          .mp { padding:40px 16px 40px; justify-content:flex-start; }
          .mp-header { margin-bottom:32px; }
          .mp-h1 { font-size:clamp(38px,9vw,52px); letter-spacing:-2.5px; }
          .mp-grid { grid-template-columns:1fr; gap:14px; }
          .mp-card-img-wrap { height:144px; }
        }
      `}</style>

      <div className="aurora" />
      <div className="mp-flag" />

      <div className="mp">

        {/* HEADER */}
        <header className={`mp-header ${mounted ? "in" : ""}`}>
          <div className="mp-pill">
            <div className="mp-pill-dot" />
            Elegí tu modo
          </div>
          <h1 className="mp-h1">Modal<em>idades</em></h1>
          <p className="mp-sub">
            Cada modalidad es una experiencia diferente.<br />
            Explorá, conocé, debatí.
          </p>
        </header>

        {/* CARDS */}
        <div className="mp-grid">
          {MODALIDADES.map((mod, i) => (
            <div
              key={mod.id}
              className={`mp-card ${mod.active ? "active" : "inactive"} ${mounted ? "in" : ""}`}
              style={{
                transitionDelay: mounted ? `${0.15 + i * 0.1}s` : "0s",
                // @ts-ignore
                "--cg":  mod.glowColor,
                "--cgs": mod.glowColorSoft,
                "--ca":  mod.accentFrom + "55",
              }}
              onClick={() => mod.active && router.push(mod.href)}
              role={mod.active ? "button" : undefined}
              tabIndex={mod.active ? 0 : undefined}
              onKeyDown={(e) => mod.active && e.key === "Enter" && router.push(mod.href)}
            >
              <div
                className="mp-card-topbar"
                style={{ background:`linear-gradient(90deg,${mod.accentFrom},${mod.accentTo})` }}
              />
              <div className="mp-card-glow" />
              <div className="mp-shimmer" />

              <div className="mp-card-img-wrap">
                <img
                  src={(mod.image as any).src ?? mod.image}
                  alt={mod.label}
                  className="mp-card-img"
                />
              </div>

              <div className="mp-card-body">
                <div className="mp-card-row">
                  <div className="mp-card-label">{mod.label}</div>
                  {mod.active
                    ? <div className="mp-badge-on"><div className="mp-dot" />Activo</div>
                    : <div className="mp-badge-off">Pronto</div>
                  }
                </div>
                <div
                  className="mp-card-tagline"
                  style={{ color: mod.active ? mod.accentFrom : "rgba(160,205,240,.2)" }}
                >
                  {mod.tagline}
                </div>
                <div className="mp-card-desc">{mod.description}</div>
                {mod.active && (
                  <div className="mp-card-cta" style={{ color: mod.accentFrom }}>
                    Entrar <span className="mp-cta-arrow">→</span>
                  </div>
                )}
              </div>

              <div className="mp-card-num" style={{ color: mod.accentFrom }}>{mod.number}</div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <footer className={`mp-footer ${mounted ? "in" : ""}`}>
          <div className="mp-footer-line" />
          <span className="mp-footer-txt">Turrinder · {new Date().getFullYear()}</span>
          <div className="mp-footer-line" />
        </footer>

      </div>
    </>
  );
}