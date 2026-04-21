"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/services/supabase.client";

const MODALIDADES = [
  {
    id: "ligues",
    label: "Ligues",
    number: "01",
    tagline: "Conocé gente nueva en tiempo real",
    description: "Video en vivo con personas al azar. Dale like si hay química, pasá si no. Simple.",
    href: "/modalidades/ligues",
    active: true,
    image: "/Images/ligues.png",
    accentFrom: "#54c7f8",
    accentTo: "#1a6fa8",
  },
  {
    id: "debate",
    label: "Debate",
    number: "02",
    tagline: "Creá salas y debatí con quien elijas",
    description: "Iniciá una sala privada o pública e invitá a personas específicas para debatir sobre cualquier tema.",
    href: "/modalidades/salas",
    active: true,
    image: "/Images/debates.png",
    accentFrom: "#f59e0b",
    accentTo: "#b45309",
  },
  {
    id: "amigos",
    label: "Amigos",
    number: "03",
    tagline: "Encontrá tu próximo mejor amigo",
    description: "Modo sin presión. Conocé gente con intereses en común sin el factor romántico.",
    href: "/modalidades/amigos",
    active: false,
    image: "/Images/ligues.png",
    accentFrom: "#34d399",
    accentTo: "#059669",
  },
  {
    id: "idiomas",
    label: "Idiomas",
    number: "04",
    tagline: "Practicá con nativos",
    description: "Conversaciones reales con hablantes nativos del idioma que estás aprendiendo.",
    href: "/modalidades/idiomas",
    active: false,
    image: "/Images/idiomas.png",
    accentFrom: "#a78bfa",
    accentTo: "#6d28d9",
  },
];

