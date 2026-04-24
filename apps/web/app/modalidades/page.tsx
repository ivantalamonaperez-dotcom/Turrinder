"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";

import img from "../../Images/logo.png";
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
    glowColor: "rgba(84,199,248,0.22)",
    emoji: "✦",
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
    glowColor: "rgba(245,158,11,0.22)",
    emoji: "◈",
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
    emoji: "◉",
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
    emoji: "⬡",
  },
];

function Logo() {
  return (
    <div className="logo-nav">
      <div className="logo-icon-wrap">
        <div className="logo-icon-bg" />
        <img src={(img as any).src ?? img} alt="Turrinder" className="logo-icon-img" />
      </div>
      <div className="logo-text-group">
        <span className="logo-wordmark">Turr<em>inder</em></span>
        <span className="logo-tagline">connect · debate · discover</span>
      </div>
    </div>
  );
}

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
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

        :root{
          --sky:#54c7f8;--sky2:#3b9eda;--sky3:#1a6fa8;
          --white-arg:#f5f8ff;
          --bg:#030a14;
          --glass:rgba(84,199,248,0.04);
          --glass-b:rgba(84,199,248,0.11);
          --text:rgba(240,248,255,0.88);
          --muted:rgba(180,215,240,0.42);
        }

        body::before{
          content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity:.25;
        }

        .mp{
          min-height:100vh;height:100vh;overflow:hidden;
          background:var(--bg);
          font-family:'DM Sans',sans-serif;
          -webkit-font-smoothing:antialiased;
          color:var(--text);
          display:flex;flex-direction:column;
          position:relative;
        }

        /* ── FLAG ── */
        .mp-flag{
          position:fixed;top:0;left:0;right:0;height:3px;z-index:200;
          background:linear-gradient(90deg,
            var(--sky) 0%,var(--sky) 33%,
            rgba(245,248,255,0.9) 33%,rgba(245,248,255,0.9) 66%,
            var(--sky) 66%,var(--sky) 100%);
          opacity:.7;
        }

        /* ── AURORA ── */
        .aurora{
          position:fixed;inset:0;z-index:0;pointer-events:none;
          background:
            radial-gradient(ellipse 75% 55% at 10% 15%,rgba(84,199,248,0.14) 0%,transparent 60%),
            radial-gradient(ellipse 55% 45% at 90% 80%,rgba(59,158,218,0.11) 0%,transparent 58%),
            radial-gradient(ellipse 40% 35% at 75% 10%,rgba(26,111,168,0.09) 0%,transparent 55%),
            radial-gradient(ellipse 50% 40% at 25% 92%,rgba(143,212,255,0.06) 0%,transparent 52%);
          animation:auroraAnim 22s ease-in-out infinite alternate;
        }
        @keyframes auroraAnim{
          0%{opacity:.7;transform:scale(1)}
          50%{opacity:1;transform:scale(1.05)}
          100%{opacity:.85;transform:scale(1.08)}
        }

        .grid-lines{
          position:fixed;inset:0;z-index:0;pointer-events:none;
          background-image:
            linear-gradient(rgba(84,199,248,0.02) 1px,transparent 1px),
            linear-gradient(90deg,rgba(84,199,248,0.02) 1px,transparent 1px);
          background-size:72px 72px;
          mask-image:radial-gradient(ellipse 90% 90% at 50% 50%,black 30%,transparent 100%);
        }

        /* ══ NAV ══ */
        .mp-nav{
          position:relative;z-index:100;flex-shrink:0;
          display:flex;align-items:center;justify-content:space-between;
          padding:20px 52px;
          border-bottom:1px solid var(--glass-b);
          background:rgba(3,10,20,0.65);
          backdrop-filter:blur(22px);
          opacity:0;transform:translateY(-14px);
          transition:opacity .5s ease,transform .5s ease;
          margin-top:3px;
        }
        .mp-nav.in{opacity:1;transform:translateY(0)}

        /* logo */
        .logo-nav{display:flex;align-items:center;gap:14px;cursor:pointer;user-select:none}
        .logo-icon-wrap{position:relative;width:44px;height:44px;flex-shrink:0}
        .logo-icon-bg{
          position:absolute;inset:0;border-radius:13px;
          background:linear-gradient(145deg,rgba(84,199,248,0.18),rgba(59,158,218,0.08));
          border:1px solid rgba(84,199,248,0.28);backdrop-filter:blur(8px);
          animation:iconHalo 3.5s ease-in-out infinite alternate;
        }
        @keyframes iconHalo{
          from{box-shadow:0 0 0 1px rgba(84,199,248,0.06),0 4px 16px rgba(84,199,248,0.15),inset 0 1px 0 rgba(255,255,255,0.1)}
          to  {box-shadow:0 0 0 1px rgba(84,199,248,0.14),0 6px 28px rgba(84,199,248,0.32),inset 0 1px 0 rgba(255,255,255,0.15)}
        }
        .logo-icon-img{
          position:absolute;inset:0;width:100%;height:100%;
          object-fit:contain;padding:6px;
          filter:drop-shadow(0 0 6px rgba(84,199,248,0.55)) brightness(1.08);
        }
        .logo-text-group{display:flex;flex-direction:column;gap:1px;line-height:1}
        .logo-wordmark{
          font-family:'Syne',sans-serif;font-size:20px;font-weight:800;
          letter-spacing:-0.8px;color:var(--white-arg);line-height:1;
        }
        .logo-wordmark em{
          font-style:normal;
          background:linear-gradient(120deg,var(--sky) 0%,#a8e6ff 55%,var(--sky2) 100%);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .logo-tagline{
          font-size:9px;font-weight:500;letter-spacing:2.8px;text-transform:uppercase;
          color:rgba(84,199,248,0.4);line-height:1;padding-left:1px;
        }

        .mp-back{
          display:flex;align-items:center;gap:6px;
          background:rgba(84,199,248,0.04);border:1px solid var(--glass-b);
          backdrop-filter:blur(20px);border-radius:100px;padding:9px 20px;
          color:rgba(160,205,240,.45);font-size:12px;font-weight:500;
          cursor:pointer;transition:color .2s,background .2s,border-color .2s,transform .2s;
          -webkit-tap-highlight-color:transparent;font-family:'DM Sans',sans-serif;
        }
        .mp-back:hover{
          color:var(--sky);background:rgba(84,199,248,.08);
          border-color:rgba(84,199,248,.28);transform:translateX(-2px);
        }

        /* ══ BODY = sidebar + cards ══ */
        .mp-body{
          position:relative;z-index:1;
          flex:1;min-height:0;
          display:grid;
          grid-template-columns:300px 1fr;
        }

        /* ── SIDEBAR ── */
        .mp-sidebar{
          border-right:1px solid var(--glass-b);
          padding:52px 44px 52px 52px;
          display:flex;flex-direction:column;justify-content:center;
          overflow:hidden;
        }

        .mp-hero-pill{
          display:inline-flex;align-items:center;gap:7px;
          background:rgba(84,199,248,0.07);border:1px solid rgba(84,199,248,0.18);
          border-radius:100px;padding:5px 14px;margin-bottom:20px;width:fit-content;
          font-size:10px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;
          color:rgba(143,212,255,0.85);
          opacity:0;transform:translateY(14px);
          transition:opacity .6s ease .1s,transform .6s ease .1s;
        }
        .mp-hero-pill.in{opacity:1;transform:translateY(0)}
        .mp-hero-pill-dot{
          width:5px;height:5px;border-radius:50%;background:var(--sky);
          box-shadow:0 0 6px rgba(84,199,248,0.8);
          animation:skyPulse 2.2s infinite;
        }
        @keyframes skyPulse{
          0%{box-shadow:0 0 0 0 rgba(84,199,248,0.6)}
          70%{box-shadow:0 0 0 8px rgba(84,199,248,0)}
          100%{box-shadow:0 0 0 0 rgba(84,199,248,0)}
        }

        .mp-hero-h1{
          font-family:'Syne',sans-serif;
          font-size:clamp(40px,3.5vw,62px);
          font-weight:900;color:var(--white-arg);
          letter-spacing:-3px;line-height:.93;
          margin-bottom:16px;
          opacity:0;transform:translateY(18px);
          transition:opacity .7s ease .18s,transform .7s ease .18s;
        }
        .mp-hero-h1.in{opacity:1;transform:translateY(0)}
        .mp-hero-h1 em{
          font-style:normal;
          background:linear-gradient(120deg,var(--sky) 0%,#c8f2ff 45%,var(--sky2) 100%);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }

        .mp-hero-sub{
          font-size:13px;color:var(--muted);line-height:1.75;
          opacity:0;transform:translateY(12px);
          transition:opacity .7s ease .28s,transform .7s ease .28s;
        }
        .mp-hero-sub.in{opacity:1;transform:translateY(0)}

        .mp-sidebar-stats{
          margin-top:32px;padding-top:24px;
          border-top:1px solid var(--glass-b);
          display:flex;flex-direction:column;gap:14px;
          opacity:0;transform:translateY(8px);
          transition:opacity .7s ease .4s,transform .7s ease .4s;
        }
        .mp-sidebar-stats.in{opacity:1;transform:translateY(0)}

        .mp-stat-row{display:flex;align-items:center;justify-content:space-between}
        .mp-stat-label{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(143,212,255,0.28)}
        .mp-stat-val{
          font-family:'Syne',sans-serif;font-size:14px;font-weight:800;
          background:linear-gradient(120deg,var(--sky),var(--sky2));
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .mp-active-count{display:flex;align-items:center;gap:8px;margin-top:2px}
        .dot-live{
          width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0;
          animation:livePulse 2s infinite;
        }
        @keyframes livePulse{
          0%{box-shadow:0 0 0 0 rgba(34,197,94,0.6)}
          70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}
          100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}
        }
        .mp-active-txt{font-size:11px;color:rgba(143,212,255,0.35)}
        .mp-active-txt strong{color:rgba(200,235,255,0.65);font-weight:600}

        /* ── CARDS AREA ── */
        .mp-cards-area{
          padding:36px 48px 36px 44px;
          display:flex;flex-direction:column;
          overflow-y:auto;
          gap:0;
        }

        /* 2×2 grid */
        .mp-grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          grid-template-rows:1fr 1fr;
          gap:14px;
          flex:1;
        }

        /* Card base */
        .mp-card{
          position:relative;
          border-radius:22px;
          border:1px solid rgba(84,199,248,.09);
          background:rgba(4,12,24,.82);
          backdrop-filter:blur(20px);
          overflow:hidden;
          display:flex;flex-direction:column;
          opacity:0;transform:translateY(26px) scale(.97);
          transition:
            opacity .6s ease,
            transform .6s ease,
            border-color .35s ease,
            box-shadow .35s ease;
          -webkit-tap-highlight-color:transparent;
          min-height:0;
        }
        .mp-card.in{opacity:1;transform:translateY(0) scale(1)}
        .mp-card.active{cursor:pointer}
        .mp-card.inactive.in{opacity:.26}

        .mp-card.active:hover{
          border-color:rgba(84,199,248,.3);
          box-shadow:
            0 0 0 1px rgba(84,199,248,.07),
            0 24px 64px rgba(0,0,0,.6),
            0 6px 24px var(--glow,rgba(84,199,248,.15));
          transform:translateY(-5px) scale(1.016);
        }
        .mp-card.active:active{transform:scale(.974);transition-duration:.1s}

        /* Accent bars */
        .mp-card-topbar{
          position:absolute;top:0;left:0;right:0;height:2px;
          border-radius:22px 22px 0 0;z-index:3;opacity:.9;
        }
        .mp-card-lbar{
          position:absolute;left:0;top:0;bottom:0;width:3px;
          border-radius:22px 0 0 22px;z-index:3;
          transition:width .3s ease;
        }
        .mp-card.active:hover .mp-card-lbar{width:5px}

        /* Inner glow */
        .mp-card-inner-glow{
          position:absolute;inset:0;pointer-events:none;z-index:0;border-radius:22px;
          background:radial-gradient(ellipse 80% 60% at 50% 0%,var(--glow,rgba(84,199,248,0.08)) 0%,transparent 65%);
          opacity:0;transition:opacity .4s ease;
        }
        .mp-card.active:hover .mp-card-inner-glow{opacity:1}

        /* Image */
        .mp-card-img-wrap{
          width:100%;flex-shrink:0;
          position:relative;overflow:hidden;
          height:160px;
        }
        .mp-card-img{
          width:100%;height:100%;padding:24px;
          object-fit:contain;object-position:center;
          filter:saturate(.82) brightness(.88);
          animation:levitate 5.5s ease-in-out infinite;
          transform-origin:center bottom;
          transition:filter .4s ease;
        }
        .mp-card:nth-child(1) .mp-card-img{animation-delay:0s}
        .mp-card:nth-child(2) .mp-card-img{animation-delay:-1.6s}
        .mp-card:nth-child(3) .mp-card-img{animation-delay:-0.8s}
        .mp-card:nth-child(4) .mp-card-img{animation-delay:-2.4s}
        @keyframes levitate{
          0%,100%{transform:translateY(0) scale(1)}
          45%    {transform:translateY(-10px) scale(1.025)}
          70%    {transform:translateY(-4px) scale(1.01)}
        }
        .mp-card.active:hover .mp-card-img{
          filter:saturate(1.1) brightness(1.05);
          animation-play-state:paused;
          transform:translateY(-14px) scale(1.08) !important;
        }
        .mp-card.inactive .mp-card-img{
          filter:saturate(0) brightness(.35);
          animation-play-state:paused;
        }
        .mp-card-img-wrap::after{
          content:'';position:absolute;inset:0;z-index:1;pointer-events:none;
          background:linear-gradient(to bottom,transparent 40%,rgba(4,12,24,.94) 100%);
        }

        /* Shimmer */
        .mp-shimmer{
          position:absolute;inset:0;pointer-events:none;z-index:5;border-radius:22px;
          background:linear-gradient(115deg,transparent 20%,rgba(255,255,255,.025) 45%,rgba(255,255,255,.06) 50%,rgba(255,255,255,.025) 55%,transparent 80%);
          transform:translateX(-120%);transition:none;
        }
        .mp-card.active:hover .mp-shimmer{transform:translateX(120%);transition:transform .75s ease}

        /* Body */
        .mp-card-body{
          flex:1;padding:14px 18px 18px;
          display:flex;flex-direction:column;gap:6px;
          position:relative;z-index:2;
        }
        .mp-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
        .mp-card-label{
          font-family:'Syne',sans-serif;font-size:22px;font-weight:900;
          color:var(--white-arg);letter-spacing:-.5px;line-height:1;
        }

        .mp-badge-on{
          display:inline-flex;align-items:center;gap:5px;
          background:rgba(84,199,248,.09);border:1px solid rgba(84,199,248,.24);
          border-radius:100px;padding:4px 10px;
          font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
          color:rgba(143,212,255,.9);flex-shrink:0;
          animation:badgeBreath 3s ease-in-out infinite;
        }
        @keyframes badgeBreath{0%,100%{box-shadow:none}50%{box-shadow:0 0 14px rgba(84,199,248,.25)}}
        .mp-dot{
          width:5px;height:5px;border-radius:50%;
          background:#54c7f8;box-shadow:0 0 6px rgba(84,199,248,.9);
          animation:dotP 2s ease-in-out infinite;
        }
        @keyframes dotP{0%,100%{opacity:1}50%{opacity:.2}}
        .mp-badge-off{
          display:inline-flex;
          background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
          border-radius:100px;padding:4px 10px;
          font-size:8px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;
          color:rgba(160,205,240,.22);flex-shrink:0;
        }

        .mp-card-tagline{font-size:12px;font-weight:500;line-height:1.45}
        .mp-card-desc{font-size:11.5px;color:rgba(160,205,240,.44);line-height:1.65}

        .mp-card-num{
          position:absolute;bottom:13px;right:15px;
          font-family:'Syne',sans-serif;font-size:11px;font-weight:800;
          letter-spacing:1px;opacity:.14;transition:opacity .3s;z-index:2;
        }
        .mp-card.active:hover .mp-card-num{opacity:.48}

        .mp-card-emoji{
          position:absolute;top:14px;right:14px;z-index:4;
          font-size:13px;opacity:.3;pointer-events:none;
          transition:opacity .3s,transform .3s;
        }
        .mp-card.active:hover .mp-card-emoji{opacity:.65;transform:scale(1.3) rotate(12deg)}

        /* ── FOOTER ── */
        .mp-footer{
          display:flex;align-items:center;justify-content:center;gap:10px;
          padding:20px 0 0;
          opacity:0;transition:opacity .6s ease 1s;
          flex-shrink:0;
        }
        .mp-footer.in{opacity:1}
        .mp-footer-line{width:32px;height:1px;background:rgba(84,199,248,.07)}
        .mp-footer-txt{font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(160,205,240,.16)}

        /* ── RESPONSIVE ── */
        @media(max-width:1100px){
          .mp-body{grid-template-columns:260px 1fr}
          .mp-sidebar{padding:44px 36px 44px 40px}
          .mp-cards-area{padding:28px 36px}
        }
        @media(max-width:800px){
          .mp{height:auto;overflow:visible}
          .mp-body{grid-template-columns:1fr;grid-template-rows:auto 1fr}
          .mp-sidebar{
            padding:36px 24px 28px;
            border-right:none;border-bottom:1px solid var(--glass-b);
          }
          .mp-cards-area{padding:24px 20px}
          .mp-nav{padding:18px 24px}
          .logo-tagline{display:none}
        }
        @media(max-width:560px){
          .mp-grid{grid-template-columns:1fr}
        }
      `}</style>

      <div className="mp">
        <div className="aurora" />
        <div className="grid-lines" />
        <div className="mp-flag" />

        {/* NAV */}
        <nav className={`mp-nav ${mounted ? "in" : ""}`}>
          <Logo />
          <button className="mp-back" onClick={() => router.back()}>← Volver</button>
        </nav>

        {/* BODY */}
        <div className="mp-body">

          {/* SIDEBAR */}
          <aside className="mp-sidebar">
            <div className={`mp-hero-pill ${mounted ? "in" : ""}`}>
              <div className="mp-hero-pill-dot" />
              Elegí tu modo
            </div>
            <h1 className={`mp-hero-h1 ${mounted ? "in" : ""}`}>
              Modal<em>idades</em>
            </h1>
            <p className={`mp-hero-sub ${mounted ? "in" : ""}`}>
              Cada modalidad es una experiencia diferente. Explorá, conocé, debatí.
            </p>
            <div className={`mp-sidebar-stats ${mounted ? "in" : ""}`}>
              <div className="mp-stat-row">
                <span className="mp-stat-label">Modalidades</span>
                <span className="mp-stat-val">4 modos</span>
              </div>
              <div className="mp-active-count">
                <div className="dot-live" />
                <span className="mp-active-txt"><strong>2</strong> activas ahora</span>
              </div>
            </div>
          </aside>

          {/* CARDS */}
          <div className="mp-cards-area">
            <div className="mp-grid">
              {MODALIDADES.map((mod, i) => (
                <div
                  key={mod.id}
                  className={`mp-card ${mod.active ? "active" : "inactive"} ${mounted ? "in" : ""}`}
                  style={{
                    transitionDelay: mounted ? `${0.18 + i * 0.1}s` : "0s",
                    // @ts-ignore
                    "--glow": mod.glowColor,
                  }}
                  onClick={() => mod.active && router.push(mod.href)}
                  role={mod.active ? "button" : undefined}
                  tabIndex={mod.active ? 0 : undefined}
                  onKeyDown={(e) => mod.active && e.key === "Enter" && router.push(mod.href)}
                >
                  <div className="mp-card-topbar"
                    style={{ background:`linear-gradient(90deg,${mod.accentFrom},${mod.accentTo})` }} />
                  <div className="mp-card-lbar"
                    style={{ background:`linear-gradient(180deg,${mod.accentFrom},${mod.accentTo})`, opacity:mod.active?1:.25 }} />
                  <div className="mp-card-inner-glow" />
                  <div className="mp-shimmer" />
                  <div className="mp-card-emoji" style={{ color:mod.accentFrom }}>{mod.emoji}</div>

                  <div className="mp-card-img-wrap">
                    <img
                      src={(mod.image as any).src ?? mod.image}
                      alt={mod.label}
                      className="mp-card-img"
                    />
                  </div>

                  <div className="mp-card-body">
                    <div className="mp-card-head">
                      <div className="mp-card-label">{mod.label}</div>
                      {mod.active
                        ? <div className="mp-badge-on"><div className="mp-dot" />Activo</div>
                        : <div className="mp-badge-off">Pronto</div>
                      }
                    </div>
                    <div className="mp-card-tagline"
                      style={{ color:mod.active ? mod.accentFrom : "rgba(160,205,240,.22)" }}>
                      {mod.tagline}
                    </div>
                    <div className="mp-card-desc">{mod.description}</div>
                  </div>

                  <div className="mp-card-num" style={{ color:mod.accentFrom }}>{mod.number}</div>
                </div>
              ))}
            </div>

            <div className={`mp-footer ${mounted ? "in" : ""}`}>
              <div className="mp-footer-line" />
              <span className="mp-footer-txt">Turrinder · {new Date().getFullYear()}</span>
              <div className="mp-footer-line" />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}