"use client";

import { useState } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [focused, setFocused] = useState<string | null>(null);

  const testAccounts = [
    { email: "test1@test.com", password: "123456" },
    { email: "test2@test.com", password: "123456" },
    { email: "test3@test.com", password: "123456" },
  ];

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
    const account = testAccounts[Math.floor(Math.random() * testAccounts.length)];
    const { error } = await supabase.auth.signInWithPassword({ email: account.email, password: account.password });
    if (error) { alert("Cuentas de prueba no encontradas. Créalas en Supabase."); setLoading(false); return; }
    router.push("/discover");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #080810;
        }

        .home-root {
          min-height: 100vh;
          display: flex;
          position: relative;
          overflow: hidden;
        }

        /* Orb blobs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #ff2d6b44 0%, transparent 70%);
          top: -100px; left: -100px;
          animation: float1 8s ease-in-out infinite;
        }
        .orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #7c3aed44 0%, transparent 70%);
          bottom: -80px; right: -80px;
          animation: float2 10s ease-in-out infinite;
        }
        .orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #06b6d422 0%, transparent 70%);
          top: 50%; right: 20%;
          animation: float1 12s ease-in-out infinite reverse;
        }

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 40px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-25px, -35px); }
        }

        /* Grid texture overlay */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          z-index: 0;
        }

        /* Left panel */
        .left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 80px;
          position: relative;
          z-index: 1;
        }

        .logo-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,45,107,0.12);
          border: 1px solid rgba(255,45,107,0.3);
          border-radius: 100px;
          padding: 6px 16px 6px 6px;
          margin-bottom: 40px;
          width: fit-content;
        }

        .logo-dot {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d6b, #ff6b35);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
        }

        .logo-text {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #ff2d6b;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .hero-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(48px, 6vw, 80px);
          font-weight: 800;
          line-height: 1.0;
          color: #ffffff;
          margin-bottom: 24px;
          letter-spacing: -2px;
        }

        .hero-title .accent {
          background: linear-gradient(135deg, #ff2d6b 0%, #ff6b35 50%, #ffd93d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-sub {
          font-size: 17px;
          color: rgba(255,255,255,0.45);
          line-height: 1.6;
          max-width: 400px;
          font-weight: 300;
        }

        .stats-row {
          display: flex;
          gap: 40px;
          margin-top: 56px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-number {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: white;
        }

        .stat-label {
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.5px;
        }

        .stat-divider {
          width: 1px;
          background: rgba(255,255,255,0.08);
          align-self: stretch;
        }

        /* Right panel / form */
        .right-panel {
          width: 480px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          padding: 40px;
        }

        .form-card {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          padding: 40px;
          backdrop-filter: blur(20px);
        }

        .tab-switcher {
          display: flex;
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 36px;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .tab {
          flex: 1;
          padding: 10px;
          text-align: center;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.5px;
          border-radius: 9px;
          border: none;
          cursor: pointer;
          transition: all 0.25s ease;
          background: transparent;
          color: rgba(255,255,255,0.35);
        }

        .tab.active {
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          color: white;
          box-shadow: 0 4px 20px rgba(255,45,107,0.35);
        }

        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 8px;
        }

        .input-wrap {
          position: relative;
          margin-bottom: 20px;
        }

        .form-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px 18px;
          font-size: 15px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.2s ease;
        }

        .form-input::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .form-input:focus {
          border-color: rgba(255,45,107,0.5);
          background: rgba(255,45,107,0.05);
          box-shadow: 0 0 0 3px rgba(255,45,107,0.1);
        }

        .btn-primary {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #ff2d6b 0%, #c9193e 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
          position: relative;
          overflow: hidden;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transition: left 0.5s ease;
        }

        .btn-primary:hover::before { left: 100%; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 30px rgba(255,45,107,0.4); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }

        .divider-text {
          font-size: 12px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.5px;
        }

        .btn-ghost {
          width: 100%;
          padding: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: rgba(255,255,255,0.6);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-ghost:hover {
          background: rgba(255,255,255,0.07);
          color: white;
          border-color: rgba(255,255,255,0.15);
        }

        .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

        .pulse-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 0 rgba(34,197,94,0.4);
          animation: pulse-anim 2s infinite;
        }

        @keyframes pulse-anim {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }

        @media (max-width: 768px) {
          .home-root { flex-direction: column; }
          .left-panel { padding: 40px 24px 24px; }
          .hero-title { font-size: 40px; }
          .stats-row { display: none; }
          .right-panel { width: 100%; min-height: auto; padding: 0 24px 40px; }
          .form-card { padding: 28px; }
        }
      `}</style>

      <div className="home-root">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-overlay" />

        {/* Left */}
        <div className="left-panel">
          <div className="logo-badge">
            <div className="logo-dot">🔥</div>
            <span className="logo-text">Turrinder</span>
          </div>

          <h1 className="hero-title">
            Conocé<br />
            <span className="accent">personas</span><br />
            reales
          </h1>

          <p className="hero-sub">
            Video chat en vivo con personas de todo el mundo. Swipeá, conectá, y viví experiencias únicas.
          </p>

          <div className="stats-row">
            <div className="stat">
              <span className="stat-number">12K+</span>
              <span className="stat-label">En línea ahora</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-number">98%</span>
              <span className="stat-label">Match rate</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-number">180+</span>
              <span className="stat-label">Países</span>
            </div>
          </div>
        </div>

        {/* Right / Form */}
        <div className="right-panel">
          <div className="form-card">
            <div className="tab-switcher">
              <button
                className={`tab ${mode === "login" ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                Entrar
              </button>
              <button
                className={`tab ${mode === "register" ? "active" : ""}`}
                onClick={() => setMode("register")}
              >
                Registrarse
              </button>
            </div>

            <div className="input-wrap">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                placeholder="tu@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="input-wrap">
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              className="btn-primary"
              onClick={mode === "login" ? login : register}
              disabled={loading}
            >
              {loading ? "Cargando..." : mode === "login" ? "Iniciar sesión →" : "Crear cuenta →"}
            </button>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">o</span>
              <div className="divider-line" />
            </div>

            <button className="btn-ghost" onClick={testLogin} disabled={loading}>
              <div className="pulse-dot" />
              Entrar como invitado
            </button>
          </div>
        </div>
      </div>
    </>
  );
}