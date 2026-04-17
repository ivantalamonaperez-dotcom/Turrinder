"use client";

import { useState, useRef, useEffect } from "react";
// import { supabase } from "@/services/supabase.client";
// import { useRouter } from "next/navigation";

// ── Datos de opciones ──────────────────────────────────────
const INTERESTS = [
  "🎵 Música", "🎮 Gaming", "✈️ Viajes", "📚 Libros", "🎬 Cine",
  "🏋️ Fitness", "🍕 Gastronomía", "🎨 Arte", "📸 Fotografía", "🌿 Naturaleza",
  "💻 Tecnología", "🎭 Teatro", "🏄 Surf", "🐕 Mascotas", "🧘 Yoga",
  "🎸 Guitarra", "⚽ Fútbol", "🏀 Básquet", "🎤 Karaoke", "🎲 Juegos de mesa",
];

const LOOKING_FOR = [
  { id: "friends", label: "Amigos",     emoji: "👋", desc: "Conectar sin presiones" },
  { id: "dates",   label: "Citas",      emoji: "❤️", desc: "Conocer a alguien especial" },
  { id: "chat",    label: "Charlar",    emoji: "💬", desc: "Conversaciones genuinas" },
  { id: "network", label: "Networking", emoji: "🤝", desc: "Crecer juntos" },
];

const STEPS = [
  { id: "account",  label: "Cuenta",    emoji: "🔐", num: "01", desc: "Tu email y contraseña" },
  { id: "identity", label: "Identidad", emoji: "✨", num: "02", desc: "Nombre, edad, bio" },
  { id: "photos",   label: "Fotos",     emoji: "📸", num: "03", desc: "Subí hasta 4 fotos" },
  { id: "vibe",     label: "Vibe",      emoji: "🔥", num: "04", desc: "Intereses y objetivos" },
];

type Photo = { file: File; url: string };

