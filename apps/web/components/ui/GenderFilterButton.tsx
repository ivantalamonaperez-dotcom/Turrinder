"use client";

/**
 * GenderFilterButton
 *
 * Botón pill para el header de Discover y Ligues.
 * Cicla entre: Ambos → Hombres → Mujeres → Ambos
 *
 * Se integra visualmente con el design system existente (sky azul, glass, DM Sans).
 * Al cambiar el filtro, dispara onFilterChange para que la página
 * cancele la búsqueda actual y emita find-match de nuevo con el nuevo filtro.
 */

import { GenderFilter } from "@/hooks/Usegenderfilter";

interface GenderFilterButtonProps {
  value: GenderFilter;
  onChange: (next: GenderFilter) => void;
}

const OPTIONS: { value: GenderFilter; label: string; emoji: string; color: string; border: string; glow: string }[] = [
  {
    value: "all",
    label: "Ambos",
    emoji: "⚥",
    color: "rgba(143,212,255,0.7)",
    border: "rgba(84,199,248,0.22)",
    glow: "rgba(84,199,248,0.18)",
  },
  {
    value: "male",
    label: "Hombres",
    emoji: "♂",
    color: "rgba(100,180,255,0.85)",
    border: "rgba(80,160,255,0.38)",
    glow: "rgba(80,160,255,0.22)",
  },
  {
    value: "female",
    label: "Mujeres",
    emoji: "♀",
    color: "rgba(255,150,200,0.85)",
    border: "rgba(255,90,170,0.38)",
    glow: "rgba(255,90,170,0.22)",
  },
];

export default function GenderFilterButton({ value, onChange }: GenderFilterButtonProps) {
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  const cycle = () => {
    const idx = OPTIONS.findIndex((o) => o.value === value);
    const next = OPTIONS[(idx + 1) % OPTIONS.length];
    onChange(next.value);
  };

  return (
    <>
      <style>{`
        .gfb-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          border: 1px solid var(--gfb-border);
          background: rgba(3,10,20,0.58);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 100px;
          padding: 5px 11px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
          pointer-events: all;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 0 0px var(--gfb-glow);
        }
        .gfb-btn:hover {
          background: rgba(84,199,248,0.08);
          transform: scale(1.04);
          box-shadow: 0 0 10px var(--gfb-glow);
        }
        .gfb-btn:active {
          transform: scale(0.95);
        }
        .gfb-emoji {
          font-size: 12px;
          line-height: 1;
          color: var(--gfb-color);
          transition: color 0.22s;
          flex-shrink: 0;
        }
        .gfb-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5px;
          color: var(--gfb-color);
          white-space: nowrap;
          transition: color 0.22s;
        }
        .gfb-caret {
          font-size: 8px;
          color: var(--gfb-color);
          opacity: 0.5;
          margin-left: 1px;
          flex-shrink: 0;
          transition: color 0.22s;
        }

        @keyframes gfb-pop {
          0%   { transform: scale(1); }
          45%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .gfb-btn.pop {
          animation: gfb-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
      `}</style>

      <button
        className="gfb-btn"
        style={{
          // @ts-ignore — CSS vars en inline style
          "--gfb-color":  current.color,
          "--gfb-border": current.border,
          "--gfb-glow":   current.glow,
        } as React.CSSProperties}
        onClick={cycle}
        title={`Filtrar por género: ${current.label}`}
      >
        <span className="gfb-emoji">{current.emoji}</span>
        <span className="gfb-label">{current.label}</span>
        <span className="gfb-caret">▼</span>
      </button>
    </>
  );
}