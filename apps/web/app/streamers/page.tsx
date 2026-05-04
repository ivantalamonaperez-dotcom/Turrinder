"use client";

import { useState } from "react";
import SideNav from "@/components/ui/BottomNav";

const CATS         = ["Gaming", "Just Chatting", "Tech", "Música", "Educación", "Arte", "Deportes", "Otro"];
const PLATAFORMAS  = ["Twitch", "YouTube", "TikTok", "Kick", "Instagram", "Otra"];
const FOLLOWER_OPT = ["Menos de 500", "500 – 2.000", "2.000 – 10.000", "Más de 10.000"];
const FREQ_OPT     = ["Todos los días", "3 – 5 veces por semana", "1 – 2 veces por semana", "Ocasionalmente"];

const BENEFITS = [
  { icon: "🚀", title: "Impulso real a tu carrera",     desc: "Tu contenido llega a nuevas audiencias. No empezás de cero, empezás con respaldo." },
  { icon: "📱", title: "Exposición en redes sociales",  desc: "Tus clips pueden aparecer en el Instagram, TikTok y canales de Turrinder. Alcance orgánico sin costo." },
  { icon: "✂️", title: "Contenido que viraliza",        desc: "Debates, reacciones, collabs, humor, IA. Todo lo que hace famosa a la gente en reels, con el puntapié de la plataforma." },
  { icon: "🤝", title: "Negocio redondo para los dos",  desc: "Vos nos das contenido vivo y nosotros te damos alcance. Crecemos juntos." },
  { icon: "🌐", title: "Red de creadores",              desc: "Formá parte de una comunidad de streamers activos. Conectá, colaborá y crecé." },
  { icon: "📊", title: "Estadísticas de tu audiencia",  desc: "Métricas reales: quién te ve, cuándo y desde dónde. Decisiones basadas en datos." },
  { icon: "💜", title: "Perfil verificado",             desc: "Badge exclusivo de streamer verificado Turrinder. Credibilidad inmediata frente a tu audiencia." },
  { icon: "🎯", title: "Soporte dedicado",              desc: "Canal directo con el equipo. Acompañamiento real desde el día uno." },
];

const STEPS = [
  { id: 1, label: "Sobre vos",   icon: "👤" },
  { id: 2, label: "Tu canal",    icon: "🎙" },
  { id: 3, label: "Tu historia", icon: "✍️" },
];

type Form = {
  nombre: string; usuario: string; email: string;
  categoria: string; plataforma: string; seguidores: string; frecuencia: string; link: string;
  bio: string;
};
const EMPTY: Form = { nombre: "", usuario: "", email: "", categoria: "", plataforma: "", seguidores: "", frecuencia: "", link: "", bio: "" };

