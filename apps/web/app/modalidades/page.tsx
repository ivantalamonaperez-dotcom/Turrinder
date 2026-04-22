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
    glowColor: "rgba(84,199,248,0.18)",
    floatDelay: "0s",
  },
  {
    id: "debate",
    label: "Debate",
    number: "02",
    tagline: "Creá salas y debatí con quien elijas",
    description: "Iniciá una sala privada o pública e invitá a personas para debatir sobre cualquier tema.",
    href: "/modalidades/salas",
    active: true,
    image: imgDebates,
    accentFrom: "#f59e0b",
    accentTo: "#b45309",
    glowColor: "rgba(245,158,11,0.18)",
    floatDelay: "-1.3s",
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
    glowColor: "rgba(52,211,153,0.15)",
    floatDelay: "-0.7s",
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
    glowColor: "rgba(167,139,250,0.15)",
    floatDelay: "-2s",
  },
];

export default function ModalidadesPage() {
  const router  = useRouter();
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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --sky:      #54c7f8;
          --sky2:     #3b9eda;
          --sky3:     #1a6fa8;
          --white:    #eef5ff;
          --bg:       #020810;
          --glass-b:  rgba(84,199,248,0.10);
          --muted:    rgba(160,205,240,0.45);
          --muted2:   rgba(160,205,240,0.20);
        }

        /* ── Root ── */
        .mp {
          min-height: 100dvh;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          position: relative;
        }

        /* ── Flag ── */
        .mp-flag {
          position: fixed; top:0; left:0; right:0; height:2px; z-index:100;
          background: linear-gradient(90deg,
            var(--sky) 0%, var(--sky) 33%,
            rgba(230,245,255,0.7) 33%, rgba(230,245,255,0.7) 66%,
            var(--sky) 66%, var(--sky) 100%);
          opacity: 0.55;
        }

        /* ── Ambient orbs ── */
        .mp-orbs {
          position: fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden;
        }
        .mp-orb {
          position: absolute; border-radius:50%; filter:blur(90px);
        }
        .mp-orb-1 {
          width:700px; height:500px; top:-180px; left:-200px;
          background: radial-gradient(ellipse, rgba(84,199,248,0.08) 0%, transparent 65%);
          animation: orbDrift1 28s ease-in-out infinite alternate;
        }
        .mp-orb-2 {
          width:500px; height:500px; bottom:-120px; right:-100px;
          background: radial-gradient(ellipse, rgba(59,158,218,0.07) 0%, transparent 65%);
          animation: orbDrift2 22s ease-in-out infinite alternate;
        }
        .mp-orb-3 {
          width:350px; height:350px; top:45%; left:55%;
          background: radial-gradient(ellipse, rgba(26,111,168,0.06) 0%, transparent 65%);
          animation: orbDrift3 18s ease-in-out infinite alternate;
        }
        @keyframes orbDrift1 {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(40px,-30px) scale(1.08); }
          100% { transform: translate(-20px,20px) scale(0.95); }
        }
        @keyframes orbDrift2 {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(-30px,20px) scale(1.06); }
          100% { transform: translate(25px,-15px) scale(0.97); }
        }
        @keyframes orbDrift3 {
          0%   { transform: translate(-50%,-50%) scale(1); }
          100% { transform: translate(-50%,-50%) scale(1.3) rotate(20deg); }
        }

        /* ── Layout ── */
        .mp-wrap {
          position: relative; z-index:1;
          max-width: 500px;
          margin: 0 auto;
          padding: 0 18px calc(56px + env(safe-area-inset-bottom,20px));
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .mp-header {
          display: flex; align-items:center; justify-content:space-between;
          padding: 24px 0 0;
          opacity: 0; transform: translateY(-14px);
          transition: opacity .55s ease, transform .55s ease;
        }
        .mp-header.in { opacity:1; transform:translateY(0); }

        .mp-logo { display:flex; align-items:baseline; user-select:none; }
        .mp-logo-t {
          font-family:'Syne',sans-serif; font-size:21px; font-weight:900;
          color:var(--white); letter-spacing:-0.8px;
        }
        .mp-logo-i {
          font-family:'Syne',sans-serif; font-size:21px; font-weight:900;
          letter-spacing:-0.8px;
          background:linear-gradient(120deg, var(--sky) 0%, #c4eeff 50%, var(--sky2) 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }

        .mp-back {
          display:flex; align-items:center; gap:5px;
          background:rgba(4,13,26,0.7); border:1px solid var(--glass-b);
          backdrop-filter:blur(20px); border-radius:100px; padding:7px 15px;
          color:var(--muted); font-family:'DM Sans',sans-serif;
          font-size:11px; font-weight:500; letter-spacing:0.3px;
          cursor:pointer; transition:color .2s, background .2s, border-color .2s;
          -webkit-tap-highlight-color:transparent;
        }
        .mp-back:hover {
          color:var(--sky); background:rgba(84,199,248,0.08);
          border-color:rgba(84,199,248,0.25);
        }

        /* ── Hero ── */
        .mp-hero {
          padding: 44px 0 40px;
          opacity:0; transform:translateY(18px);
          transition: opacity .65s ease .1s, transform .65s ease .1s;
        }
        .mp-hero.in { opacity:1; transform:translateY(0); }

        .mp-hero-eye {
          font-size:10px; font-weight:600; letter-spacing:3.5px;
          text-transform:uppercase; color:var(--sky); opacity:.75;
          margin-bottom:12px;
          animation: eyePulse 4s ease-in-out infinite;
        }
        @keyframes eyePulse {
          0%,100% { opacity:.75; } 50% { opacity:1; }
        }
        .mp-hero-h1 {
          font-family:'Syne',sans-serif;
          font-size: clamp(34px,9vw,46px);
          font-weight:900; color:var(--white);
          letter-spacing:-2px; line-height:1.0;
          margin-bottom:14px;
        }
        .mp-hero-h1 em {
          font-style:normal;
          background:linear-gradient(120deg, var(--sky) 0%, #c8f2ff 45%, var(--sky2) 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .mp-hero-sub {
          font-size:13px; color:var(--muted); line-height:1.65; max-width:280px;
        }

        /* ── Cards ── */
        .mp-cards { display:flex; flex-direction:column; gap:16px; }

        .mp-card {
          position:relative; border-radius:24px;
          border:1px solid var(--glass-b);
          background:rgba(4,12,24,0.72);
          backdrop-filter:blur(18px);
          overflow:hidden;
          display:flex; align-items:stretch;
          min-height:150px;
          opacity:0; transform:translateY(28px) scale(0.98);
          transition:
            opacity .6s ease,
            transform .6s ease,
            border-color .35s ease,
            box-shadow .35s ease;
          -webkit-tap-highlight-color:transparent;
        }
        .mp-card.in {
          opacity:1; transform:translateY(0) scale(1);
        }
        .mp-card.active { cursor:pointer; }
        .mp-card.inactive.in { opacity:.35; }

        .mp-card.active:hover {
          border-color:rgba(84,199,248,0.3);
          box-shadow:
            0 0 0 1px rgba(84,199,248,0.07),
            0 20px 60px rgba(0,0,0,0.5),
            0 6px 20px var(--card-glow, rgba(84,199,248,0.12));
          transform: translateY(-5px) scale(1.008);
        }
        .mp-card.active:active {
          transform: scale(0.975);
          transition-duration:.1s;
        }

        /* Gradient accent top border */
        .mp-card-topbar {
          position:absolute; top:0; left:0; right:0; height:2px;
          border-radius:24px 24px 0 0;
          opacity:.85;
        }

        /* Left glow column */
        .mp-card-lbar {
          position:absolute; left:0; top:0; bottom:0; width:3px;
          border-radius:24px 0 0 24px;
          transition:width .3s ease;
        }
        .mp-card.active:hover .mp-card-lbar { width:4px; }

        /* ── Image pane ── */
        .mp-card-img-wrap {
          width: 130px;
          min-width: 130px;
          position:relative; overflow:hidden;
          margin-left:3px;
          display:flex; align-items:center; justify-content:center;
        }
        /* Levitation animation on the img itself */
        .mp-card-img {
          width:100%; height:100%;
          object-fit:cover; object-position:center top;
          transition: filter .4s ease;
          filter: saturate(.85) brightness(.88);
          transform-origin: center bottom;
          animation: levitate 5s ease-in-out infinite;
        }
        .mp-card:nth-child(1) .mp-card-img { animation-delay: 0s; }
        .mp-card:nth-child(2) .mp-card-img { animation-delay: -1.4s; }
        .mp-card:nth-child(3) .mp-card-img { animation-delay: -0.7s; }
        .mp-card:nth-child(4) .mp-card-img { animation-delay: -2.1s; }

        @keyframes levitate {
          0%,100% { transform: translateY(0px) scale(1); }
          40%      { transform: translateY(-7px) scale(1.02); }
          70%      { transform: translateY(-3px) scale(1.01); }
        }

        .mp-card.active:hover .mp-card-img {
          filter: saturate(1.05) brightness(1);
          animation-play-state: paused;
          transform: translateY(-8px) scale(1.05) !important;
        }
        .mp-card.inactive .mp-card-img {
          filter: saturate(0) brightness(.55);
        }

        /* Gradient fade from image into card body */
        .mp-card-img-wrap::after {
          content:'';
          position:absolute; inset:0;
          background:linear-gradient(
            90deg,
            transparent 50%,
            rgba(4,12,24,0.85) 100%
          );
          pointer-events:none;
        }

        /* ── Body ── */
        .mp-card-body {
          flex:1; padding:20px 20px 20px 14px;
          display:flex; flex-direction:column; gap:6px;
          justify-content:center;
        }

        .mp-card-head {
          display:flex; align-items:flex-start; justify-content:space-between; gap:8px;
        }
        .mp-card-label {
          font-family:'Syne',sans-serif; font-size:22px; font-weight:900;
          color:var(--white); letter-spacing:-.5px; line-height:1;
        }

        /* Badges */
        .mp-badge-on {
          display:inline-flex; align-items:center; gap:5px;
          background:rgba(84,199,248,0.10); border:1px solid rgba(84,199,248,0.26);
          border-radius:100px; padding:3px 10px;
          font-size:8px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;
          color:rgba(143,212,255,.9); flex-shrink:0;
          animation: badgeGlow 3s ease-in-out infinite;
        }
        @keyframes badgeGlow {
          0%,100% { box-shadow:none; }
          50%      { box-shadow:0 0 10px rgba(84,199,248,0.2); }
        }
        .mp-badge-dot {
          width:5px; height:5px; border-radius:50%;
          background:var(--sky); box-shadow:0 0 6px rgba(84,199,248,.9);
          animation: dotPulse 2s ease-in-out infinite;
        }
        @keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }

        .mp-badge-off {
          display:inline-flex; align-items:center;
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
          border-radius:100px; padding:3px 10px;
          font-size:8px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase;
          color:rgba(160,205,240,.3); flex-shrink:0;
        }

        .mp-card-tag {
          font-size:11px; font-weight:500; letter-spacing:.2px; line-height:1.4;
          opacity:.9;
          transition: opacity .3s;
        }
        .mp-card.active:hover .mp-card-tag { opacity:1; }

        .mp-card-desc {
          font-size:11px; color:rgba(160,205,240,.5); line-height:1.6;
        }

        /* Corner number */
        .mp-card-num {
          position:absolute; bottom:14px; right:16px;
          font-family:'Syne',sans-serif; font-size:11px; font-weight:800;
          letter-spacing:1px; color:var(--muted2);
          transition: color .3s, opacity .3s;
          opacity:.25;
        }
        .mp-card.active:hover .mp-card-num { opacity:.55; }

        /* Shimmer sweep on hover */
        .mp-card-shimmer {
          position:absolute; inset:0; pointer-events:none;
          background:linear-gradient(
            110deg,
            transparent 25%,
            rgba(255,255,255,0.03) 45%,
            rgba(255,255,255,0.06) 50%,
            rgba(255,255,255,0.03) 55%,
            transparent 75%
          );
          transform: translateX(-100%);
          transition:none;
        }
        .mp-card.active:hover .mp-card-shimmer {
          transform: translateX(100%);
          transition: transform .6s ease;
        }

        /* ── Footer ── */
        .mp-footer {
          padding:32px 0 0;
          display:flex; align-items:center; justify-content:center; gap:10px;
          opacity:0; transition:opacity .6s ease .9s;
        }
        .mp-footer.in { opacity:1; }
        .mp-footer-line { width:28px; height:1px; background:var(--glass-b); }
        .mp-footer-txt {
          font-size:9px; letter-spacing:2.5px; text-transform:uppercase; color:var(--muted2);
        }
      `}</style>

      <div className="mp">
        {/* Ambient */}
        <div className="mp-orbs">
          <div className="mp-orb mp-orb-1" />
          <div className="mp-orb mp-orb-2" />
          <div className="mp-orb mp-orb-3" />
        </div>

        <div className="mp-flag" />

        <div className="mp-wrap">

          {/* Header */}
          <header className={`mp-header ${mounted ? "in" : ""}`}>
            <div className="mp-logo">
              <span className="mp-logo-t">Turr</span>
              <span className="mp-logo-i">inder</span>
            </div>
            <button className="mp-back" onClick={() => router.back()}>← Volver</button>
          </header>

          {/* Hero */}
          <div className={`mp-hero ${mounted ? "in" : ""}`}>
            <div className="mp-hero-eye">Elegí tu modo</div>
            <h1 className="mp-hero-h1">
              ¿Cómo querés<br /><em>conectar hoy?</em>
            </h1>
            <p className="mp-hero-sub">
              Cada modalidad es una experiencia diferente.<br />Explorá, conocé, debatí.
            </p>
          </div>

          {/* Cards */}
          <div className="mp-cards">
            {MODALIDADES.map((mod, i) => (
              <div
                key={mod.id}
                className={`mp-card ${mod.active ? "active" : "inactive"} ${mounted ? "in" : ""}`}
                style={{
                  transitionDelay: mounted ? `${0.18 + i * 0.11}s` : "0s",
                  // @ts-ignore
                  "--card-glow": mod.glowColor,
                }}
                onClick={() => mod.active && router.push(mod.href)}
                role={mod.active ? "button" : undefined}
                tabIndex={mod.active ? 0 : undefined}
                onKeyDown={(e) => mod.active && e.key === "Enter" && router.push(mod.href)}
              >
                {/* Top bar */}
                <div
                  className="mp-card-topbar"
                  style={{ background: `linear-gradient(90deg, ${mod.accentFrom}, ${mod.accentTo})` }}
                />
                {/* Left bar */}
                <div
                  className="mp-card-lbar"
                  style={{
                    background: `linear-gradient(180deg, ${mod.accentFrom}, ${mod.accentTo})`,
                    opacity: mod.active ? 1 : .3,
                  }}
                />

                {/* Shimmer */}
                <div className="mp-card-shimmer" />

                {/* Image */}
                <div className="mp-card-img-wrap">
                  <img
                    src={(mod.image as any).src ?? mod.image}
                    alt={mod.label}
                    className="mp-card-img"
                  />
                </div>

                {/* Body */}
                <div className="mp-card-body">
                  <div className="mp-card-head">
                    <div className="mp-card-label">{mod.label}</div>
                    {mod.active
                      ? <div className="mp-badge-on"><div className="mp-badge-dot"/>Activo</div>
                      : <div className="mp-badge-off">Pronto</div>
                    }
                  </div>
                  <div
                    className="mp-card-tag"
                    style={{ color: mod.active ? mod.accentFrom : "rgba(160,205,240,0.28)" }}
                  >
                    {mod.tagline}
                  </div>
                  <div className="mp-card-desc">{mod.description}</div>
                </div>

                {/* Number */}
                <div
                  className="mp-card-num"
                  style={{ color: mod.accentFrom }}
                >
                  {mod.number}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className={`mp-footer ${mounted ? "in" : ""}`}>
            <div className="mp-footer-line" />
            <span className="mp-footer-txt">Turrinder · {new Date().getFullYear()}</span>
            <div className="mp-footer-line" />
          </div>

        </div>
      </div>
    </>
  );
}