export default function ModalidadesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/");
    };
    checkUser();
    // Stagger mount for entrance animation
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .mp-root {
          --sky:        #54c7f8;
          --sky2:       #3b9eda;
          --sky3:       #1a6fa8;
          --white:      #f0f6ff;
          --bg:         #020810;
          --bg2:        #040d1a;
          --glass:      rgba(84,199,248,0.04);
          --glass-b:    rgba(84,199,248,0.10);
          --muted:      rgba(160,205,240,0.40);
          --muted2:     rgba(160,205,240,0.22);

          min-height: 100dvh;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          position: relative;
        }

        /* ── Ambient background ── */
        .mp-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .mp-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: mp-drift 25s ease-in-out infinite alternate;
        }
        .mp-bg-orb-1 {
          width: 600px; height: 600px;
          top: -200px; left: -150px;
          background: radial-gradient(circle, rgba(84,199,248,0.09) 0%, transparent 70%);
          animation-delay: 0s;
        }
        .mp-bg-orb-2 {
          width: 500px; height: 500px;
          bottom: -100px; right: -100px;
          background: radial-gradient(circle, rgba(59,158,218,0.07) 0%, transparent 70%);
          animation-delay: -8s;
        }
        .mp-bg-orb-3 {
          width: 300px; height: 300px;
          top: 40%; left: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(26,111,168,0.06) 0%, transparent 70%);
          animation-delay: -14s;
        }
        /* Subtle grid texture */
        .mp-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(84,199,248,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(84,199,248,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
        }
        @keyframes mp-drift {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(30px, -20px) scale(1.05); }
          66%  { transform: translate(-15px, 25px) scale(0.97); }
          100% { transform: translate(20px, -10px) scale(1.03); }
        }

        /* Top flag */
        .mp-flag {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg,
            var(--sky) 0%, var(--sky) 33%,
            rgba(240,246,255,0.8) 33%, rgba(240,246,255,0.8) 66%,
            var(--sky) 66%, var(--sky) 100%);
          z-index: 100;
          opacity: 0.6;
        }

        /* ── Layout ── */
        .mp-wrap {
          position: relative;
          z-index: 1;
          max-width: 480px;
          margin: 0 auto;
          padding: 0 20px calc(48px + env(safe-area-inset-bottom, 20px));
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .mp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 0 0;
          opacity: 0;
          transform: translateY(-12px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .mp-header.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .mp-logo {
          display: flex;
          align-items: baseline;
          gap: 0;
          user-select: none;
        }
        .mp-logo-t {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 900;
          color: var(--white);
          letter-spacing: -0.8px;
        }
        .mp-logo-inder {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.8px;
          background: linear-gradient(120deg, var(--sky) 0%, #b8eaff 50%, var(--sky2) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .mp-back {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(4,13,26,0.7);
          border: 1px solid var(--glass-b);
          backdrop-filter: blur(20px);
          border-radius: 100px;
          padding: 6px 14px;
          color: var(--muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: color 0.2s, background 0.2s, border-color 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .mp-back:hover {
          color: var(--sky);
          background: rgba(84,199,248,0.08);
          border-color: rgba(84,199,248,0.25);
        }

        /* ── Hero title ── */
        .mp-hero {
          padding: 40px 0 36px;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s;
        }
        .mp-hero.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .mp-hero-eyebrow {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--sky);
          margin-bottom: 10px;
          opacity: 0.8;
        }
        .mp-hero-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(32px, 8vw, 42px);
          font-weight: 900;
          color: var(--white);
          letter-spacing: -1.5px;
          line-height: 1.0;
          margin-bottom: 12px;
        }
        .mp-hero-title span {
          background: linear-gradient(120deg, var(--sky) 0%, #c8f0ff 50%, var(--sky2) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .mp-hero-sub {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.6;
          max-width: 300px;
        }

        /* ── Cards ── */
        .mp-cards {
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1;
        }

        .mp-card {
          position: relative;
          border-radius: 20px;
          border: 1px solid var(--glass-b);
          background: rgba(4,13,26,0.65);
          backdrop-filter: blur(16px);
          overflow: hidden;
          display: flex;
          align-items: stretch;
          min-height: 110px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          opacity: 0;
          transform: translateY(24px);
          transition:
            opacity 0.55s ease,
            transform 0.55s ease,
            border-color 0.3s ease,
            box-shadow 0.3s ease;
        }
        .mp-card.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .mp-card.inactive {
          opacity: 0;
          transform: translateY(24px);
          cursor: default;
        }
        .mp-card.inactive.visible {
          opacity: 0.38;
          transform: translateY(0);
        }
        .mp-card.active:hover {
          border-color: rgba(84,199,248,0.28);
          box-shadow:
            0 0 0 1px rgba(84,199,248,0.08),
            0 16px 48px rgba(0,0,0,0.4),
            0 4px 16px rgba(84,199,248,0.10);
          transform: translateY(-3px) scale(1.005);
        }
        .mp-card.active:active {
          transform: scale(0.98);
          transition-duration: 0.1s;
        }

        /* Accent left bar */
        .mp-card-bar {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          border-radius: 20px 0 0 20px;
          transition: width 0.3s ease;
        }
        .mp-card.active:hover .mp-card-bar {
          width: 4px;
        }

        /* Image section */
        .mp-card-img {
          width: 100px;
          min-width: 100px;
          position: relative;
          overflow: hidden;
          margin-left: 3px;
        }
        .mp-card-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          transition: transform 0.4s ease, filter 0.4s ease;
          filter: saturate(0.85) brightness(0.9);
        }
        .mp-card.active:hover .mp-card-img img {
          transform: scale(1.06);
          filter: saturate(1) brightness(1);
        }
        .mp-card.inactive .mp-card-img img {
          filter: saturate(0) brightness(0.6);
        }
        /* Image gradient overlay */
        .mp-card-img::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 60%, rgba(4,13,26,0.8) 100%);
        }

        /* Text section */
        .mp-card-body {
          flex: 1;
          padding: 18px 18px 18px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 4px;
        }
        .mp-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .mp-card-label {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 900;
          color: var(--white);
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .mp-card-number {
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: var(--muted2);
          letter-spacing: 1px;
          padding-top: 2px;
          flex-shrink: 0;
        }
        .mp-card-tagline {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2px;
          line-height: 1.4;
          opacity: 0.85;
        }
        .mp-card-desc {
          font-size: 10.5px;
          color: var(--muted);
          line-height: 1.55;
        }

        /* Status badges */
        .mp-badge-active {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(84,199,248,0.10);
          border: 1px solid rgba(84,199,248,0.25);
          border-radius: 100px;
          padding: 3px 9px;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(143,212,255,0.9);
          flex-shrink: 0;
        }
        .mp-badge-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--sky);
          box-shadow: 0 0 6px rgba(84,199,248,0.9);
          animation: mp-pulse 2s ease-in-out infinite;
        }
        @keyframes mp-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.3; transform:scale(0.8); }
        }
        .mp-badge-wip {
          display: inline-flex;
          align-items: center;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 100px;
          padding: 3px 9px;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(160,205,240,0.35);
          flex-shrink: 0;
        }

        /* Hover shimmer on active cards */
        .mp-card-shimmer {
          position: absolute;
          inset: 0;
          opacity: 0;
          background: linear-gradient(
            135deg,
            transparent 30%,
            rgba(84,199,248,0.04) 50%,
            transparent 70%
          );
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .mp-card.active:hover .mp-card-shimmer {
          opacity: 1;
        }

        /* ── Footer ── */
        .mp-footer {
          padding: 28px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.6s ease 0.8s;
        }
        .mp-footer.visible { opacity: 1; }
        .mp-footer-line {
          width: 24px; height: 1px;
          background: var(--glass-b);
        }
        .mp-footer-text {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--muted2);
        }
      `}</style>

      <div className="mp-root">
        {/* Ambient BG */}
        <div className="mp-bg">
          <div className="mp-bg-orb mp-bg-orb-1" />
          <div className="mp-bg-orb mp-bg-orb-2" />
          <div className="mp-bg-orb mp-bg-orb-3" />
          <div className="mp-bg-grid" />
        </div>

        <div className="mp-flag" />

        <div className="mp-wrap">
          {/* Header */}
          <header className={`mp-header ${mounted ? "visible" : ""}`}>
            <div className="mp-logo">
              <span className="mp-logo-t">Turr</span>
              <span className="mp-logo-inder">inder</span>
            </div>
            <button className="mp-back" onClick={() => router.back()}>
              ← Volver
            </button>
          </header>

          {/* Hero */}
          <div className={`mp-hero ${mounted ? "visible" : ""}`}>
            <div className="mp-hero-eyebrow">Elige tu modo</div>
            <h1 className="mp-hero-title">
              ¿Cómo querés<br /><span>conectar hoy?</span>
            </h1>
            <p className="mp-hero-sub">
              Cada modalidad es una experiencia diferente. Explorá, conocé, debatí.
            </p>
          </div>

          {/* Cards */}
          <div className="mp-cards">
            {MODALIDADES.map((mod, i) => (
              <div
                key={mod.id}
                className={`mp-card ${mod.active ? "active" : "inactive"} ${mounted ? "visible" : ""}`}
                style={{ transitionDelay: mounted ? `${0.15 + i * 0.1}s` : "0s" }}
                onClick={() => mod.active && router.push(mod.href)}
                onMouseEnter={() => mod.active && setHoveredId(mod.id)}
                onMouseLeave={() => setHoveredId(null)}
                role={mod.active ? "button" : undefined}
                tabIndex={mod.active ? 0 : undefined}
                onKeyDown={(e) => mod.active && e.key === "Enter" && router.push(mod.href)}
              >
                {/* Left accent bar */}
                <div
                  className="mp-card-bar"
                  style={{
                    background: `linear-gradient(180deg, ${mod.accentFrom}, ${mod.accentTo})`,
                    opacity: mod.active ? 1 : 0.3,
                  }}
                />

                {/* Shimmer effect */}
                <div className="mp-card-shimmer" />

                {/* Image */}
                <div className="mp-card-img">
                  <img src={mod.image} alt={mod.label} />
                </div>

                {/* Text */}
                <div className="mp-card-body">
                  <div className="mp-card-top">
                    <div className="mp-card-label">{mod.label}</div>
                    {mod.active ? (
                      <div className="mp-badge-active">
                        <div className="mp-badge-dot" />
                        Activo
                      </div>
                    ) : (
                      <div className="mp-badge-wip">Pronto</div>
                    )}
                  </div>

                  <div
                    className="mp-card-tagline"
                    style={{ color: mod.active ? mod.accentFrom : "rgba(160,205,240,0.3)" }}
                  >
                    {mod.tagline}
                  </div>

                  <div className="mp-card-desc">{mod.description}</div>
                </div>

                {/* Number */}
                <div
                  className="mp-card-number"
                  style={{
                    position: "absolute",
                    bottom: 14,
                    right: 16,
                    color: hoveredId === mod.id ? mod.accentFrom : undefined,
                    transition: "color 0.3s ease",
                    opacity: hoveredId === mod.id ? 0.6 : 0.2,
                  }}
                >
                  {mod.number}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className={`mp-footer ${mounted ? "visible" : ""}`}>
            <div className="mp-footer-line" />
            <span className="mp-footer-text">Turrinder · {new Date().getFullYear()}</span>
            <div className="mp-footer-line" />
          </div>
        </div>
      </div>
    </>
  );
}