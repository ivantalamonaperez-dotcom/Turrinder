"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/services/supabase.client";

// ─── Definición de modalidades ─────────────────────────────────────────────
// Cuando tengas una nueva modalidad lista, movela de "coming" a "active"
// y dale su href.
const MODALIDADES = [
  {
    id: "ligues",
    label: "Ligues",
    emoji: "🔥",
    tagline: "Conocé gente nueva en tiempo real",
    description:
      "Video en vivo con personas al azar. Dale like si hay química, pasá si no. Simple.",
    href: "/modalidades/ligues",
    active: true,
    accentFrom: "#54c7f8",
    accentTo: "#1a6fa8",
  },
  {
    id: "amigos",
    label: "Amigos",
    emoji: "👋",
    tagline: "Encontrá tu próximo mejor amigo",
    description: "Modo sin presión. Conocé gente con intereses en común sin el factor romántico.",
    href: "/modalidades/amigos",
    active: false,
    accentFrom: "#34d399",
    accentTo: "#059669",
  },
  {
    id: "debate",
    label: "Debate",
    emoji: "🎙️",
    tagline: "Discutí de lo que sea",
    description: "Te matcheamos con alguien de opinión contraria. El diálogo empieza solo.",
    href: "/modalidades/debate",
    active: false,
    accentFrom: "#f59e0b",
    accentTo: "#b45309",
  },
  {
    id: "idiomas",
    label: "Idiomas",
    emoji: "🌍",
    tagline: "Practicá con nativos",
    description: "Conversaciones reales con hablantes nativos del idioma que estás aprendiendo.",
    href: "/modalidades/idiomas",
    active: false,
    accentFrom: "#a78bfa",
    accentTo: "#6d28d9",
  },
];

