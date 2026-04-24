"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase.client";

// Asumiendo que estas rutas son correctas en tu proyecto
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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }

        :root {
          --bg: #050505;
          --surface: rgba(255, 255, 255, 0.03);
          --surface-hover: rgba(255, 255, 255, 0.06);
          --border: rgba(255, 255, 255, 0.08);
          --text-main: #fcfcfc;
          --text-muted: #a1a1aa;
        }

        html, body { 
          min-height: 100vh; 
          background: var(--bg); 
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif; 
          color: var(--text-main);
        }

        /* ── BACKGROUND MESH ── */
        .bg-mesh {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: 
            radial-gradient(at 0% 0%, rgba(84, 199, 248, 0.08) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(245, 158, 11, 0.05) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(167, 139, 250, 0.05) 0px, transparent 50%);
          filter: blur(80px);
        }

        /* ── LAYOUT PRINCIPAL ── */
        .page-container {
          position: relative; z-index: 1;
          display: flex; flex-direction: column; align-items: center;
          padding: 80px 24px;
          min-height: 100vh;
        }

        .header {
          text-align: center;
          margin-bottom: 64px;
          opacity: 0; transform: translateY(20px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .header.in { opacity: 1; transform: translateY(0); }

        .title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(40px, 6vw, 72px);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 16px;
        }
        .title span {
          background: linear-gradient(135deg, #54c7f8, #fcfcfc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          font-size: 18px;
          color: var(--text-muted);
          max-width: 500px;
          margin: 0 auto;
        }

        /* ── BENTO GRID ── */
        .grid-container {
          width: 100%;
          max-width: 1200px; /* Ancho incrementado */
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          auto-rows: minmax(300px, auto);
        }

        /* ── TARJETAS ── */
        .card {
          position: relative;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 32px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          cursor: pointer;
          opacity: 0; transform: translateY(30px);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          -webkit-tap-highlight-color: transparent;
        }

        .card.in { opacity: 1; transform: translateY(0); }
        
        .card.inactive {
          cursor: not-allowed;
          filter: grayscale(100%) opacity(0.5);
        }

        .card:hover:not(.inactive) {
          background: var(--surface-hover);
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -20px rgba(0,0,0,0.5);
        }

        /* Highlight principal (Ligues ocupa 2 columnas) */
        .card:nth-child(1) {
          grid-column: span 2;
          flex-direction: row; /* Diseño horizontal */
          align-items: center;
        }

        /* Resto de tarjetas ocupan 1 columna o adaptan */
        .card:nth-child(2),
        .card:nth-child(3),
        .card:nth-child(4) {
          grid-column: span 1;
        }

        /* ── CONTENIDO DE LA TARJETA ── */
        .card-content {
          position: relative;
          z-index: 2;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .card-header-info {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 8px;
        }

        .card-number {
          font-family: 'Syne', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .badge-active {
          background: rgba(84, 199, 248, 0.1);
          color: #54c7f8;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 1px solid rgba(84, 199, 248, 0.2);
        }

        .badge-soon {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .card-title {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
        }

        .card-tagline {
          font-size: 16px;
          font-weight: 500;
        }

        .card-desc {
          font-size: 15px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        /* ── IMÁGENES ── */
        .card-image-wrapper {
          position: absolute;
          right: -10%;
          bottom: -10%;
          width: 60%;
          height: 120%;
          z-index: 1;
          pointer-events: none;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .card:hover:not(.inactive) .card-image-wrapper {
          transform: scale(1.05) translate(-2%, -2%);
        }

        /* Ajustes específicos de imágenes por tarjeta */
        .card:nth-child(1) .card-image-wrapper {
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 45%;
          height: 140%;
        }
        .card:nth-child(1):hover .card-image-wrapper {
          transform: translateY(-50%) scale(1.05);
        }

        .card-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          opacity: 0.85;
        }

        /* ── EFECTO DE LUZ DE FONDO ── */
        .card-glow {
          position: absolute;
          width: 200px; height: 200px;
          background: var(--accent);
          filter: blur(100px);
          opacity: 0.15;
          border-radius: 50%;
          top: -50px; left: -50px;
          z-index: 0;
          transition: opacity 0.4s ease;
        }
        .card:hover:not(.inactive) .card-glow {
          opacity: 0.25;
        }

        /* ── RESPONSIVE ── */
        @media(max-width: 992px) {
          .grid-container {
            grid-template-columns: repeat(2, 1fr);
          }
          .card:nth-child(1) {
            grid-column: span 2;
          }
        }

        @media(max-width: 768px) {
          .page-container { padding: 40px 16px; }
          .grid-container {
            grid-template-columns: 1fr;
          }
          .card, .card:nth-child(1) {
            grid-column: span 1;
            flex-direction: column;
            padding: 32px 24px;
            min-height: 400px;
          }
          .card-content { max-width: 100%; z-index: 3; }
          
          .card-image-wrapper, 
          .card:nth-child(1) .card-image-wrapper {
            position: absolute;
            right: -20%;
            bottom: -10%;
            top: auto;
            transform: none;
            width: 80%;
            height: 70%;
            opacity: 0.4; /* Reducimos opacidad en móvil para leer el texto */
          }
        }
      `}</style>

      <div className="bg-mesh" />

      <main className="page-container">
        
        {/* HEADER */}
        <header className={`header ${mounted ? "in" : ""}`}>
          <h1 className="title">Modalidades</h1>
          <p className="subtitle">
            Cada sala es una experiencia diferente. Explorá, conectá y debatí en tiempo real.
          </p>
        </header>

        {/* BENTO GRID */}
        <div className="grid-container">
          {MODALIDADES.map((mod, i) => (
            <div
              key={mod.id}
              className={`card ${mod.active ? "active" : "inactive"} ${mounted ? "in" : ""}`}
              style={{
                transitionDelay: mounted ? `${0.1 + i * 0.1}s` : "0s",
                // @ts-ignore
                "--accent": mod.accentFrom,
              }}
              onClick={() => mod.active && router.push(mod.href)}
              role={mod.active ? "button" : undefined}
              tabIndex={mod.active ? 0 : undefined}
              onKeyDown={(e) => mod.active && e.key === "Enter" && router.push(mod.href)}
            >
              {/* Luz de fondo coloreada */}
              <div className="card-glow" />

              <div className="card-content">
                <div className="card-header-info">
                  <span className="card-number">{mod.number}</span>
                  {mod.active 
                    ? <span className="badge-active">Activo</span>
                    : <span className="badge-soon">Próximamente</span>
                  }
                </div>

                <h2 className="card-title">{mod.label}</h2>
                <p className="card-tagline" style={{ color: mod.accentFrom }}>
                  {mod.tagline}
                </p>
                <p className="card-desc">{mod.description}</p>
              </div>

              <div className="card-image-wrapper">
                <img
                  src={(mod.image as any)?.src ?? mod.image}
                  alt={mod.label}
                  className="card-image"
                />
              </div>
            </div>
          ))}
        </div>

      </main>
    </>
  );
}