export default function RegisterPage() {
  // const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId]   = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Step 0
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [passConf, setPassConf]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [showPassConf, setShowPassConf] = useState(false);

  // Step 1
  const [name, setName]   = useState("");
  const [age, setAge]     = useState("");
  const [bio, setBio]     = useState("");
  const [gender, setGender] = useState("");

  // Step 2
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Step 3
  const [interests, setInterests]   = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  // ── Handlers ────────────────────────────────────────────
  const handleCreateAccount = async () => {
    if (!email || !password) return alert("Completá email y contraseña");
    if (password !== passConf) return alert("Las contraseñas no coinciden");
    if (password.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");
    setLoading(true);
    // const { data, error } = await supabase.auth.signUp({ email, password });
    // if (error) { alert(error.message); setLoading(false); return; }
    // setUserId(data.user?.id || null);
    setTimeout(() => { setLoading(false); setStep(1); }, 800);
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - photos.length;
    const toAdd = files.slice(0, remaining);
    const newPhotos: Photo[] = toAdd.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const toggleInterest = (item: string) => {
    setInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : prev.length < 8 ? [...prev, item] : prev
    );
  };

  const toggleLookingFor = (id: string) => {
    setLookingFor(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleFinish = async () => {
    if (!name.trim()) return alert("Agregá tu nombre");
    if (!age || parseInt(age) < 18) return alert("Debés tener al menos 18 años");
    if (photos.length === 0) return alert("Agregá al menos una foto");
    setLoading(true);
    setTimeout(() => { setLoading(false); alert("¡Perfil creado con éxito! 🎉"); }, 1200);
    // router.push("/discover");
  };

  const passwordStrength = (p: string) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = passwordStrength(password);
  const strengthLabel = ["", "Débil", "Regular", "Buena", "Fuerte", "Muy fuerte"][strength];
  const strengthColor = ["", "#ff4466", "#ff8800", "#f5c518", "#44cc88", "#00e676"][strength];

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Syne:wght@700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --red:     #E8294A;
          --red-2:   #FF5E6C;
          --red-3:   #FF8A96;
          --orange:  #FF7A3D;
          --amber:   #FFB347;
          --bg:      #0F0D15;
          --bg-2:    #160F1E;
          --card:    rgba(255,255,255,0.055);
          --card-h:  rgba(255,255,255,0.09);
          --border:  rgba(255,255,255,0.09);
          --border-f:rgba(232,41,74,0.55);
          --text:    #F0EEF7;
          --muted:   rgba(240,238,247,0.45);
          --faint:   rgba(240,238,247,0.18);
          --display: 'Syne', sans-serif;
          --body:    'Plus Jakarta Sans', sans-serif;
          --r-sm:    10px;
          --r-md:    14px;
          --r-lg:    18px;
          --r-xl:    24px;
        }

        html, body { height: 100%; }

        .rg-root {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          font-family: var(--body);
          color: var(--text);
          position: relative;
          overflow-x: hidden;
        }

        /* Ambient background blobs */
        .rg-ambient {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .rg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.18;
        }
        .rg-blob-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #E8294A, transparent 70%);
          top: -200px; left: -180px;
          animation: floatBlob1 14s ease-in-out infinite alternate;
        }
        .rg-blob-2 {
          width: 450px; height: 450px;
          background: radial-gradient(circle, #FF7A3D, transparent 70%);
          bottom: -120px; right: -100px;
          opacity: 0.12;
          animation: floatBlob2 18s ease-in-out infinite alternate;
        }
        .rg-blob-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #a855f7, transparent 70%);
          top: 50%; right: 10%;
          opacity: 0.07;
          animation: floatBlob3 22s ease-in-out infinite alternate;
        }
        @keyframes floatBlob1 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(60px, 80px) scale(1.12); }
        }
        @keyframes floatBlob2 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(-50px, -60px) scale(1.1); }
        }
        @keyframes floatBlob3 {
          from { transform: translate(0,0); }
          to   { transform: translate(30px, -80px); }
        }

        /* ── SIDEBAR ── */
        .rg-sidebar {
          display: none;
          width: 320px;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 44px 36px;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid var(--border);
          background: rgba(232,41,74,0.025);
          z-index: 1;
          overflow: hidden;
        }
        @media (min-width: 900px) { .rg-sidebar { display: flex; } }

        .rg-sidebar-shine {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(232,41,74,0.5), transparent);
        }

        /* Brand */
        .rg-brand-logo {
          font-family: var(--display);
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 36px;
        }
        .rg-logo-mark {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--red), var(--orange));
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          box-shadow: 0 4px 16px rgba(232,41,74,0.45);
        }

        .rg-tagline {
          font-family: var(--display);
          font-size: 28px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.8px;
          color: white;
          margin-bottom: 10px;
        }
        .rg-tagline-grad {
          background: linear-gradient(135deg, var(--red-2), var(--orange), var(--amber));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .rg-brand-sub {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.75;
          font-weight: 400;
        }

        /* Steps list */
        .rg-sidebar-steps {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .rg-ss-step {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 13px;
          border-radius: var(--r-md);
          transition: background 0.25s;
          position: relative;
        }
        .rg-ss-step.active { background: rgba(232,41,74,0.1); }
        .rg-ss-connector {
          position: absolute;
          left: 25px;
          top: 42px;
          width: 1px;
          height: 18px;
          background: var(--border);
        }
        .rg-ss-num {
          width: 32px; height: 32px;
          border-radius: 9px;
          border: 1.5px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: var(--faint);
          transition: all 0.3s;
          flex-shrink: 0;
          font-family: var(--display);
        }
        .rg-ss-step.done .rg-ss-num {
          background: linear-gradient(135deg, var(--red), var(--orange));
          border-color: transparent;
          color: white;
          box-shadow: 0 2px 12px rgba(232,41,74,0.4);
        }
        .rg-ss-step.active .rg-ss-num {
          border-color: var(--red);
          color: var(--red-2);
          box-shadow: 0 0 0 3px rgba(232,41,74,0.12);
        }
        .rg-ss-info { flex: 1; }
        .rg-ss-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--faint);
          transition: color 0.25s;
          line-height: 1.3;
        }
        .rg-ss-step.active .rg-ss-label,
        .rg-ss-step.done  .rg-ss-label { color: white; }
        .rg-ss-desc {
          font-size: 11px;
          color: var(--faint);
          margin-top: 1px;
        }
        .rg-ss-step.active .rg-ss-desc { color: rgba(255,94,108,0.6); }
        .rg-ss-check {
          font-size: 12px;
          color: var(--red-2);
          opacity: 0;
          transition: opacity 0.25s;
        }
        .rg-ss-step.done .rg-ss-check { opacity: 1; }

        /* Sidebar footer */
        .rg-live-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 13px;
          background: rgba(232,41,74,0.1);
          border: 1px solid rgba(232,41,74,0.25);
          border-radius: 100px;
          font-size: 11.5px;
          color: var(--red-3);
          font-weight: 600;
          margin-bottom: 16px;
        }
        .rg-live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--red);
          box-shadow: 0 0 0 0 rgba(232,41,74,0.5);
          animation: livePulse 2s infinite;
        }
        @keyframes livePulse {
          0%   { box-shadow: 0 0 0 0 rgba(232,41,74,0.5); }
          70%  { box-shadow: 0 0 0 8px rgba(232,41,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(232,41,74,0); }
        }
        .rg-stats {
          display: flex;
          gap: 24px;
        }
        .rg-stat { display: flex; flex-direction: column; gap: 2px; }
        .rg-stat-num {
          font-family: var(--display);
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }
        .rg-stat-label { font-size: 11px; color: var(--muted); }

        /* ── MAIN ── */
        .rg-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: relative;
          z-index: 1;
        }

        /* Mobile header */
        .rg-mob-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(15,13,21,0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--border);
          padding: 14px 20px 12px;
        }
        @media (min-width: 900px) { .rg-mob-header { display: none; } }
        .rg-mob-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .rg-mob-logo {
          font-family: var(--display);
          font-size: 18px;
          font-weight: 800;
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rg-mob-logo-mark {
          width: 26px; height: 26px;
          border-radius: 7px;
          background: linear-gradient(135deg, var(--red), var(--orange));
          display: flex; align-items: center; justify-content: center;
          font-size: 12px;
        }
        .rg-mob-step {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--muted);
          font-weight: 500;
        }
        .rg-mob-step-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--red);
        }
        .rg-mob-bar-track {
          height: 3px;
          background: rgba(255,255,255,0.07);
          border-radius: 100px;
          overflow: hidden;
        }
        .rg-mob-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--red), var(--orange));
          border-radius: 100px;
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
        }

        /* ── Content ── */
        .rg-content {
          flex: 1;
          padding: 48px 28px 72px;
          max-width: 500px;
          width: 100%;
          margin: 0 auto;
        }

        @media (min-width: 600px) {
          .rg-content { padding: 56px 40px 72px; }
        }

        .rg-slide-in {
          animation: slideIn 0.4s cubic-bezier(0.34,1.4,0.64,1) both;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(22px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Hero */
        .rg-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 11px;
          background: rgba(232,41,74,0.1);
          border: 1px solid rgba(232,41,74,0.2);
          border-radius: 100px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--red-3);
          margin-bottom: 14px;
        }
        .rg-title {
          font-family: var(--display);
          font-size: 36px;
          font-weight: 800;
          color: white;
          letter-spacing: -1.2px;
          line-height: 1.05;
          margin-bottom: 10px;
        }
        .rg-subtitle {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.75;
          max-width: 380px;
          font-weight: 400;
          margin-bottom: 36px;
        }

        /* Fields */
        .rg-fields {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-bottom: 28px;
        }

        .rg-field { display: flex; flex-direction: column; gap: 7px; }

        .rg-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.9px;
          text-transform: uppercase;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rg-req { color: var(--red-2); font-size: 12px; }
        .rg-opt {
          font-size: 9px;
          letter-spacing: 1px;
          color: var(--faint);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 5px;
          padding: 1px 6px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .rg-input-wrap { position: relative; }
        .rg-input {
          width: 100%;
          background: var(--card);
          border: 1.5px solid var(--border);
          border-radius: var(--r-md);
          padding: 13px 16px;
          font-size: 14.5px;
          color: white;
          font-family: var(--body);
          font-weight: 400;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          -webkit-appearance: none;
          line-height: 1.5;
        }
        .rg-input::placeholder { color: var(--faint); font-size: 13.5px; }
        .rg-input:focus {
          border-color: var(--border-f);
          background: rgba(232,41,74,0.04);
          box-shadow: 0 0 0 4px rgba(232,41,74,0.09), inset 0 1px 2px rgba(0,0,0,0.2);
        }
        .rg-input.has-icon { padding-right: 48px; }
        textarea.rg-input { resize: none; }

        .rg-icon-btn {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          font-size: 16px;
          padding: 4px;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.15s;
        }
        .rg-icon-btn:hover { color: white; }

        .rg-char-hint {
          text-align: right;
          font-size: 11px;
          color: var(--faint);
          margin-top: -3px;
        }

        /* Password strength */
        .rg-strength {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 4px;
        }
        .rg-strength-bars { display: flex; gap: 4px; flex: 1; }
        .rg-strength-bar {
          flex: 1; height: 3px;
          border-radius: 100px;
          background: rgba(255,255,255,0.07);
          transition: background 0.35s;
        }
        .rg-strength-label {
          font-size: 11px;
          font-weight: 600;
          min-width: 64px;
          text-align: right;
        }
        .rg-hint {
          font-size: 11px;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }

        /* Row layout */
        .rg-row {
          display: grid;
          grid-template-columns: 1fr 88px;
          gap: 12px;
          align-items: start;
        }

        /* Gender */
        .rg-gender-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        @media (max-width: 480px) {
          .rg-gender-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .rg-gpill {
          padding: 10px 6px;
          background: var(--card);
          border: 1.5px solid var(--border);
          border-radius: var(--r-sm);
          color: var(--muted);
          font-family: var(--body);
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }
        .rg-gpill:hover {
          background: var(--card-h);
          border-color: rgba(255,255,255,0.15);
          color: white;
        }
        .rg-gpill.active {
          background: rgba(232,41,74,0.12);
          border-color: rgba(232,41,74,0.5);
          color: var(--red-2);
        }

        /* ── Photo Grid ── */
        .rg-photo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .rg-photo-slot {
          aspect-ratio: 3/4;
          border-radius: var(--r-lg);
          overflow: hidden;
          position: relative;
          background: var(--card);
          border: 1.5px dashed rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .rg-photo-slot:hover {
          border-color: rgba(232,41,74,0.4);
          background: rgba(232,41,74,0.05);
        }
        .rg-photo-slot.filled {
          border-style: solid;
          border-color: rgba(255,255,255,0.1);
          cursor: default;
        }
        .rg-photo-slot img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }
        .rg-photo-add-icon { font-size: 28px; opacity: 0.3; }
        .rg-photo-add-txt {
          font-size: 11px;
          color: var(--faint);
          text-align: center;
          line-height: 1.5;
          padding: 0 10px;
          font-weight: 500;
        }
        .rg-photo-badge {
          position: absolute;
          bottom: 8px; left: 8px; right: 8px;
          background: linear-gradient(135deg, rgba(232,41,74,0.92), rgba(255,90,100,0.92));
          backdrop-filter: blur(10px);
          color: white;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          padding: 5px 10px;
          border-radius: 8px;
          text-align: center;
          z-index: 2;
        }
        .rg-photo-del {
          position: absolute;
          top: 8px; right: 8px;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.12);
          color: white;
          font-size: 12px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          z-index: 2;
          transition: background 0.15s;
        }
        .rg-photo-del:hover { background: rgba(232,41,74,0.85); }
        .rg-photo-num {
          position: absolute;
          top: 8px; left: 8px;
          width: 24px; height: 24px;
          border-radius: 7px;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.75);
          font-size: 10px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          z-index: 2;
        }
        .rg-photo-tip {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(255,183,71,0.06);
          border: 1px solid rgba(255,183,71,0.15);
          border-radius: var(--r-sm);
          margin-bottom: 28px;
        }
        .rg-photo-tip-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
        .rg-photo-tip-txt {
          font-size: 12px;
          color: rgba(255,210,130,0.65);
          line-height: 1.6;
          font-weight: 500;
        }

        /* ── Vibe / Interests ── */
        .rg-section-hd {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .rg-section-ttl {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--muted);
        }
        .rg-section-ct {
          font-size: 12px;
          color: var(--red-2);
          font-weight: 600;
        }

        .rg-lf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 28px;
        }
        .rg-lf-card {
          padding: 18px 15px;
          background: var(--card);
          border: 1.5px solid var(--border);
          border-radius: var(--r-lg);
          cursor: pointer;
          transition: all 0.22s;
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
          position: relative;
          overflow: hidden;
        }
        .rg-lf-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(232,41,74,0.08), transparent 60%);
          opacity: 0;
          transition: opacity 0.22s;
          pointer-events: none;
        }
        .rg-lf-card:hover { border-color: rgba(232,41,74,0.3); }
        .rg-lf-card:hover::after { opacity: 1; }
        .rg-lf-card.active {
          background: rgba(232,41,74,0.09);
          border-color: rgba(232,41,74,0.5);
        }
        .rg-lf-card.active::after { opacity: 1; }
        .rg-lf-emoji { font-size: 24px; margin-bottom: 3px; }
        .rg-lf-label {
          font-family: var(--display);
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          transition: color 0.2s;
        }
        .rg-lf-card.active .rg-lf-label { color: white; }
        .rg-lf-desc {
          font-size: 11.5px;
          color: var(--faint);
          line-height: 1.4;
          transition: color 0.2s;
          font-weight: 400;
        }
        .rg-lf-card.active .rg-lf-desc { color: rgba(255,110,120,0.65); }
        .rg-lf-check {
          position: absolute;
          top: 11px; right: 11px;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--red), var(--orange));
          display: flex; align-items: center; justify-content: center;
          font-size: 10px;
          color: white;
          opacity: 0;
          transform: scale(0.4) rotate(-45deg);
          transition: all 0.28s cubic-bezier(0.34,1.4,0.64,1);
          box-shadow: 0 2px 10px rgba(232,41,74,0.5);
        }
        .rg-lf-card.active .rg-lf-check {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }

        .rg-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 6px 0 24px;
        }
        .rg-divider-line { flex: 1; height: 1px; background: var(--border); }
        .rg-divider-txt {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: var(--faint);
          text-transform: uppercase;
        }

        .rg-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 32px;
        }
        .rg-tag {
          padding: 7px 13px;
          background: var(--card);
          border: 1.5px solid var(--border);
          border-radius: 100px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s;
          font-family: var(--body);
          white-space: nowrap;
        }
        .rg-tag:hover {
          background: var(--card-h);
          border-color: rgba(232,41,74,0.3);
          color: rgba(255,255,255,0.85);
        }
        .rg-tag.active {
          background: rgba(232,41,74,0.12);
          border-color: rgba(232,41,74,0.5);
          color: var(--red-2);
          font-weight: 600;
        }

        /* ── Actions ── */
        .rg-actions { display: flex; flex-direction: column; gap: 10px; }

        .rg-btn {
          width: 100%;
          padding: 15px 24px;
          background: linear-gradient(135deg, #E8294A 0%, #c91c3a 55%, #aa1530 100%);
          border: none;
          border-radius: var(--r-md);
          color: white;
          font-family: var(--display);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.2px;
          cursor: pointer;
          transition: all 0.22s;
          box-shadow: 0 6px 28px rgba(232,41,74,0.38), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }
        .rg-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transition: left 0.5s;
        }
        .rg-btn:hover::before { left: 100%; }
        .rg-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(232,41,74,0.5), 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .rg-btn:active { transform: translateY(0); }
        .rg-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
          box-shadow: 0 2px 8px rgba(232,41,74,0.15);
        }

        .rg-btn-ghost {
          width: 100%;
          padding: 13px 24px;
          background: transparent;
          border: 1.5px solid var(--border);
          border-radius: var(--r-md);
          color: var(--muted);
          font-family: var(--body);
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .rg-btn-ghost:hover {
          background: var(--card-h);
          color: rgba(255,255,255,0.7);
          border-color: rgba(255,255,255,0.14);
        }

        .rg-login-cta {
          text-align: center;
          font-size: 13px;
          color: var(--faint);
          padding-top: 4px;
        }
        .rg-login-cta a {
          color: var(--red-2);
          text-decoration: none;
          font-weight: 600;
          cursor: pointer;
        }
        .rg-login-cta a:hover { text-decoration: underline; }

        .rg-terms {
          text-align: center;
          font-size: 11.5px;
          color: rgba(255,255,255,0.2);
          line-height: 1.65;
          margin-top: 18px;
        }
        .rg-terms a {
          color: rgba(255,255,255,0.38);
          text-decoration: underline;
          text-underline-offset: 2px;
          cursor: pointer;
        }
        .rg-terms a:hover { color: var(--red-2); }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 100px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(232,41,74,0.4); }

        /* Number input arrow hide */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div className="rg-root">

        {/* Ambient blobs */}
        <div className="rg-ambient">
          <div className="rg-blob rg-blob-1" />
          <div className="rg-blob rg-blob-2" />
          <div className="rg-blob rg-blob-3" />
        </div>

        {/* ── Sidebar ── */}
        <aside className="rg-sidebar">
          <div className="rg-sidebar-shine" />

          {/* Brand */}
          <div>
            <div className="rg-brand-logo">
              <div className="rg-logo-mark">📡</div>
              Turrinder
            </div>
            <div className="rg-tagline">
              Conocé gente<br />
              <span className="rg-tagline-grad">en tiempo real.</span>
            </div>
            <p className="rg-brand-sub" style={{ marginBottom: 0 }}>
              La red social que combina el matching de Tinder con la espontaneidad de OmeTV. Charlá en vivo con personas reales cerca tuyo.
            </p>
          </div>

          {/* Steps */}
          <div className="rg-sidebar-steps">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`rg-ss-step ${i < step ? "done" : i === step ? "active" : ""}`}
                style={{ position: "relative" }}
              >
                {i < STEPS.length - 1 && <div className="rg-ss-connector" />}
                <div className="rg-ss-num">{i < step ? "✓" : s.num}</div>
                <div className="rg-ss-info">
                  <div className="rg-ss-label">{s.emoji} {s.label}</div>
                  <div className="rg-ss-desc">{s.desc}</div>
                </div>
                <div className="rg-ss-check">✓</div>
              </div>
            ))}
          </div>

          {/* Footer stats */}
          <div>
            <div className="rg-live-pill">
              <div className="rg-live-dot" />
              En línea ahora
            </div>
            <div className="rg-stats">
              <div className="rg-stat">
                <span className="rg-stat-num">12.4k</span>
                <span className="rg-stat-label">En vivo</span>
              </div>
              <div className="rg-stat">
                <span className="rg-stat-num">4.8★</span>
                <span className="rg-stat-label">Rating</span>
              </div>
              <div className="rg-stat">
                <span className="rg-stat-num">98%</span>
                <span className="rg-stat-label">Reales</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="rg-main">

          {/* Mobile header */}
          <div className="rg-mob-header">
            <div className="rg-mob-top">
              <div className="rg-mob-logo">
                <div className="rg-mob-logo-mark">📡</div>
                Turrinder
              </div>
              <div className="rg-mob-step">
                <div className="rg-mob-step-dot" />
                {STEPS[step].emoji} {STEPS[step].label} · {step + 1}/{STEPS.length}
              </div>
            </div>
            <div className="rg-mob-bar-track">
              <div className="rg-mob-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* ── STEP 0: Cuenta ── */}
          {step === 0 && (
            <div className="rg-content rg-slide-in" key="s0">
              <div className="rg-eyebrow">🔐 Paso 01</div>
              <div className="rg-title">Creá tu cuenta</div>
              <p className="rg-subtitle">Tu email y contraseña para entrar a Turrinder. En segundos, sin complicaciones.</p>

              <div className="rg-fields">
                <div className="rg-field">
                  <label className="rg-label">Email <span className="rg-req">*</span></label>
                  <input
                    className="rg-input"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="rg-field">
                  <label className="rg-label">Contraseña <span className="rg-req">*</span></label>
                  <div className="rg-input-wrap">
                    <input
                      className="rg-input has-icon"
                      type={showPass ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button className="rg-icon-btn" onClick={() => setShowPass(p => !p)} type="button" tabIndex={-1}>
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="rg-strength">
                      <div className="rg-strength-bars">
                        {[1,2,3,4,5].map(i => (
                          <div
                            key={i}
                            className="rg-strength-bar"
                            style={{ background: i <= strength ? strengthColor : undefined }}
                          />
                        ))}
                      </div>
                      <div className="rg-strength-label" style={{ color: strengthColor }}>
                        {strengthLabel}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rg-field">
                  <label className="rg-label">Confirmar contraseña <span className="rg-req">*</span></label>
                  <div className="rg-input-wrap">
                    <input
                      className="rg-input has-icon"
                      type={showPassConf ? "text" : "password"}
                      placeholder="Repetí tu contraseña"
                      value={passConf}
                      onChange={e => setPassConf(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCreateAccount()}
                      autoComplete="new-password"
                    />
                    <button className="rg-icon-btn" onClick={() => setShowPassConf(p => !p)} type="button" tabIndex={-1}>
                      {showPassConf ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {passConf.length > 0 && (
                    <div className="rg-hint" style={{ color: password === passConf ? "#44cc88" : "#ff5566" }}>
                      {password === passConf ? "✓ Coinciden" : "✕ No coinciden"}
                    </div>
                  )}
                </div>
              </div>

              <div className="rg-actions">
                <button className="rg-btn" onClick={handleCreateAccount} disabled={loading}>
                  {loading ? "Creando cuenta..." : <><span>Continuar</span><span>→</span></>}
                </button>
                <div className="rg-login-cta">
                  ¿Ya tenés cuenta? <a>Iniciá sesión</a>
                </div>
              </div>

              <p className="rg-terms">
                Al registrarte aceptás nuestros <a>Términos de uso</a> y <a>Política de privacidad</a>. Debés tener 18 años o más.
              </p>
            </div>
          )}

          {/* ── STEP 1: Identidad ── */}
          {step === 1 && (
            <div className="rg-content rg-slide-in" key="s1">
              <div className="rg-eyebrow">✨ Paso 02</div>
              <div className="rg-title">¿Quién sos?</div>
              <p className="rg-subtitle">Contales a los demás quién está del otro lado de la pantalla.</p>

              <div className="rg-fields">
                <div className="rg-row">
                  <div className="rg-field">
                    <label className="rg-label">Nombre <span className="rg-req">*</span></label>
                    <input
                      className="rg-input"
                      placeholder="Tu nombre o apodo"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      maxLength={30}
                    />
                  </div>
                  <div className="rg-field">
                    <label className="rg-label">Edad <span className="rg-req">*</span></label>
                    <input
                      className="rg-input"
                      type="number"
                      placeholder="18"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      min={18} max={99}
                      style={{ textAlign: "center" }}
                    />
                  </div>
                </div>

                <div className="rg-field">
                  <label className="rg-label">Género <span className="rg-opt">Opcional</span></label>
                  <div className="rg-gender-grid">
                    {["Hombre", "Mujer", "No binario", "Prefiero no decir"].map(g => (
                      <button
                        key={g}
                        className={`rg-gpill ${gender === g ? "active" : ""}`}
                        onClick={() => setGender(gender === g ? "" : g)}
                        type="button"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rg-field">
                  <label className="rg-label">Bio <span className="rg-opt">Opcional</span></label>
                  <textarea
                    className="rg-input"
                    rows={3}
                    placeholder="Contá algo sobre vos… Los perfiles con bio reciben 3x más matches."
                    value={bio}
                    onChange={e => setBio(e.target.value.slice(0, 160))}
                  />
                  <div className="rg-char-hint">{bio.length}/160</div>
                </div>
              </div>

              <div className="rg-actions">
                <button className="rg-btn" onClick={() => {
                  if (!name.trim()) return alert("Agregá tu nombre");
                  if (!age || parseInt(age) < 18) return alert("Debés tener al menos 18 años");
                  setStep(2);
                }}>
                  Continuar →
                </button>
                <button className="rg-btn-ghost" onClick={() => setStep(0)}>← Volver</button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Fotos ── */}
          {step === 2 && (
            <div className="rg-content rg-slide-in" key="s2">
              <div className="rg-eyebrow">📸 Paso 03</div>
              <div className="rg-title">Tus fotos</div>
              <p className="rg-subtitle">La primera es tu foto principal. Podés subir hasta 4. Perfiles con fotos claras consiguen 5× más conexiones.</p>

              <div className="rg-photo-grid">
                {[0,1,2,3].map(idx => (
                  <div
                    key={idx}
                    className={`rg-photo-slot ${photos[idx] ? "filled" : ""}`}
                    onClick={() => !photos[idx] && fileRef.current?.click()}
                  >
                    {photos[idx] ? (
                      <>
                        <img src={photos[idx].url} alt="" />
                        <div className="rg-photo-num">{idx + 1}</div>
                        {idx === 0 && <div className="rg-photo-badge">⭐ Foto principal</div>}
                        <button
                          className="rg-photo-del"
                          onClick={e => { e.stopPropagation(); removePhoto(idx); }}
                          type="button"
                        >✕</button>
                      </>
                    ) : (
                      <>
                        <div className="rg-photo-add-icon">{idx === 0 ? "📷" : "+"}</div>
                        <div className="rg-photo-add-txt">
                          {idx === 0 ? "Foto principal\n(obligatoria)" : `Foto ${idx + 1}`}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handlePhotoAdd}
              />

              <div className="rg-photo-tip">
                <span className="rg-photo-tip-icon">💡</span>
                <span className="rg-photo-tip-txt">
                  Usá fotos donde se vea bien tu cara con buena iluminación. JPG, PNG o WEBP · Máx 5 MB por foto.
                </span>
              </div>

              <div className="rg-actions">
                <button className="rg-btn" onClick={() => photos.length > 0 ? setStep(3) : alert("Agregá al menos una foto")}>
                  Continuar →
                </button>
                <button className="rg-btn-ghost" onClick={() => setStep(1)}>← Volver</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Vibe ── */}
          {step === 3 && (
            <div className="rg-content rg-slide-in" key="s3">
              <div className="rg-eyebrow">🔥 Paso 04</div>
              <div className="rg-title">Tu vibe</div>
              <p className="rg-subtitle">Ayudamos a conectarte con personas afines. Todo es opcional pero suma muchísimo.</p>

              <div className="rg-section-hd">
                <span className="rg-section-ttl">¿Qué buscás?</span>
                {lookingFor.length > 0 && (
                  <span className="rg-section-ct">{lookingFor.length} elegido{lookingFor.length > 1 ? "s" : ""}</span>
                )}
              </div>
              <div className="rg-lf-grid">
                {LOOKING_FOR.map(lf => (
                  <button
                    key={lf.id}
                    className={`rg-lf-card ${lookingFor.includes(lf.id) ? "active" : ""}`}
                    onClick={() => toggleLookingFor(lf.id)}
                    type="button"
                  >
                    <div className="rg-lf-check">✓</div>
                    <div className="rg-lf-emoji">{lf.emoji}</div>
                    <div className="rg-lf-label">{lf.label}</div>
                    <div className="rg-lf-desc">{lf.desc}</div>
                  </button>
                ))}
              </div>

              <div className="rg-divider">
                <div className="rg-divider-line" />
                <div className="rg-divider-txt">Intereses</div>
                <div className="rg-divider-line" />
              </div>

              <div className="rg-section-hd">
                <span className="rg-section-ttl">¿Qué te gusta?</span>
                <span className="rg-section-ct">{interests.length}/8</span>
              </div>
              <div className="rg-tags">
                {INTERESTS.map(item => (
                  <button
                    key={item}
                    className={`rg-tag ${interests.includes(item) ? "active" : ""}`}
                    onClick={() => toggleInterest(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="rg-actions">
                <button className="rg-btn" onClick={handleFinish} disabled={loading}>
                  {loading ? "Guardando perfil..." : "¡Empezar a conectar! 🔥"}
                </button>
                <button className="rg-btn-ghost" onClick={() => setStep(2)}>← Volver</button>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}