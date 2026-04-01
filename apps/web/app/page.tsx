"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";

const TEST_ACCOUNTS = [
  { email: "test1@test.com", password: "123456" },
  { email: "test2@test.com", password: "123456" },
  { email: "test3@test.com", password: "123456" },
];

const MARKETING_PHRASES = [
  { text: "Conocé gente real", emoji: "✨" },
  { text: "Video en vivo", emoji: "📹" },
  { text: "Conexiones genuinas", emoji: "💫" },
  { text: "Swipe. Match. Hablá.", emoji: "🔥" },
  { text: "El amor está a un click", emoji: "❤️" },
  { text: "Sin filtros", emoji: "⚡" },
  { text: "Miles online ahora", emoji: "🌍" },
  { text: "Tu próxima historia", emoji: "💬" },
];

interface Particle {
  id: number;
  x: number;
  startY: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  driftX: number;
  opacity: number;
}

interface FloatingTag {
  id: number;
  x: number;
  startY: number;
  phrase: { text: string; emoji: string };
  duration: number;
  delay: number;
  driftX: number;
}

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingTags, setFloatingTags] = useState<FloatingTag[]>([]);

  useEffect(() => {
    setMounted(true);

    const colors = ["#ff2d6b", "#ff6b35", "#ffc947", "#ff4488", "#ff8c42"];
    const pts: Particle[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      startY: 85 + Math.random() * 20,         // spawn near bottom
      size: 2 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 14 + Math.random() * 16,
      delay: Math.random() * 12,
      driftX: (Math.random() - 0.5) * 180,
      opacity: 0.4 + Math.random() * 0.5,
    }));
    setParticles(pts);

    // Tags: 4 on left, 4 on right, spread vertically across full screen
    const tags: FloatingTag[] = MARKETING_PHRASES.map((phrase, i) => ({
      id: i,
      x: i % 2 === 0 ? 1 + Math.random() * 16 : 72 + Math.random() * 20,
      startY: 90 + Math.random() * 20,          // also rise from bottom
      phrase,
      duration: 18 + Math.random() * 14,
      delay: i * 1.8 + Math.random() * 2,       // staggered starts
      driftX: (Math.random() - 0.5) * 80,
    }));
    setFloatingTags(tags);
  }, []);

  const login = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { alert(error.message); setLoading(false); return; }
    router.push("/discover");
  };

  const register = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { alert(error.message); setLoading(false); return; }
    router.push("/discover");
  };

  const testLogin = async () => {
    setLoading(true);
    const acc = TEST_ACCOUNTS[Math.floor(Math.random() * TEST_ACCOUNTS.length)];
    const { error } = await supabase.auth.signInWithPassword({ email: acc.email, password: acc.password });
    if (error) { alert("Cuentas de prueba no encontradas."); setLoading(false); return; }
    router.push("/discover");
  };

  return (
    <div className="hp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body { height: 100%; background: #060610; }

        /* ── Root: centered, scrollable on mobile ── */
        .hp-root {
          width: 100vw;
          min-height: 100vh;
          background: #060610;
          display: grid;
          place-items: center;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 48px 16px;
        }

        /* ── Background aurora — NO grain ── */
        .hp-aurora {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 18% 22%, rgba(255,45,107,0.20) 0%, transparent 58%),
            radial-gradient(ellipse 50% 40% at 82% 78%, rgba(255,107,53,0.14) 0%, transparent 58%),
            radial-gradient(ellipse 40% 35% at 68% 18%, rgba(255,68,136,0.10) 0%, transparent 52%),
            radial-gradient(ellipse 55% 45% at 30% 90%, rgba(255,201,71,0.06) 0%, transparent 50%);
          animation: auroraShift 14s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: 0;
        }

        @keyframes auroraShift {
          0%   { opacity: 0.65; transform: scale(1); }
          50%  { opacity: 0.85; transform: scale(1.04); }
          100% { opacity: 1;    transform: scale(1.08); }
        }

        /* ── Particles — rise from bottom ── */
        .hp-particle {
          position: fixed;
          bottom: -2%;   /* always start just below viewport */
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
          filter: blur(0.8px);
        }

        @keyframes particleRise {
          0%   { transform: translate(0, 0) scale(0.6);                           opacity: 0; }
          6%   { opacity: var(--op); }
          50%  { transform: translate(calc(var(--dx) * 0.5), -55vh) scale(1.3);  opacity: var(--op); }
          94%  { opacity: 0.08; }
          100% { transform: translate(var(--dx), -108vh) scale(0.4);              opacity: 0; }
        }

        /* ── Floating marketing tags ── */
        .hp-tag {
          position: fixed;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 100px;
          padding: 7px 14px 7px 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: rgba(255,255,255,0.42);
          white-space: nowrap;
          pointer-events: none;
          z-index: 2;
          /* Use bottom + translateY so every loop iteration starts from
             the exact same screen position — no "stuck" artifact */
          bottom: var(--tag-start, -10%);
          top: auto !important;
        }

        .hp-tag-emoji { font-size: 13px; line-height: 1; }

        @keyframes tagRise {
          0%   { transform: translate(0, 0);                                   opacity: 0; }
          7%   { opacity: 0.72; }
          50%  { transform: translate(calc(var(--tdx) * 0.4), -52vh);         opacity: 0.6; }
          93%  { opacity: 0.08; }
          100% { transform: translate(var(--tdx), -110vh);                     opacity: 0; }
        }

        /* ── Main wrapper: dead-center column ── */
        .hp-wrapper {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          /* No extra margin — grid centering handles it */
          opacity: 0;
          animation: wrapperIn 0.9s 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes wrapperIn {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Logo block ── */
        .hp-logo-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .hp-logo-icon {
          width: 58px;
          height: 58px;
          border-radius: 17px;
          background: linear-gradient(135deg, #ff2d6b 0%, #ff6b35 60%, #ffc947 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 27px;
          box-shadow:
            0 0 0 1px rgba(255,45,107,0.3),
            0 0 36px rgba(255,45,107,0.45),
            0 0 72px rgba(255,45,107,0.18),
            inset 0 1px 0 rgba(255,255,255,0.22);
          animation: iconGlow 3s ease-in-out infinite alternate;
        }

        @keyframes iconGlow {
          from { box-shadow: 0 0 0 1px rgba(255,45,107,0.3), 0 0 28px rgba(255,45,107,0.4), 0 0 60px rgba(255,45,107,0.14), inset 0 1px 0 rgba(255,255,255,0.22); }
          to   { box-shadow: 0 0 0 1px rgba(255,45,107,0.55), 0 0 52px rgba(255,45,107,0.6), 0 0 95px rgba(255,45,107,0.24), inset 0 1px 0 rgba(255,255,255,0.28); }
        }

        .hp-logo-name {
          font-family: 'Syne', sans-serif;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: -1px;
          color: white;
          line-height: 1;
        }

        .hp-logo-name span {
          background: linear-gradient(135deg, #ff2d6b, #ff6b35, #ffc947);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hp-logo-tagline {
          font-size: 11px;
          color: rgba(255,255,255,0.28);
          letter-spacing: 2.8px;
          text-transform: uppercase;
          font-weight: 300;
          margin-top: -2px;
        }

        /* ── Card ── */
        .hp-card {
          width: 500px;
          background: rgba(10,10,22,0.88);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 32px;
          padding: 52px 52px 48px;
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          box-shadow:
            0 0 0 1px rgba(255,45,107,0.04),
            0 28px 60px rgba(0,0,0,0.55),
            0 0 70px rgba(255,45,107,0.07),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        /* ── Tabs ── */
        .hp-tabs {
          display: flex;
          gap: 4px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 4px;
          margin-bottom: 32px;
        }

        .hp-tab {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 11px;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          color: rgba(255,255,255,0.3);
          background: transparent;
        }

        .hp-tab.active {
          background: linear-gradient(135deg, #ff2d6b 0%, #c9193e 100%);
          color: white;
          box-shadow: 0 4px 16px rgba(255,45,107,0.4);
        }

        .hp-tab:not(.active):hover {
          color: rgba(255,255,255,0.6);
          background: rgba(255,255,255,0.04);
        }

        /* ── Fields ── */
        .hp-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        .hp-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
        }

        .hp-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 15px 18px;
          font-size: 16px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.2s ease;
          -webkit-appearance: none;
        }

        .hp-input::placeholder { color: rgba(255,255,255,0.15); }

        .hp-input:focus {
          border-color: rgba(255,45,107,0.5);
          background: rgba(255,45,107,0.04);
          box-shadow: 0 0 0 3px rgba(255,45,107,0.1);
        }

        /* ── Primary button ── */
        .hp-btn-primary {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #ff2d6b 0%, #c9193e 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-family: 'Syne', sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 8px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 28px rgba(255,45,107,0.4);
        }

        .hp-btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent 50%);
          pointer-events: none;
        }

        .hp-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }

        .hp-btn-primary:hover::after { transform: translateX(100%); }
        .hp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(255,45,107,0.55); }
        .hp-btn-primary:active { transform: translateY(0); }
        .hp-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

        /* ── Divider ── */
        .hp-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0;
        }

        .hp-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.05); }
        .hp-divider-text { font-size: 11px; color: rgba(255,255,255,0.15); letter-spacing: 1px; }

        /* ── Ghost button ── */
        .hp-btn-ghost {
          width: 100%;
          padding: 15px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          color: rgba(255,255,255,0.4);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .hp-btn-ghost:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.1); }
        .hp-btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; }

        .hp-pulse {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 2s infinite;
          flex-shrink: 0;
        }

        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }

        /* ── Footer ── */
        .hp-footer {
          font-size: 10px;
          color: rgba(255,255,255,0.1);
          text-align: center;
          letter-spacing: 0.4px;
        }

        /* ══════════════════════════════════════
           MOBILE — ≤ 560px
        ══════════════════════════════════════ */
        @media (max-width: 560px) {

          .hp-root {
            padding: 32px 0;
            place-items: start center;
          }

          /* Hide floating tags on mobile — no side room */
          .hp-tag { display: none; }

          .hp-wrapper {
            width: 100%;
            gap: 20px;
            padding: 0 20px;
          }

          .hp-logo-icon {
            width: 52px;
            height: 52px;
            font-size: 24px;
            border-radius: 15px;
          }

          .hp-logo-name { font-size: 28px; }
          .hp-logo-tagline { font-size: 10px; letter-spacing: 2px; }

          .hp-card {
            width: 100%;
            border-radius: 24px;
            padding: 32px 24px 28px;
          }

          .hp-tabs { margin-bottom: 24px; }

          .hp-tab { padding: 11px; font-size: 13px; }

          .hp-field { margin-bottom: 16px; gap: 7px; }

          .hp-input {
            padding: 14px 16px;
            font-size: 16px; /* 16px prevents iOS zoom on focus */
            border-radius: 13px;
          }

          .hp-btn-primary {
            padding: 15px;
            font-size: 15px;
            border-radius: 13px;
          }

          .hp-divider { margin: 18px 0; }

          .hp-btn-ghost {
            padding: 14px;
            font-size: 14px;
            border-radius: 13px;
          }
        }

        /* ── Tablet — 561px → 700px ── */
        @media (min-width: 561px) and (max-width: 700px) {
          .hp-tag { display: none; }

          .hp-card {
            width: 460px;
            padding: 44px 40px;
          }
        }
      `}</style>

      {/* Background — NO noise layer */}
      <div className="hp-aurora" />

      {/* Random rising particles */}
      {mounted && particles.map((p) => (
        <div
          key={p.id}
          className="hp-particle"
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            "--op": p.opacity,
            "--dx": `${p.driftX}px`,
            animation: `particleRise ${p.duration}s ${p.delay}s linear infinite`,
          } as React.CSSProperties}
        />
      ))}

      {/* Floating marketing tags — rise from bottom, anchored via CSS var so loop resets cleanly */}
      {mounted && floatingTags.map((tag) => (
        <div
          key={tag.id}
          className="hp-tag"
          style={{
            left: `${tag.x}%`,
            "--tag-start": `${-(5 + Math.abs(tag.driftX) * 0.05)}%`,
            "--tdx": `${tag.driftX}px`,
            animation: `tagRise ${tag.duration}s ${tag.delay}s linear infinite`,
          } as React.CSSProperties}
        >
          <span className="hp-tag-emoji">{tag.phrase.emoji}</span>
          {tag.phrase.text}
        </div>
      ))}

      {/* Main content — centered by grid */}
      <div className="hp-wrapper">

        {/* Logo */}
        <div className="hp-logo-block">
          <div className="hp-logo-icon">🔥</div>
          <div className="hp-logo-name">Turr<span>inder</span></div>
          <div className="hp-logo-tagline">Tinder meets OmeTV</div>
        </div>

        {/* Auth card */}
        <div className="hp-card">
          <div className="hp-tabs">
            <button className={`hp-tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>
              Entrar
            </button>
            <button className={`hp-tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>
              Registrarse
            </button>
          </div>

          <div className="hp-field">
            <label className="hp-label">Email</label>
            <input
              className="hp-input"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? login() : register())}
            />
          </div>

          <div className="hp-field">
            <label className="hp-label">Contraseña</label>
            <input
              className="hp-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? login() : register())}
            />
          </div>

          <button className="hp-btn-primary" onClick={mode === "login" ? login : register} disabled={loading}>
            {loading ? "Cargando..." : mode === "login" ? "Iniciar sesión →" : "Crear cuenta →"}
          </button>

          <div className="hp-divider">
            <div className="hp-divider-line" />
            <span className="hp-divider-text">o</span>
            <div className="hp-divider-line" />
          </div>

          <button className="hp-btn-ghost" onClick={testLogin} disabled={loading}>
            <div className="hp-pulse" />
            Entrar como invitado
          </button>
        </div>

        <div className="hp-footer">
          Al continuar aceptás los términos de uso · Turrinder © 2025
        </div>

      </div>
    </div>
  );
}