export default function ModalidadesPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/");
    };
    checkUser();
  }, [router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        .mod-root {
          --sky:      #54c7f8;
          --sky2:     #3b9eda;
          --sky3:     #1a6fa8;
          --white-arg:#f5f8ff;
          --bg:       #030a14;
          --glass-b:  rgba(84,199,248,0.12);
          --muted:    rgba(180,215,240,0.45);
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          overflow: hidden;
          position: relative;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Aurora */
        .mod-aurora {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 70% 45% at 15% 0%,   rgba(84,199,248,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 50% 35% at 85% 100%,  rgba(59,158,218,0.10) 0%, transparent 58%);
          animation: mod-aur 18s ease-in-out infinite alternate;
        }
        @keyframes mod-aur {
          0%   { opacity:.7; transform:scale(1); }
          100% { opacity:.9; transform:scale(1.05); }
        }

        /* Flag stripe */
        .mod-flag {
          position: absolute; top:0; left:0; right:0; height:3px;
          background: linear-gradient(90deg,
            var(--sky) 0%, var(--sky) 33%,
            rgba(245,248,255,0.85) 33%, rgba(245,248,255,0.85) 66%,
            var(--sky) 66%, var(--sky) 100%);
          z-index: 60; opacity:0.65;
        }

        /* Header */
        .mod-header {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 20px 0;
        }
        .mod-logo-wrap { display:flex; align-items:baseline; user-select:none; }
        .mod-logo-t {
          font-family:'Syne',sans-serif; font-size:19px; font-weight:900;
          letter-spacing:-0.8px; color:var(--white-arg); line-height:1;
        }
        .mod-logo-inder {
          font-family:'Syne',sans-serif; font-size:19px; font-weight:900;
          letter-spacing:-0.8px; line-height:1;
          background:linear-gradient(120deg, var(--sky) 0%, #a8e6ff 55%, var(--sky2) 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }

        /* Back button */
        .mod-back {
          display:flex; align-items:center; gap:6px;
          background:rgba(3,10,20,0.58); border:1px solid var(--glass-b);
          backdrop-filter:blur(16px); border-radius:100px; padding:6px 14px;
          color:var(--muted); font-size:11px; font-weight:500; letter-spacing:0.5px;
          cursor:pointer; border:none; transition:color 0.2s, background 0.2s;
          -webkit-tap-highlight-color:transparent;
        }
        .mod-back:hover { color:var(--sky); background:rgba(84,199,248,0.08); }

        /* Scroll area */
        .mod-scroll {
          flex:1; overflow-y:auto; position:relative; z-index:1;
          padding: 24px 16px calc(32px + env(safe-area-inset-bottom, 20px));
          display:flex; flex-direction:column; gap:0;
        }
        .mod-scroll::-webkit-scrollbar { display:none; }

        /* Section title */
        .mod-title {
          font-family:'Syne',sans-serif; font-size:26px; font-weight:900;
          color:var(--white-arg); letter-spacing:-0.5px; margin-bottom:4px;
        }
        .mod-subtitle {
          font-size:13px; color:var(--muted); margin-bottom:28px; line-height:1.5;
        }

        /* Grid */
        .mod-grid {
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:12px;
        }
        @media (min-width:480px) {
          .mod-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* Card */
        .mod-card {
          position:relative; border-radius:20px; overflow:hidden;
          border:1px solid var(--glass-b);
          background:rgba(5,15,30,0.7);
          backdrop-filter:blur(12px);
          padding:20px 16px 18px;
          display:flex; flex-direction:column; gap:8px;
          transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.22s ease, border-color 0.22s ease;
          -webkit-tap-highlight-color:transparent;
          min-height:160px;
        }
        .mod-card.active {
          cursor:pointer;
        }
        .mod-card.active:hover {
          transform:translateY(-4px) scale(1.02);
          border-color:rgba(84,199,248,0.32);
          box-shadow:0 12px 40px rgba(84,199,248,0.18);
        }
        .mod-card.active:active {
          transform:scale(0.97);
        }
        .mod-card.inactive {
          opacity:0.52;
          cursor:not-allowed;
        }

        /* Card glow top strip */
        .mod-card-strip {
          position:absolute; top:0; left:0; right:0; height:2px;
          border-radius:20px 20px 0 0;
        }

        /* Card inner */
        .mod-card-emoji {
          font-size:28px; line-height:1; margin-bottom:2px;
        }
        .mod-card-label {
          font-family:'Syne',sans-serif; font-size:17px; font-weight:900;
          color:var(--white-arg); letter-spacing:-0.3px; line-height:1.1;
        }
        .mod-card-tagline {
          font-size:10px; font-weight:500; letter-spacing:0.8px;
          text-transform:uppercase;
          margin-top:auto;
        }
        .mod-card-desc {
          font-size:11px; color:rgba(180,215,240,0.55); line-height:1.5;
        }

        /* WIP badge */
        .mod-wip {
          position:absolute; top:12px; right:12px;
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:100px; padding:2px 8px;
          font-size:8px; font-weight:600; letter-spacing:1.5px;
          text-transform:uppercase; color:rgba(180,215,240,0.4);
        }

        /* Active indicator */
        .mod-active-badge {
          position:absolute; top:12px; right:12px;
          display:flex; align-items:center; gap:5px;
          background:rgba(84,199,248,0.10);
          border:1px solid rgba(84,199,248,0.28);
          border-radius:100px; padding:3px 9px;
          font-size:8px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;
          color:rgba(143,212,255,0.9);
        }
        .mod-active-dot {
          width:5px; height:5px; border-radius:50%;
          background:var(--sky); box-shadow:0 0 5px var(--sky);
          animation:modDotPulse 2s infinite;
        }
        @keyframes modDotPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div className="mod-root">
        <div className="mod-aurora" />
        <div className="mod-flag" />

        {/* Header */}
        <header className="mod-header">
          <div className="mod-logo-wrap">
            <span className="mod-logo-t">Turr</span>
            <span className="mod-logo-inder">inder</span>
          </div>
          <button className="mod-back" onClick={() => router.back()}>
            ← Volver
          </button>
        </header>

        {/* Content */}
        <div className="mod-scroll">
          <div className="mod-title">Modalidades</div>
          <div className="mod-subtitle">
            Elegí cómo querés conectar hoy.
          </div>

          <div className="mod-grid">
            {MODALIDADES.map((mod) => (
              <div
                key={mod.id}
                className={`mod-card ${mod.active ? "active" : "inactive"}`}
                onClick={() => mod.active && router.push(mod.href)}
                role={mod.active ? "button" : undefined}
                tabIndex={mod.active ? 0 : undefined}
                onKeyDown={(e) => mod.active && e.key === "Enter" && router.push(mod.href)}
              >
                {/* Top accent strip */}
                <div
                  className="mod-card-strip"
                  style={{
                    background: `linear-gradient(90deg, ${mod.accentFrom}, ${mod.accentTo})`,
                    opacity: mod.active ? 0.9 : 0.3,
                  }}
                />

                {/* Badge */}
                {mod.active ? (
                  <div className="mod-active-badge">
                    <div className="mod-active-dot" /> Activo
                  </div>
                ) : (
                  <div className="mod-wip">En desarrollo</div>
                )}

                <div className="mod-card-emoji">{mod.emoji}</div>
                <div className="mod-card-label">{mod.label}</div>
                <div
                  className="mod-card-tagline"
                  style={{ color: mod.accentFrom }}
                >
                  {mod.tagline}
                </div>
                <div className="mod-card-desc">{mod.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}