"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
    description: "Video en vivo con personas al azar. Dale like si hay química, pasá si no. Simple y directo al grano.",
    href: "/modalidades/ligues",
    active: true,
    image: imgLigues,
    accentFrom: "#54c7f8",
    accentTo: "#1a6fa8",
    span: "col-span-2",
  },
  {
    id: "debate",
    label: "Debate",
    number: "02",
    tagline: "Creá salas y debatí con quien elijas",
    description: "Iniciá una sala e invitá a personas para debatir sobre cualquier tema.",
    href: "/modalidades/salas",
    active: true,
    image: imgDebates,
    accentFrom: "#f59e0b",
    accentTo: "#b45309",
    span: "col-span-1",
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
    span: "col-span-1",
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
    span: "col-span-2",
  },
];

export default function ModalidadesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/");
    };
    checkUser();
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [router]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          /* Variables de color de fondo estilo Perfil */
          --bg: #030a14;
          --bg2: #060f1e;
          --sky-glow: rgba(84,199,248,0.12); /* Celeste superior */
          --sky-dim: rgba(59,158,218,0.08);  /* Celeste inferior */
          
          /* Variables de las tarjetas */
          --surface: rgba(84,199,248,0.04);
          --surface-hover: rgba(84,199,248,0.07);
          --border: rgba(84,199,248,0.12);
          --border-hover: rgba(84,199,248,0.25);
          --text-main: #f0f6ff;
          --text-muted: rgba(180,215,240,0.45);
        }

        html, body {
          min-height: 100vh;
          background: var(--bg);
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
          color: var(--text-main);
          cursor: none;
        }

        /* ─── CURSOR PERSONALIZADO ─── */
        .custom-cursor {
          position: fixed;
          width: 10px; height: 10px;
          background: white;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
          transition: width 0.2s, height 0.2s, background 0.2s, opacity 0.2s;
          mix-blend-mode: difference;
        }

        /* ─── FONDO ESTÁTICO CELESTE (Estilo Perfil) ─── */
        .bg-celeste {
          position: fixed; 
          inset: 0; 
          z-index: 0; 
          pointer-events: none;
          background-color: var(--bg);
          background-image: 
            /* Brillo celeste desde arriba (centro) */
            radial-gradient(ellipse 80% 50% at 50% -10%, var(--sky-glow) 0%, transparent 80%),
            /* Brillo celeste secundario desde abajo a la derecha */
            radial-gradient(ellipse 60% 60% at 100% 100%, var(--sky-dim) 0%, transparent 70%);
        }



        /* ─── LAYOUT ─── */
        .page-container {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          align-items: flex-start;
          padding: 72px 48px 60px;
          min-height: 100vh;
          max-width: 1440px;
          margin: 0 auto;
          width: 100%;
        }

        /* ─── HEADER ─── */
        .header {
          margin-bottom: 52px;
          text-align: left;
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1),
                      transform 0.9s cubic-bezier(0.16,1,0.3,1);
        }
        .header.in { opacity: 1; transform: translateY(0); }

        .header-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 12px; font-weight: 600; letter-spacing: 2px;
          text-transform: uppercase; color: var(--text-muted);
          margin-bottom: 16px;
        }
        .header-eyebrow::before {
          content: '';
          display: block; width: 28px; height: 1px;
          background: var(--text-muted);
        }

        .title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(52px, 7vw, 96px);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 0.95;
          margin-bottom: 20px;
        }
        .title-word {
          display: inline-block;
          opacity: 0; transform: translateY(40px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1),
                      transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .title-word.in { opacity: 1; transform: translateY(0); }
        .title-word:nth-child(2) { transition-delay: 0.1s; }
        .title-accent {
          background: linear-gradient(110deg, #54c7f8 0%, #a78bfa 60%, #fcfcfc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          font-size: 17px;
          color: var(--text-muted);
          max-width: 480px;
          line-height: 1.6;
          opacity: 0; transform: translateY(16px);
          transition: opacity 0.8s 0.25s cubic-bezier(0.16,1,0.3,1),
                      transform 0.8s 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .subtitle.in { opacity: 1; transform: translateY(0); }

        /* ─── GRID BENTO ─── */
        .bento-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: auto auto;
          gap: 20px;
        }

        /* ─── TARJETA ─── */
        .card {
          position: relative;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 40px 44px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
          cursor: none;
          min-height: 360px;

          opacity: 0; transform: translateY(40px) scale(0.97);
          transition:
            opacity 0.7s cubic-bezier(0.16,1,0.3,1),
            transform 0.7s cubic-bezier(0.16,1,0.3,1),
            border-color 0.35s ease,
            background 0.35s ease,
            box-shadow 0.35s ease;
        }
        .card.in { opacity: 1; transform: translateY(0) scale(1); }

        .card.inactive {
          cursor: not-allowed;
          filter: saturate(0) brightness(0.55);
        }

        .card:not(.inactive):hover {
          border-color: var(--border-hover);
          background: var(--surface-hover);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.06) inset,
            0 30px 60px -20px rgba(0,0,0,0.6),
            0 0 80px -20px var(--card-accent-color, rgba(84,199,248,0.12));
          transform: translateY(-6px) scale(1.005);
        }

        /* Layout especial para tarjeta 1 (2 columnas) */
        .card-wide {
          grid-column: span 2;
          min-height: 400px;
          flex-direction: column;
          justify-content: flex-end;
        }
        .card-wide .card-content {
          max-width: 55%;
          position: relative;
          z-index: 3;
        }

        /* Tarjeta 4 (2 columnas, segunda fila) */
        .card-wide-bottom {
          grid-column: span 2;
          min-height: 340px;
        }

        /* ─── CONTENIDO ─── */
        .card-content {
          position: relative; z-index: 3;
          display: flex; flex-direction: column;
          gap: 10px;
          text-align: left;
        }

        .card-meta {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 4px;
        }

        .card-number {
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 1px;
        }

        .badge {
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1.5px;
        }
        .badge-active {
          background: rgba(84,199,248,0.12);
          color: #54c7f8;
          border: 1px solid rgba(84,199,248,0.25);
        }
        .badge-soon {
          background: rgba(255,255,255,0.06);
          color: var(--text-muted);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .card-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(28px, 3vw, 38px);
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .card-tagline {
          font-size: 15px; font-weight: 500;
          line-height: 1.35;
        }

        .card-desc {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.55;
          max-width: 340px;
        }

        .card-cta {
          display: inline-flex; align-items: center; gap: 8px;
          margin-top: 8px;
          font-size: 13px; font-weight: 600;
          letter-spacing: 0.5px;
          opacity: 0;
          transform: translateX(-8px);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .card:not(.inactive):hover .card-cta {
          opacity: 1; transform: translateX(0);
        }
        .card-cta svg {
          transition: transform 0.25s ease;
        }
        .card:not(.inactive):hover .card-cta svg {
          transform: translateX(4px);
        }

        /* ─── GLOW DE FONDO ─── */
        .card-glow {
          position: absolute;
          width: 320px; height: 320px;
          background: var(--card-accent-color, rgba(84,199,248,0.1));
          filter: blur(90px);
          opacity: 0.12;
          border-radius: 50%;
          top: -80px; right: -60px;
          z-index: 0;
          pointer-events: none;
          transition: opacity 0.5s ease;
        }
        .card:not(.inactive):hover .card-glow { opacity: 0.28; }

        /* Borde brillante animado en hover */
        .card-shimmer {
          position: absolute; inset: 0; z-index: 1;
          border-radius: inherit;
          opacity: 0;
          background: linear-gradient(
            115deg,
            transparent 40%,
            rgba(255,255,255,0.04) 50%,
            transparent 60%
          );
          background-size: 200% 100%;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .card:not(.inactive):hover .card-shimmer {
          opacity: 1;
          animation: shimmerSlide 1.4s ease infinite;
        }
        @keyframes shimmerSlide {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ─── IMÁGENES FLOTANTES ─── */
        .card-image-wrapper {
          position: absolute;
          z-index: 2;
          pointer-events: none;
          right: -4%;
          bottom: -6%;
          width: 52%;
          height: 130%;
          transition: transform 0.6s cubic-bezier(0.16,1,0.3,1);
        }
        .card-image-wrapper img {
          width: 100%; height: 100%;
          object-fit: contain;
          opacity: 0.88;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.4));
          animation: floatImage 6s ease-in-out infinite;
        }

        .card:not(.inactive):hover .card-image-wrapper {
          transform: scale(1.06) translateY(-4%);
        }

        /* Distintos delays para cada tarjeta */
        .card:nth-child(1) .card-image-wrapper img { animation-delay: 0s; }
        .card:nth-child(2) .card-image-wrapper img { animation-delay: -2s; }
        .card:nth-child(3) .card-image-wrapper img { animation-delay: -4s; }
        .card:nth-child(4) .card-image-wrapper img { animation-delay: -1s; }

        /* Ajustes de posición de imagen por tarjeta */
        .card-wide .card-image-wrapper {
          right: 2%;
          bottom: -8%;
          top: auto;
          width: 44%;
          height: 130%;
        }

        @keyframes floatImage {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25%       { transform: translateY(-10px) rotate(0.5deg); }
          50%       { transform: translateY(-16px) rotate(-0.3deg); }
          75%       { transform: translateY(-8px) rotate(0.2deg); }
        }

        /* ─── ETIQUETA DE CATEGORÍA DECORATIVA ─── */
        .card-tag-bg {
          position: absolute;
          top: 28px; right: 28px;
          z-index: 3;
          font-family: 'Syne', sans-serif;
          font-size: 11px; font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.1);
          pointer-events: none;
          transition: color 0.3s;
        }
        .card:not(.inactive):hover .card-tag-bg {
          color: rgba(255,255,255,0.18);
        }

        /* ─── SEPARADOR DECORATIVO ─── */
        .divider {
          width: 32px; height: 2px;
          background: var(--card-accent-color, rgba(84,199,248,0.6));
          border-radius: 2px;
          margin-bottom: 4px;
          transition: width 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .card:not(.inactive):hover .divider { width: 56px; }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 1100px) {
          .page-container { padding: 60px 32px 48px; }
        }

        @media (max-width: 900px) {
          .bento-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .card-wide, .card-wide-bottom {
            grid-column: span 2;
          }
        }

        @media (max-width: 600px) {
          .page-container { padding: 40px 20px 40px; }
          .bento-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .card, .card-wide, .card-wide-bottom {
            grid-column: span 1;
            flex-direction: column;
            min-height: 320px;
            padding: 28px 24px;
          }
          .card-wide .card-content { max-width: 100%; }
          .card-image-wrapper,
          .card-wide .card-image-wrapper {
            width: 75%; height: 65%;
            opacity: 0.35;
          }
          html, body { cursor: auto; }
          .custom-cursor { display: none; }
        }
      `}</style>

      {/* Cursor custom */}
      <div ref={cursorRef} className="custom-cursor" />

      {/* Fondo estático celeste */}
      <div className="bg-celeste" />

      <main className="page-container">

        {/* ── HEADER ── */}
        <header className={`header ${mounted ? "in" : ""}`}>
          <div className="header-eyebrow">Explorá</div>
          <h1 className="title">
            <span className={`title-word ${mounted ? "in" : ""}`}>
              Moda
            </span>
            <span className={`title-word title-accent ${mounted ? "in" : ""}`}>
              lidades
            </span>
          </h1>
          <p className={`subtitle ${mounted ? "in" : ""}`}>
            Cada sala es una experiencia diferente. Explorá, conectá y debatí en tiempo real.
          </p>
        </header>

        {/* ── BENTO GRID ── */}
        <div className="bento-grid">
          {MODALIDADES.map((mod, i) => {
            const isWide = mod.id === "ligues";
            const isWideBottom = mod.id === "idiomas";

            return (
              <div
                key={mod.id}
                className={[
                  "card",
                  mod.active ? "" : "inactive",
                  mounted ? "in" : "",
                  isWide ? "card-wide" : "",
                  isWideBottom ? "card-wide-bottom" : "",
                ].filter(Boolean).join(" ")}
                style={{
                  transitionDelay: mounted ? `${0.08 + i * 0.1}s` : "0s",
                  // @ts-ignore
                  "--card-accent-color": mod.accentFrom,
                }}
                onClick={() => mod.active && router.push(mod.href)}
                role={mod.active ? "button" : undefined}
                tabIndex={mod.active ? 0 : undefined}
                onKeyDown={(e) => mod.active && e.key === "Enter" && router.push(mod.href)}
                onMouseEnter={() => setHoveredCard(mod.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Shimmer */}
                <div className="card-shimmer" />

                {/* Glow de fondo */}
                <div className="card-glow" />

                {/* Número grande decorativo al fondo */}
                <span className="card-tag-bg">{mod.number}</span>

                {/* Contenido */}
                <div className="card-content">
                  <div className="card-meta">
                    <span className="card-number">{mod.number}</span>
                    {mod.active
                      ? <span className="badge badge-active">Activo</span>
                      : <span className="badge badge-soon">Próximamente</span>
                    }
                  </div>

                  <div className="divider" style={{ background: mod.accentFrom }} />

                  <h2 className="card-title">{mod.label}</h2>

                  <p className="card-tagline" style={{ color: mod.accentFrom }}>
                    {mod.tagline}
                  </p>

                  <p className="card-desc">{mod.description}</p>

                  {mod.active && (
                    <span className="card-cta" style={{ color: mod.accentFrom }}>
                      Entrar ahora
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                  )}
                </div>

                {/* Imagen flotante */}
                <div className="card-image-wrapper">
                  <img
                    src={(mod.image as any)?.src ?? mod.image}
                    alt={mod.label}
                  />
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </>
  );
}