export default function StreamersPage() {
  const [form,    setForm]    = useState<Form>(EMPTY);
  const [step,    setStep]    = useState(1);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});

  const set = (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }));
      setTouched(t => ({ ...t, [k]: true }));
      setError(null);
    };

  const touch = (...keys: (keyof Form)[]) =>
    setTouched(t => { const n = { ...t }; keys.forEach(k => (n[k] = true)); return n; });

  const fieldErr = (k: keyof Form) => touched[k] && !form[k];

  const nextStep = () => {
    if (step === 1) {
      touch("nombre", "usuario", "email");
      if (!form.nombre || !form.usuario || !form.email) { setError("Completá los campos obligatorios."); return; }
    }
    if (step === 2) {
      touch("categoria", "plataforma");
      if (!form.categoria || !form.plataforma) { setError("Seleccioná categoría y plataforma."); return; }
    }
    setError(null);
    setStep(s => Math.min(s + 1, 3));
  };

  const submit = async () => {
    touch("bio");
    if (!form.bio) { setError("Contanos algo sobre vos antes de enviar."); return; }
    setError(null); setSending(true);
    try {
      const res  = await fetch("/api/streamers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al enviar."); return; }
      setSent(true);
    } catch { setError("Error de conexión. Intentá de nuevo."); }
    finally  { setSending(false); }
  };

  return (
    <>
      <SideNav />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .sp-root {
          min-height: 100vh; background: #020a16;
          padding-left: 64px; padding-bottom: 60px;
          font-family: 'DM Sans', sans-serif;
        }
        @media (max-width: 768px) { .sp-root { padding-left: 0; } }

        .sp-aurora {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 70% 55% at 10% 15%, rgba(124,58,237,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 45% at 90% 85%, rgba(167,139,250,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.03) 0%, transparent 60%);
        }
        .sp-inner {
          position: relative; z-index: 1;
          max-width: 1060px; margin: 0 auto;
          padding: 52px 28px 0;
        }
        @media (max-width: 600px) { .sp-inner { padding: 32px 16px 0; } }

        /* Header */
        .sp-header { margin-bottom: 48px; }
        .sp-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 14px; border-radius: 100px;
          background: rgba(167,139,250,0.07); border: 1px solid rgba(167,139,250,0.18);
          font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase;
          color: rgba(167,139,250,0.6); margin-bottom: 18px;
        }
        .sp-eyebrow-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #a78bfa;
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
        .sp-title {
          font-family: 'Syne', sans-serif; font-size: clamp(30px, 5vw, 50px);
          font-weight: 900; letter-spacing: -1.5px; color: #f5f8ff; line-height: 1.05; margin: 0 0 14px;
        }
        .sp-title .pur {
          background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #7c3aed 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .sp-sub { font-size: 15px; color: rgba(180,215,240,0.36); line-height: 1.75; max-width: 560px; margin: 0; }

        /* Section label */
        .sp-section-label { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .sp-section-label-text {
          font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: rgba(180,215,240,0.2); white-space: nowrap;
        }
        .sp-section-label-line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, rgba(167,139,250,0.12), transparent);
        }

        /* Form wrap */
        .sp-form-wrap { max-width: 620px; margin: 0 auto 52px; }

        /* Form card */
        .sp-form-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(167,139,250,0.12);
          border-radius: 22px; padding: 30px 28px; position: relative; overflow: hidden;
        }
        .sp-form-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(167,139,250,0.5), transparent);
        }

        /* Stepper */
        .sp-stepper { display: flex; align-items: center; margin-bottom: 22px; }
        .sp-step-wrap { display: flex; align-items: center; }
        .sp-step-circle {
          width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; font-family: 'Syne', sans-serif;
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          border: 1.5px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03); color: rgba(180,215,240,0.25);
        }
        .sp-step-label {
          font-size: 11px; font-weight: 600; color: rgba(180,215,240,0.22);
          transition: color 0.3s; white-space: nowrap; margin-left: 8px;
        }
        .sp-step-connector {
          flex: 1; height: 1px; margin: 0 8px;
          background: rgba(255,255,255,0.05); position: relative; min-width: 20px;
        }
        @media (max-width: 420px) { .sp-step-label { display: none; } }

        /* Progress */
        .sp-progress { height: 2px; background: rgba(255,255,255,0.04); border-radius: 2px; margin-bottom: 28px; overflow: hidden; }
        .sp-progress-bar {
          height: 100%; border-radius: 2px;
          background: linear-gradient(90deg, #a78bfa, #7c3aed);
          box-shadow: 0 0 10px rgba(167,139,250,0.55);
          transition: width 0.5s cubic-bezier(0.16,1,0.3,1);
        }

        /* Step body */
        .sp-step-body { animation: slideIn 0.32s cubic-bezier(0.16,1,0.3,1); }
        @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        .sp-step-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 900; color: #f5f8ff; margin: 0 0 4px; letter-spacing: -0.4px; }
        .sp-step-sub { font-size: 13px; color: rgba(180,215,240,0.3); margin: 0 0 24px; line-height: 1.5; }
        .sp-req { color: rgba(167,139,250,0.6); }

        /* Fields */
        .sp-fields { display: flex; flex-direction: column; gap: 14px; }
        .sp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 520px) { .sp-row { grid-template-columns: 1fr; } }
        .sp-field { display: flex; flex-direction: column; gap: 6px; }
        .sp-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(180,215,240,0.33); }
        .sp-field-wrap { position: relative; }
        .sp-field-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 15px; pointer-events: none; line-height: 1; z-index: 1; }
        .sp-input, .sp-select {
          width: 100%; padding: 11px 12px 11px 38px; border-radius: 11px;
          background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.07);
          color: #f5f8ff; font-family: 'DM Sans', sans-serif; font-size: 13.5px;
          outline: none; transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
          -webkit-appearance: none;
        }
        .sp-input::placeholder { color: rgba(180,215,240,0.16); }
        .sp-input:focus, .sp-select:focus {
          border-color: rgba(167,139,250,0.52);
          background: rgba(167,139,250,0.04);
          box-shadow: 0 0 0 3px rgba(167,139,250,0.09);
        }
        .sp-input.err, .sp-select.err { border-color: rgba(248,113,113,0.45); }
        .sp-select { cursor: pointer; }
        .sp-select option { background: #05101e; color: #f5f8ff; }
        .sp-textarea {
          width: 100%; padding: 12px 14px; border-radius: 11px;
          background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.07);
          color: #f5f8ff; font-family: 'DM Sans', sans-serif; font-size: 13.5px;
          outline: none; resize: vertical; min-height: 130px; line-height: 1.65;
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
        }
        .sp-textarea::placeholder { color: rgba(180,215,240,0.15); }
        .sp-textarea:focus {
          border-color: rgba(167,139,250,0.52); background: rgba(167,139,250,0.04);
          box-shadow: 0 0 0 3px rgba(167,139,250,0.09);
        }
        .sp-textarea.err { border-color: rgba(248,113,113,0.45); }
        .sp-field-hint { font-size: 11px; color: rgba(248,113,113,0.7); animation: fadeUp 0.2s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(-3px)} to{opacity:1;transform:translateY(0)} }
        .sp-char { font-size: 10px; color: rgba(180,215,240,0.2); text-align: right; }
        .sp-char.warn { color: rgba(251,146,60,0.55); }

        /* Buttons */
        .sp-form-nav { display: flex; gap: 10px; margin-top: 4px; }
        .sp-btn-back {
          padding: 12px 20px; border-radius: 12px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(180,215,240,0.38); font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s ease; flex-shrink: 0;
        }
        .sp-btn-back:hover { background: rgba(255,255,255,0.07); color: rgba(180,215,240,0.65); }
        .sp-btn {
          flex: 1; padding: 13px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(167,139,250,0.22), rgba(124,58,237,0.16));
          border: 1px solid rgba(167,139,250,0.42); color: #d8b4fe;
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800;
          cursor: pointer; transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 0 28px rgba(167,139,250,0.1); letter-spacing: -0.2px;
        }
        .sp-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(167,139,250,0.32), rgba(124,58,237,0.24));
          border-color: rgba(167,139,250,0.68); transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(167,139,250,0.24);
        }
        .sp-btn:disabled { opacity: 0.52; cursor: not-allowed; transform: none; }
        .sp-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(216,180,254,0.28); border-top-color: #d8b4fe; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sp-error { padding: 10px 14px; background: rgba(248,113,113,0.07); border: 1px solid rgba(248,113,113,0.22); border-radius: 10px; font-size: 12.5px; color: #fca5a5; }

        /* Note */
        .sp-note {
          margin-top: 20px; padding: 13px 15px; border-radius: 12px;
          background: rgba(167,139,250,0.04); border: 1px solid rgba(167,139,250,0.1);
          font-size: 11.5px; color: rgba(180,215,240,0.26); line-height: 1.7; text-align: center;
        }
        .sp-note strong { color: rgba(196,181,253,0.48); font-weight: 700; }

        /* Success */
        .sp-success { text-align: center; padding: 44px 20px; animation: slideIn 0.4s cubic-bezier(0.16,1,0.3,1); }
        .sp-success-emoji { font-size: 64px; display: block; margin-bottom: 22px; animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .sp-success-title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 900; color: #f5f8ff; margin: 0 0 12px; letter-spacing: -0.5px; }
        .sp-success-sub { font-size: 14px; color: rgba(180,215,240,0.36); line-height: 1.75; margin: 0 0 6px; }
        .sp-success-email { font-size: 12px; color: rgba(167,139,250,0.45); margin: 0 0 30px; }
        .sp-success-back {
          padding: 12px 28px; border-radius: 12px; border: 1px solid rgba(167,139,250,0.32);
          background: rgba(167,139,250,0.07); color: #a78bfa;
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800; cursor: pointer;
          transition: all 0.22s ease; letter-spacing: -0.2px;
        }
        .sp-success-back:hover { background: rgba(167,139,250,0.14); border-color: rgba(167,139,250,0.55); }

        /* Benefits grid */
        .sp-benefits-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 52px;
        }
        @media (max-width: 860px) { .sp-benefits-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px)  { .sp-benefits-grid { grid-template-columns: 1fr 1fr; gap: 10px; } }

        .sp-benefit-card {
          background: rgba(255,255,255,0.022); border: 1px solid rgba(167,139,250,0.09);
          border-radius: 16px; padding: 18px 16px; cursor: default; position: relative; overflow: hidden;
          transition: border-color 0.3s, transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s;
        }
        .sp-benefit-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(167,139,250,0.3), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .sp-benefit-card:hover {
          transform: translateY(-3px); border-color: rgba(167,139,250,0.22);
          box-shadow: 0 8px 28px rgba(0,0,0,0.35), 0 0 20px rgba(167,139,250,0.06);
        }
        .sp-benefit-card:hover::before { opacity: 1; }
        .sp-benefit-card-icon {
          width: 38px; height: 38px; border-radius: 10px; margin-bottom: 12px;
          background: rgba(167,139,250,0.07); border: 1px solid rgba(167,139,250,0.11);
          display: flex; align-items: center; justify-content: center; font-size: 18px;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .sp-benefit-card:hover .sp-benefit-card-icon { transform: scale(1.15) rotate(-6deg); }
        .sp-benefit-card-name {
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 800;
          color: #f0f8ff; line-height: 1.2; margin-bottom: 6px;
        }
        .sp-benefit-card-desc { font-size: 11px; color: rgba(180,215,240,0.28); line-height: 1.6; }

        /* Social footer */
        .sp-social-footer {
          display: flex; align-items: center; justify-content: center; gap: 14px;
          padding: 28px 0 20px;
          border-top: 1px solid rgba(255,255,255,0.04);
          font-family: sans-serif; font-size: 12px; font-weight: 800;
        }
        .sp-social-label {
          font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
          color: rgba(180,215,240,0.15); margin-right: 4px;
          
        }
        .sp-social-link {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 15px; border-radius: 100px; text-decoration: none;
          border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03);
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, box-shadow 0.3s, background 0.3s;
        }
        .sp-social-link:hover { transform: translateY(-3px) scale(1.05); }
        .sp-social-link.ig { border-color: rgba(225,48,108,0.18); }
        .sp-social-link.ig:hover {
          border-color: rgba(225,48,108,0.48);
          background: rgba(225,48,108,0.06);
          box-shadow: 0 6px 22px rgba(225,48,108,0.16);
        }
        .sp-social-link.tt { border-color: rgba(105,201,208,0.18); }
        .sp-social-link.tt:hover {
          border-color: rgba(105,201,208,0.48);
          background: rgba(105,201,208,0.05);
          box-shadow: 0 6px 22px rgba(105,201,208,0.14);
        }
        .sp-social-svg {
          width: 20px; height: 20px; flex-shrink: 0;
          animation: socialBob 3s ease-in-out infinite;
        }
        .sp-social-link.tt .sp-social-svg { animation-delay: 0.6s; }
        @keyframes socialBob {
          0%,100% { transform: translateY(0) rotate(0deg); }
          40%      { transform: translateY(-3px) rotate(-5deg); }
          70%      { transform: translateY(-1px) rotate(3deg); }
        }
        .sp-social-handle {
          font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 800;
          color: rgba(240,248,255,0.45); letter-spacing: -0.2px; transition: color 0.3s;
        }
        .sp-social-link.ig:hover .sp-social-handle { color: rgba(225,48,108,0.9); }
        .sp-social-link.tt:hover .sp-social-handle { color: rgba(105,201,208,0.9); }
      `}</style>

      <div className="sp-aurora" />

      <div className="sp-root">
        <div className="sp-inner">

          {/* Header */}
          <div className="sp-header">
            <div className="sp-eyebrow">
              <span className="sp-eyebrow-dot" /> Creadores de contenido
            </div>
            <h1 className="sp-title">
              Convertite en<br /><span className="pur">Streamer</span> Turrinder
            </h1>
            <p className="sp-sub">
              Crecé como creador con el respaldo de la plataforma. Te impulsamos a vos,
              vos nos impulsás a nosotros. Un negocio redondo.
            </p>
          </div>

          {/* ── FORM PRIMERO ── */}
          <div className="sp-section-label">
            <span className="sp-section-label-text">Postulate</span>
            <div className="sp-section-label-line" />
          </div>
          <div className="sp-form-wrap">
            <div className="sp-form-card">
              {sent ? (
                <div className="sp-success">
                  <span className="sp-success-emoji">🚀</span>
                  <h2 className="sp-success-title">¡Aplicación enviada!</h2>
                  <p className="sp-success-sub">
                    Recibimos tu postulación y la vamos a revisar personalmente.
                    Si encajás con lo que buscamos, te contactamos pronto.
                  </p>
                  <p className="sp-success-email">📩 Respuesta a {form.email}</p>
                  <button className="sp-success-back" onClick={() => { setSent(false); setForm(EMPTY); setStep(1); setTouched({}); }}>
                    Volver al formulario
                  </button>
                </div>
              ) : (
                <>
                  {/* Stepper */}
                  <div className="sp-stepper">
                    {STEPS.map((s, idx) => {
                      const isDone   = step > s.id;
                      const isActive = step === s.id;
                      return (
                        <div key={s.id} className="sp-step-wrap" style={{ flex: idx < STEPS.length - 1 ? 1 : "0 0 auto" }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <div className="sp-step-circle" style={
                              isActive ? { background: "linear-gradient(135deg,rgba(167,139,250,0.28),rgba(124,58,237,0.2))", borderColor: "rgba(167,139,250,0.65)", color: "#e9d5ff", boxShadow: "0 0 22px rgba(167,139,250,0.32)", transform: "scale(1.1)" }
                              : isDone  ? { background: "rgba(167,139,250,0.14)", borderColor: "rgba(167,139,250,0.38)", color: "#c4b5fd", boxShadow: "0 0 14px rgba(167,139,250,0.18)" }
                              : {}
                            }>
                              {isDone ? "✓" : s.icon}
                            </div>
                            <span className="sp-step-label" style={
                              isActive ? { color: "rgba(196,181,253,0.65)" }
                              : isDone  ? { color: "rgba(167,139,250,0.45)" }
                              : {}
                            }>{s.label}</span>
                          </div>
                          {idx < STEPS.length - 1 && (
                            <div className="sp-step-connector">
                              {isDone && <span style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(167,139,250,0.45),rgba(124,58,237,0.2))" }} />}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress */}
                  <div className="sp-progress">
                    <div className="sp-progress-bar" style={{ width: `${((step - 1) / 2) * 100}%` }} />
                  </div>

                  {/* Paso 1 */}
                  {step === 1 && (
                    <div className="sp-step-body">
                      <h2 className="sp-step-title">Contanos quién sos</h2>
                      <p className="sp-step-sub">Tus datos básicos para que podamos identificarte. <span className="sp-req">*</span> obligatorio.</p>
                      <div className="sp-fields">
                        <div className="sp-row">
                          <div className="sp-field">
                            <label className="sp-label">Nombre completo <span className="sp-req">*</span></label>
                            <div className="sp-field-wrap">
                              <span className="sp-field-icon">👤</span>
                              <input className={`sp-input ${fieldErr("nombre") ? "err" : ""}`} placeholder="Tu nombre" value={form.nombre} onChange={set("nombre")} onBlur={() => touch("nombre")} />
                            </div>
                            {fieldErr("nombre") && <span className="sp-field-hint">Ingresá tu nombre</span>}
                          </div>
                          <div className="sp-field">
                            <label className="sp-label">Usuario / Alias <span className="sp-req">*</span></label>
                            <div className="sp-field-wrap">
                              <span className="sp-field-icon">🎮</span>
                              <input className={`sp-input ${fieldErr("usuario") ? "err" : ""}`} placeholder="@tunick" value={form.usuario} onChange={set("usuario")} onBlur={() => touch("usuario")} />
                            </div>
                            {fieldErr("usuario") && <span className="sp-field-hint">Ingresá tu alias</span>}
                          </div>
                        </div>
                        <div className="sp-field">
                          <label className="sp-label">Email de contacto <span className="sp-req">*</span></label>
                          <div className="sp-field-wrap">
                            <span className="sp-field-icon">📧</span>
                            <input className={`sp-input ${fieldErr("email") ? "err" : ""}`} type="email" placeholder="vos@email.com" value={form.email} onChange={set("email")} onBlur={() => touch("email")} />
                          </div>
                          {fieldErr("email") && <span className="sp-field-hint">Ingresá tu email</span>}
                        </div>
                        {error && <div className="sp-error">⚠️ {error}</div>}
                        <div className="sp-form-nav">
                          <button className="sp-btn" onClick={nextStep}>Siguiente → Mi canal</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Paso 2 */}
                  {step === 2 && (
                    <div className="sp-step-body">
                      <h2 className="sp-step-title">Tu canal y contenido</h2>
                      <p className="sp-step-sub">Contanos dónde vivís como creador. <span className="sp-req">*</span> obligatorio.</p>
                      <div className="sp-fields">
                        <div className="sp-row">
                          <div className="sp-field">
                            <label className="sp-label">Categoría principal <span className="sp-req">*</span></label>
                            <div className="sp-field-wrap">
                              <span className="sp-field-icon">🏷</span>
                              <select className={`sp-select ${fieldErr("categoria") ? "err" : ""}`} value={form.categoria} onChange={set("categoria")}>
                                <option value="">Seleccioná...</option>
                                {CATS.map(c => <option key={c}>{c}</option>)}
                              </select>
                            </div>
                            {fieldErr("categoria") && <span className="sp-field-hint">Elegí una categoría</span>}
                          </div>
                          <div className="sp-field">
                            <label className="sp-label">Plataforma <span className="sp-req">*</span></label>
                            <div className="sp-field-wrap">
                              <span className="sp-field-icon">📡</span>
                              <select className={`sp-select ${fieldErr("plataforma") ? "err" : ""}`} value={form.plataforma} onChange={set("plataforma")}>
                                <option value="">Seleccioná...</option>
                                {PLATAFORMAS.map(p => <option key={p}>{p}</option>)}
                              </select>
                            </div>
                            {fieldErr("plataforma") && <span className="sp-field-hint">Elegí tu plataforma</span>}
                          </div>
                        </div>
                        <div className="sp-row">
                          <div className="sp-field">
                            <label className="sp-label">Seguidores aprox.</label>
                            <div className="sp-field-wrap">
                              <span className="sp-field-icon">👥</span>
                              <select className="sp-select" value={form.seguidores} onChange={set("seguidores")}>
                                <option value="">Seleccioná...</option>
                                {FOLLOWER_OPT.map(o => <option key={o}>{o}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="sp-field">
                            <label className="sp-label">Frecuencia de streams</label>
                            <div className="sp-field-wrap">
                              <span className="sp-field-icon">📅</span>
                              <select className="sp-select" value={form.frecuencia} onChange={set("frecuencia")}>
                                <option value="">Seleccioná...</option>
                                {FREQ_OPT.map(o => <option key={o}>{o}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="sp-field">
                          <label className="sp-label">Link de tu canal</label>
                          <div className="sp-field-wrap">
                            <span className="sp-field-icon">🔗</span>
                            <input className="sp-input" placeholder="twitch.tv/tunick · youtube.com/@tunick" value={form.link} onChange={set("link")} />
                          </div>
                        </div>
                        {error && <div className="sp-error">⚠️ {error}</div>}
                        <div className="sp-form-nav">
                          <button className="sp-btn-back" onClick={() => { setStep(1); setError(null); }}>← Atrás</button>
                          <button className="sp-btn" onClick={nextStep}>Siguiente → Mi historia</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Paso 3 */}
                  {step === 3 && (
                    <div className="sp-step-body">
                      <h2 className="sp-step-title">Tu historia como creador</h2>
                      <p className="sp-step-sub">Convencenos. ¿Por qué Turrinder es el lugar donde querés crecer?</p>
                      <div className="sp-fields">
                        <div className="sp-field">
                          <label className="sp-label">Contanos sobre vos <span className="sp-req">*</span></label>
                          <textarea
                            className={`sp-textarea ${fieldErr("bio") ? "err" : ""}`}
                            placeholder={`Ej: "Hago gaming y entretenimiento en Twitch hace 2 años. Me especializo en debates en vivo y clips virales. Quiero sumarme a Turrinder para crecer junto a una plataforma que apueste a los creadores..."`}
                            value={form.bio}
                            onChange={set("bio")}
                            onBlur={() => touch("bio")}
                            maxLength={600}
                          />
                          <div className={`sp-char ${form.bio.length > 500 ? "warn" : ""}`}>{form.bio.length} / 600</div>
                          {fieldErr("bio") && <span className="sp-field-hint">Escribí algo sobre vos</span>}
                        </div>
                        {error && <div className="sp-error">⚠️ {error}</div>}
                        <div className="sp-form-nav">
                          <button className="sp-btn-back" onClick={() => { setStep(2); setError(null); }}>← Atrás</button>
                          <button className="sp-btn" onClick={submit} disabled={sending}>
                            {sending ? <><span className="sp-spinner" />Enviando...</> : "🚀 Enviar aplicación"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="sp-note">
                    Revisamos cada aplicación <strong>manualmente</strong>.<br />
                    Te respondemos en menos de 72hs al email que nos dejaste.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── BENEFITS DESPUÉS ── */}
          <div className="sp-section-label">
            <span className="sp-section-label-text">¿Qué obtenés?</span>
            <div className="sp-section-label-line" />
          </div>
          <div className="sp-benefits-grid">
            {BENEFITS.map((b, i) => (
              <div key={i} className="sp-benefit-card">
                <div className="sp-benefit-card-icon">{b.icon}</div>
                <div className="sp-benefit-card-name">{b.title}</div>
                <div className="sp-benefit-card-desc">{b.desc}</div>
              </div>
            ))}
          </div>

          {/* ── SOCIAL FOOTER ── */}
          <div className="sp-social-footer">
            <span className="sp-social-label">Seguinos</span>

            {/* Instagram */}
            <a href="https://instagram.com/turrinder" target="_blank" rel="noopener noreferrer" className="sp-social-link ig">
              <svg className="sp-social-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#f09433"/>
                    <stop offset="25%"  stopColor="#e6683c"/>
                    <stop offset="50%"  stopColor="#dc2743"/>
                    <stop offset="75%"  stopColor="#cc2366"/>
                    <stop offset="100%" stopColor="#bc1888"/>
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#ig-grad)" strokeWidth="1.8" fill="none"/>
                <circle cx="12" cy="12" r="4.5" stroke="url(#ig-grad)" strokeWidth="1.8" fill="none"/>
                <circle cx="17.5" cy="6.5" r="1" fill="url(#ig-grad)"/>
              </svg>
              <span className="sp-social-handle">@turrinder</span>
            </a>

            {/* TikTok */}
            <a href="https://tiktok.com/@turrinder" target="_blank" rel="noopener noreferrer" className="sp-social-link tt">
              <svg className="sp-social-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* shadow layer (red) */}
                <path
                  d="M17.5 3h-2.1a4.9 4.9 0 0 1-4.9 4.9V13a2.6 2.6 0 1 1-2.6-2.6V8.3a4.7 4.7 0 1 0 4.7 4.7V7.8a6.8 6.8 0 0 0 4.9 2V7.7A4.9 4.9 0 0 1 14.6 6V3h2.9z"
                  stroke="#EE1D52" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"
                  style={{ transform: "translate(1.5px, 1px)", opacity: 0.5 }}
                />
                {/* main layer (cyan) */}
                <path
                  d="M17.5 3h-2.1a4.9 4.9 0 0 1-4.9 4.9V13a2.6 2.6 0 1 1-2.6-2.6V8.3a4.7 4.7 0 1 0 4.7 4.7V7.8a6.8 6.8 0 0 0 4.9 2V7.7A4.9 4.9 0 0 1 14.6 6V3h2.9z"
                  stroke="#69C9D0" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"
                />
              </svg>
              <span className="sp-social-handle">@turrinder</span>
            </a>
          </div>

        </div>
      </div>
    </>
  );
}