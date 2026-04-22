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
    glowColor: "rgba(84,199,248,0.22)",
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Clash+Display:wght@500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .mp {
          min-height: 100dvh;
          background: #020810;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          position: relative;
        }

        /* Flag */
        .mp-flag {
          position:fixed; top:0; left:0; right:0; height:2px; z-index:100;
          background:linear-gradient(90deg,
            #54c7f8 0%,#54c7f8 33%,
            rgba(230,245,255,0.65) 33%,rgba(230,245,255,0.65) 66%,
            #54c7f8 66%,#54c7f8 100%);
          opacity:.5;
        }

        /* Orbs */
        .mp-orbs { position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden; }
        .mp-orb   { position:absolute;border-radius:50%;filter:blur(110px); }
        .mp-orb-1 {
          width:900px;height:700px;top:-250px;left:-250px;
          background:radial-gradient(ellipse,rgba(84,199,248,0.09) 0%,transparent 65%);
          animation:oA 30s ease-in-out infinite alternate;
        }
        .mp-orb-2 {
          width:700px;height:700px;bottom:-200px;right:-200px;
          background:radial-gradient(ellipse,rgba(59,158,218,0.07) 0%,transparent 65%);
          animation:oB 24s ease-in-out infinite alternate;
        }
        @keyframes oA{0%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-50px) scale(1.1)}100%{transform:translate(-30px,30px) scale(.95)}}
        @keyframes oB{0%{transform:translate(0,0)}100%{transform:translate(-50px,-60px) scale(1.1)}}

        /* Layout */
        .mp-page {
          position:relative;z-index:1;
          width:100%;
          padding:0 20px calc(56px + env(safe-area-inset-bottom,20px));
        }

        /* Header */
        .mp-header {
          display:flex;align-items:center;justify-content:space-between;
          padding:24px 0 0;
          opacity:0;transform:translateY(-14px);
          transition:opacity .5s ease,transform .5s ease;
        }
        .mp-header.in{opacity:1;transform:translateY(0);}
        .mp-logo{display:flex;align-items:baseline;user-select:none;}
        .mp-logo-t{font-family:'Syne',sans-serif;font-size:22px;font-weight:900;color:#eef5ff;letter-spacing:-.8px;}
        .mp-logo-i{
          font-family:'Syne',sans-serif;font-size:22px;font-weight:900;letter-spacing:-.8px;
          background:linear-gradient(120deg,#54c7f8 0%,#c4eeff 50%,#3b9eda 100%);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .mp-back {
          display:flex;align-items:center;gap:5px;
          background:rgba(4,13,26,.7);border:1px solid rgba(84,199,248,.12);
          backdrop-filter:blur(20px);border-radius:100px;padding:7px 16px;
          color:rgba(160,205,240,.45);font-size:11px;font-weight:500;
          cursor:pointer;transition:color .2s,background .2s,border-color .2s;
          -webkit-tap-highlight-color:transparent;
        }
        .mp-back:hover{color:#54c7f8;background:rgba(84,199,248,.08);border-color:rgba(84,199,248,.28);}

        /* Hero */
        .mp-hero {
          padding:40px 0 36px;
          opacity:0;transform:translateY(16px);
          transition:opacity .65s ease .1s,transform .65s ease .1s;
        }
        .mp-hero.in{opacity:1;transform:translateY(0);}
        .mp-hero-eye{
          font-size:10px;font-weight:600;letter-spacing:3.5px;text-transform:uppercase;
          color:#54c7f8;opacity:.75;margin-bottom:12px;
          animation:eyePulse 4s ease-in-out infinite;
        }
        @keyframes eyePulse{0%,100%{opacity:.7}50%{opacity:1}}
        .mp-hero-h1{
          font-family: sans-serif;
          font-size:clamp(36px,1vw,56px);
          font-weight:900;color:#eef5ff;letter-spacing:-2px;line-height:1.0;margin-bottom:14px;
        }
        .mp-hero-h1 em{
          font-style:normal;
          background:linear-gradient(120deg,#54c7f8 0%,#c8f2ff 45%,#3b9eda 100%);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .mp-hero-sub{font-size:14px;color:rgba(160,205,240,.45);line-height:1.65;}

        /* ── Bento grid — CSS columns for true masonry flow ── */
        .mp-bento {
          column-count: 2;
          column-gap: 14px;
          width: 100%;
        }

        /* Card base */
        .mp-card {
          position:relative;
          break-inside: avoid;
          display: inline-flex;
          width: 100%;
          margin-bottom: 14px;
          
          border-radius:22px;
          border:1px solid rgba(84,199,248,.10);
          background:rgba(4,12,24,.75);
          backdrop-filter:blur(18px);
          overflow:hidden;
          flex-direction:column;
          opacity:0;transform:translateY(28px) scale(.98);
          transition:
            opacity .6s ease,
            transform .6s ease,
            border-color .3s ease,
            box-shadow .3s ease;
          -webkit-tap-highlight-color:transparent;
        }
        .mp-card.in{opacity:1;transform:translateY(0) scale(1);}
        .mp-card.active{cursor:pointer;}
        .mp-card.inactive.in{opacity:.32;}

        .mp-card.active:hover{
          border-color:rgba(84,199,248,.28);
          box-shadow:
            0 0 0 1px rgba(84,199,248,.06),
            0 24px 64px rgba(0,0,0,.55),
            0 6px 24px var(--glow,rgba(84,199,248,.14));
          transform:translateY(-5px) scale(1.012);
        }
        .mp-card.active:active{transform:scale(.975);transition-duration:.1s;}

        /* Size variants */
        .mp-card-tall   { min-height: 420px; }
        .mp-card-medium { min-height: 340px; }

        /* Accent bars */
        .mp-card-topbar{
          position:absolute;top:0;left:0;right:0;height:2px;border-radius:22px 22px 0 0;z-index:2;
        }
        .mp-card-lbar{
          position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:22px 0 0 22px;z-index:2;
          transition:width .3s ease;
        }
        .mp-card.active:hover .mp-card-lbar{width:5px;}

        /* Image pane — top section of the card */
        .mp-card-img-wrap{
          width:100%;
          flex-shrink:0;
          position:relative;
          overflow:hidden;
        }
        .mp-card-tall   .mp-card-img-wrap { height: 230px; }
        .mp-card-medium .mp-card-img-wrap { height: 170px; }

        .mp-card-img{
          width:100%; height:100%;
          padding: 36px;
          object-fit: contain;         /* <-- CAMBIO: de 'cover' a 'contain' */
          object-position: center;     /* <-- CAMBIO: centrado en lugar de 'center top' */
          filter:saturate(.82) brightness(.88);
          animation:levitate 5.5s ease-in-out infinite;
          transform-origin:center bottom;
          transition:filter .4s ease;
        }
        /* staggered levitation per card */
        .mp-card:nth-child(1) .mp-card-img{animation-delay:0s;}
        .mp-card:nth-child(2) .mp-card-img{animation-delay:-1.6s;}
        .mp-card:nth-child(3) .mp-card-img{animation-delay:-0.8s;}
        .mp-card:nth-child(4) .mp-card-img{animation-delay:-2.4s;}

        @keyframes levitate{
          0%,100%{transform:translateY(0) scale(1);}
          45%    {transform:translateY(-10px) scale(1.025);}
          70%    {transform:translateY(-4px)  scale(1.01);}
        }
        .mp-card.active:hover .mp-card-img{
          filter:saturate(1.08) brightness(1.02);
          animation-play-state:paused;
          transform:translateY(-12px) scale(1.06) !important;
        }
        .mp-card.inactive .mp-card-img{
          filter:saturate(0) brightness(.45);
          animation-play-state:paused;
        }

        /* Bottom gradient on image */
        .mp-card-img-wrap::after{
          content:'';position:absolute;inset:0;
          background:linear-gradient(to bottom,transparent 50%,rgba(4,12,24,.92) 100%);
          pointer-events:none;
        }

        /* Body — below image */
        .mp-card-body{
          flex:1;
          padding:16px 18px 20px;
          display:flex;flex-direction:column;gap:8px;
        }

        .mp-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
        .mp-card-label{
          font-family:'Syne',sans-serif;font-size:24px;font-weight:900;
          color:#eef5ff;letter-spacing:-.5px;line-height:1;
        }

        /* Badges */
        .mp-badge-on{
          display:inline-flex;align-items:center;gap:5px;
          background:rgba(84,199,248,.10);border:1px solid rgba(84,199,248,.26);
          border-radius:100px;padding:4px 11px;
          font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
          color:rgba(143,212,255,.9);flex-shrink:0;
          animation:badgeBreath 3s ease-in-out infinite;
        }
        @keyframes badgeBreath{0%,100%{box-shadow:none}50%{box-shadow:0 0 12px rgba(84,199,248,.25)}}
        .mp-dot{
          width:5px;height:5px;border-radius:50%;
          background:#54c7f8;box-shadow:0 0 6px rgba(84,199,248,.9);
          animation:dotP 2s ease-in-out infinite;
        }
        @keyframes dotP{0%,100%{opacity:1}50%{opacity:.25}}

        .mp-badge-off{
          display:inline-flex;
          background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
          border-radius:100px;padding:4px 11px;
          font-size:8px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;
          color:rgba(160,205,240,.28);flex-shrink:0;
        }

        .mp-card-tagline{
          font-size:12px;font-weight:500;line-height:1.45;opacity:.9;
        }
        .mp-card-desc{
          font-size:11.5px;color:rgba(160,205,240,.48);line-height:1.65;
        }

        /* Corner number */
        .mp-card-num{
          position:absolute;bottom:14px;right:16px;
          font-family:'Syne',sans-serif;font-size:11px;font-weight:800;
          letter-spacing:1px;opacity:.18;
          transition:opacity .3s,color .3s;
        }
        .mp-card.active:hover .mp-card-num{opacity:.5;}

        /* Shimmer */
        .mp-shimmer{
          position:absolute;inset:0;pointer-events:none;z-index:1;
          background:linear-gradient(
            115deg,
            transparent 20%,
            rgba(255,255,255,.03) 45%,
            rgba(255,255,255,.065) 50%,
            rgba(255,255,255,.03) 55%,
            transparent 80%
          );
          transform:translateX(-120%);transition:none;
        }
        .mp-card.active:hover .mp-shimmer{
          transform:translateX(120%);
          transition:transform .7s ease;
        }

        /* Footer */
        .mp-footer{
          padding:36px 0 0;
          display:flex;align-items:center;justify-content:center;gap:10px;
          opacity:0;transition:opacity .6s ease 1s;
        }
        .mp-footer.in{opacity:1;}
        .mp-footer-line{width:32px;height:1px;background:rgba(84,199,248,.10);}
        .mp-footer-txt{font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(160,205,240,.2);}
      `}</style>

      <div className="mp">
        <div className="mp-orbs">
          <div className="mp-orb mp-orb-1" />
          <div className="mp-orb mp-orb-2" />
        </div>
        <div className="mp-flag" />

        <div className="mp-page">

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
              Modalidades
            </h1>
            <p className="mp-hero-sub">
              Cada modalidad es una experiencia diferente. Explorá, conocé, debatí.
            </p>
          </div>

          {/* Bento grid */}
          <div className="mp-bento">
            {MODALIDADES.map((mod, i) => {
              // Alternating sizes: 0=tall, 1=medium, 2=medium, 3=tall
              const sizeClass = i === 0 || i === 3 ? "mp-card-tall" : "mp-card-medium";
              return (
                <div
                  key={mod.id}
                  className={`mp-card ${sizeClass} ${mod.active ? "active" : "inactive"} ${mounted ? "in" : ""}`}
                  style={{
                    transitionDelay: mounted ? `${0.18 + i * 0.11}s` : "0s",
                    // @ts-ignore
                    "--glow": mod.glowColor,
                  }}
                  onClick={() => mod.active && router.push(mod.href)}
                  role={mod.active ? "button" : undefined}
                  tabIndex={mod.active ? 0 : undefined}
                  onKeyDown={(e) => mod.active && e.key === "Enter" && router.push(mod.href)}
                >
                  <div className="mp-card-topbar"
                    style={{ background: `linear-gradient(90deg,${mod.accentFrom},${mod.accentTo})` }} />
                  <div className="mp-card-lbar"
                    style={{
                      background: `linear-gradient(180deg,${mod.accentFrom},${mod.accentTo})`,
                      opacity: mod.active ? 1 : .3,
                    }} />

                  <div className="mp-shimmer" />

                  {/* Image on top */}
                  <div className="mp-card-img-wrap">
                    <img
                      src={(mod.image as any).src ?? mod.image}
                      alt={mod.label}
                      className="mp-card-img"
                    />
                  </div>

                  {/* Text below image */}
                  <div className="mp-card-body">
                    <div className="mp-card-head">
                      <div className="mp-card-label">{mod.label}</div>
                      {mod.active
                        ? <div className="mp-badge-on"><div className="mp-dot" />Activo</div>
                        : <div className="mp-badge-off">Pronto</div>
                      }
                    </div>
                    <div className="mp-card-tagline"
                      style={{ color: mod.active ? mod.accentFrom : "rgba(160,205,240,.25)" }}>
                      {mod.tagline}
                    </div>
                    <div className="mp-card-desc">{mod.description}</div>
                  </div>

                  <div className="mp-card-num" style={{ color: mod.accentFrom }}>
                    {mod.number}
                  </div>
                </div>
              );
            })}
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