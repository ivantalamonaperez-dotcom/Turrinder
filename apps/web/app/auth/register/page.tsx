"use client";

import { useState, useRef } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";

// ── Datos de opciones ──────────────────────────────────────
const INTERESTS = [
  "🎵 Música", "🎮 Gaming", "✈️ Viajes", "📚 Libros", "🎬 Cine",
  "🏋️ Fitness", "🍕 Gastronomía", "🎨 Arte", "📸 Fotografía", "🌿 Naturaleza",
  "💻 Tecnología", "🎭 Teatro", "🏄 Surf", "🐕 Mascotas", "🧘 Yoga",
  "🎸 Guitarra", "⚽ Fútbol", "🏀 Básquet", "🎤 Karaoke", "🎲 Juegos de mesa",
];

const LOOKING_FOR = [
  { id: "friends", label: "Amigos", emoji: "👋" },
  { id: "dates",   label: "Citas",  emoji: "❤️" },
  { id: "chat",    label: "Charlar", emoji: "💬" },
  { id: "network", label: "Networking", emoji: "🤝" },
];

const STEPS = [
  { id: "account",  label: "Cuenta",  emoji: "🔐" },
  { id: "identity", label: "Identidad", emoji: "✨" },
  { id: "photos",   label: "Fotos",   emoji: "📸" },
  { id: "vibe",     label: "Vibe",    emoji: "🔥" },
];

// ── Tipos ──────────────────────────────────────────────────
type Photo = { file: File; url: string };

export default function RegisterPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep]         = useState(0);
  const [loading, setLoading]   = useState(false);
  const [userId, setUserId]     = useState<string | null>(null);

  // Step 0 — Cuenta
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [passConf, setPassConf] = useState("");

  // Step 1 — Identidad
  const [name, setName]         = useState("");
  const [age, setAge]           = useState("");
  const [bio, setBio]           = useState("");
  const [gender, setGender]     = useState("");

  // Step 2 — Fotos
  const [photos, setPhotos]     = useState<Photo[]>([]);

  // Step 3 — Vibe
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  // ── Handlers ────────────────────────────────────────────
  const handleCreateAccount = async () => {
    if (!email || !password) return alert("Completá email y contraseña");
    if (password !== passConf) return alert("Las contraseñas no coinciden");
    if (password.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { alert(error.message); setLoading(false); return; }
    setUserId(data.user?.id || null);
    setLoading(false);
    setStep(1);
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - photos.length;
    const toAdd = files.slice(0, remaining);
    const newPhotos: Photo[] = toAdd.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleInterest = (item: string) => {
    setInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : prev.length < 8 ? [...prev, item] : prev
    );
  };

  const toggleLookingFor = (id: string) => {
    setLookingFor(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const uploadPhotos = async (uid: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const photo of photos) {
      const ext = photo.file.name.split(".").pop();
      const path = `${uid}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, photo.file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleFinish = async () => {
    if (!name.trim()) return alert("Agregá tu nombre");
    if (!age || parseInt(age) < 18) return alert("Debés tener al menos 18 años");
    if (photos.length === 0) return alert("Agregá al menos una foto");

    setLoading(true);
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!uid) { alert("Error de sesión"); setLoading(false); return; }

    const photoUrls = await uploadPhotos(uid);

    await supabase.from("profiles").upsert({
      id: uid,
      name: name.trim(),
      age: parseInt(age),
      bio: bio.trim(),
      gender,
      avatar_url: photoUrls[0] || null,
      photos: photoUrls,
      interests,
      looking_for: lookingFor,
    });

    setLoading(false);
    router.push("/discover");
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Cabinet+Grotesk:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .rg-root {
          min-height: 100vh;
          background: #07070f;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: 'Cabinet Grotesk', sans-serif;
          position: relative;
          overflow-x: hidden;
          padding-bottom: 48px;
        }

        /* Fondo */
        .rg-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse 60% 40% at 10% 10%, rgba(255,45,107,0.1) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 90%, rgba(255,107,53,0.07) 0%, transparent 60%);
        }

        .rg-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 52px 52px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }

        /* Progress bar */
        .rg-progress {
          position: sticky;
          top: 0;
          z-index: 20;
          width: 100%;
          padding: 16px 24px 12px;
          background: rgba(7,7,15,0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .rg-progress-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .rg-logo {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }

        .rg-logo span {
          background: linear-gradient(135deg, #ff2d6b, #ff6b35);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .rg-step-count {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
        }

        .rg-steps {
          display: flex;
          gap: 8px;
        }

        .rg-step-pill {
          flex: 1;
          height: 3px;
          border-radius: 100px;
          background: rgba(255,255,255,0.08);
          transition: background 0.4s ease;
          overflow: hidden;
          position: relative;
        }

        .rg-step-pill.done {
          background: linear-gradient(90deg, #ff2d6b, #ff6b35);
        }

        .rg-step-pill.active {
          background: rgba(255,45,107,0.3);
        }

        .rg-step-pill.active::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #ff2d6b, #ff6b35);
          animation: fillBar 0.5s ease forwards;
        }

        @keyframes fillBar {
          from { width: 0%; }
          to   { width: 100%; }
        }

        .rg-step-labels {
          display: flex;
          gap: 8px;
        }

        .rg-step-label {
          flex: 1;
          text-align: center;
          font-size: 10px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.2);
          transition: color 0.3s;
        }

        .rg-step-label.active { color: #ff2d6b; font-weight: 600; }
        .rg-step-label.done   { color: rgba(255,255,255,0.45); }

        /* Contenido */
        .rg-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          padding: 32px 24px 0;
          display: flex;
          flex-direction: column;
          gap: 28px;
          animation: slideIn 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) both;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .rg-step-hero {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rg-step-emoji {
          font-size: 36px;
          margin-bottom: 4px;
        }

        .rg-step-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          line-height: 1.1;
        }

        .rg-step-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.35);
          line-height: 1.6;
          font-weight: 300;
        }

        /* Campos */
        .rg-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .rg-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rg-required {
          color: #ff2d6b;
          font-size: 14px;
        }

        .rg-optional {
          font-size: 9px;
          letter-spacing: 1px;
          color: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 1px 5px;
        }

        .rg-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 13px;
          padding: 13px 16px;
          font-size: 15px;
          color: white;
          font-family: 'Cabinet Grotesk', sans-serif;
          outline: none;
          transition: all 0.2s;
        }

        .rg-input::placeholder { color: rgba(255,255,255,0.18); }

        .rg-input:focus {
          border-color: rgba(255,45,107,0.45);
          background: rgba(255,45,107,0.04);
          box-shadow: 0 0 0 3px rgba(255,45,107,0.1);
        }

        textarea.rg-input {
          resize: none;
          line-height: 1.6;
        }

        .rg-char-count {
          text-align: right;
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          margin-top: -4px;
        }

        .rg-row {
          display: flex;
          gap: 12px;
        }

        .rg-row .rg-field { flex: 1; }

        /* Gender pills */
        .rg-gender-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .rg-gender-pill {
          flex: 1;
          min-width: 80px;
          padding: 10px 8px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          color: rgba(255,255,255,0.45);
          font-family: 'Cabinet Grotesk', sans-serif;
          font-size: 13px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .rg-gender-pill.active {
          background: rgba(255,45,107,0.12);
          border-color: rgba(255,45,107,0.4);
          color: #ff2d6b;
        }

        /* Fotos */
        .rg-photos-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .rg-photo-slot {
          aspect-ratio: 3/4;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          background: rgba(255,255,255,0.04);
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
          border-color: rgba(255,45,107,0.4);
          background: rgba(255,45,107,0.05);
        }

        .rg-photo-slot.filled {
          border-style: solid;
          border-color: rgba(255,255,255,0.1);
        }

        .rg-photo-slot img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .rg-photo-add-icon {
          font-size: 28px;
          opacity: 0.4;
        }

        .rg-photo-add-text {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          text-align: center;
          line-height: 1.4;
        }

        .rg-photo-main-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          color: white;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 6px;
          z-index: 2;
        }

        .rg-photo-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: rgba(0,0,0,0.7);
          border: none;
          color: white;
          font-size: 14px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          z-index: 2;
          transition: background 0.15s;
        }

        .rg-photo-remove:hover { background: rgba(255,45,107,0.8); }

        .rg-photos-hint {
          font-size: 12px;
          color: rgba(255,255,255,0.25);
          text-align: center;
          line-height: 1.6;
        }

        /* Interests grid */
        .rg-tags-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .rg-tag {
          padding: 8px 14px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 100px;
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.18s;
          font-family: 'Cabinet Grotesk', sans-serif;
          white-space: nowrap;
        }

        .rg-tag:hover { border-color: rgba(255,45,107,0.3); color: rgba(255,255,255,0.8); }

        .rg-tag.active {
          background: rgba(255,45,107,0.12);
          border-color: rgba(255,45,107,0.45);
          color: #ff6b9d;
        }

        /* Looking for */
        .rg-lf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .rg-lf-card {
          padding: 16px;
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }

        .rg-lf-card:hover { border-color: rgba(255,45,107,0.25); }

        .rg-lf-card.active {
          background: rgba(255,45,107,0.08);
          border-color: rgba(255,45,107,0.4);
        }

        .rg-lf-emoji { font-size: 22px; }

        .rg-lf-label {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.7);
        }

        .rg-lf-card.active .rg-lf-label { color: white; }

        /* Botón principal */
        .rg-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          border: none;
          border-radius: 14px;
          color: white;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 8px 28px rgba(255,45,107,0.35);
          position: relative;
          overflow: hidden;
        }

        .rg-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s;
        }

        .rg-btn:hover::after { transform: translateX(100%); }
        .rg-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(255,45,107,0.5); }
        .rg-btn:active { transform: translateY(0); }
        .rg-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        .rg-btn-ghost {
          width: 100%;
          padding: 14px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: rgba(255,255,255,0.4);
          font-family: 'Cabinet Grotesk', sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .rg-btn-ghost:hover {
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.7);
          border-color: rgba(255,255,255,0.15);
        }

        .rg-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-bottom: 8px;
        }

        .rg-login-link {
          text-align: center;
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          margin-top: 4px;
        }

        .rg-login-link a {
          color: #ff2d6b;
          text-decoration: none;
          font-weight: 500;
          cursor: pointer;
        }

        .rg-login-link a:hover { text-decoration: underline; }

        /* Divider */
        .rg-section-divider {
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 4px 0;
        }

        .rg-section-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,255,255,0.25);
          letter-spacing: 1px;
          text-transform: uppercase;
        }
      `}</style>

      <div className="rg-bg" />
      <div className="rg-grid" />

      {/* Progress */}
      <div className="rg-progress">
        <div className="rg-progress-header">
          <div className="rg-logo">Turr<span>inder</span></div>
          <span className="rg-step-count">Paso {step + 1} de {STEPS.length}</span>
        </div>
        <div className="rg-steps">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`rg-step-pill ${i < step ? "done" : i === step ? "active" : ""}`}
            />
          ))}
        </div>
        <div className="rg-step-labels">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`rg-step-label ${i < step ? "done" : i === step ? "active" : ""}`}
            >
              {s.emoji} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── STEP 0: Cuenta ── */}
      {step === 0 && (
        <div className="rg-content" key="step0">
          <div className="rg-step-hero">
            <div className="rg-step-emoji">🔐</div>
            <div className="rg-step-title">Creá tu cuenta</div>
            <p className="rg-step-sub">Tu email y contraseña para acceder a Turrinder.</p>
          </div>

          <div className="rg-field">
            <label className="rg-label">Email <span className="rg-required">*</span></label>
            <input className="rg-input" type="email" placeholder="tu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="rg-field">
            <label className="rg-label">Contraseña <span className="rg-required">*</span></label>
            <input className="rg-input" type="password" placeholder="Mínimo 6 caracteres"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <div className="rg-field">
            <label className="rg-label">Confirmar contraseña <span className="rg-required">*</span></label>
            <input className="rg-input" type="password" placeholder="Repetí tu contraseña"
              value={passConf} onChange={e => setPassConf(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateAccount()} />
          </div>

          <div className="rg-actions">
            <button className="rg-btn" onClick={handleCreateAccount} disabled={loading}>
              {loading ? "Creando cuenta..." : "Continuar →"}
            </button>
            <div className="rg-login-link">
              ¿Ya tenés cuenta? <a onClick={() => router.push("/")}>Iniciá sesión</a>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1: Identidad ── */}
      {step === 1 && (
        <div className="rg-content" key="step1">
          <div className="rg-step-hero">
            <div className="rg-step-emoji">✨</div>
            <div className="rg-step-title">¿Quién sos?</div>
            <p className="rg-step-sub">Contales a los demás quién está del otro lado de la cámara.</p>
          </div>

          <div className="rg-row">
            <div className="rg-field">
              <label className="rg-label">Nombre <span className="rg-required">*</span></label>
              <input className="rg-input" placeholder="Tu nombre" value={name}
                onChange={e => setName(e.target.value)} maxLength={30} />
            </div>
            <div className="rg-field" style={{ maxWidth: 100 }}>
              <label className="rg-label">Edad <span className="rg-required">*</span></label>
              <input className="rg-input" type="number" placeholder="18" value={age}
                onChange={e => setAge(e.target.value)} min={18} max={99} />
            </div>
          </div>

          <div className="rg-field">
            <label className="rg-label">Género <span className="rg-optional">Opcional</span></label>
            <div className="rg-gender-row">
              {["Hombre", "Mujer", "No binario", "Prefiero no decir"].map(g => (
                <button key={g} className={`rg-gender-pill ${gender === g ? "active" : ""}`}
                  onClick={() => setGender(gender === g ? "" : g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="rg-field">
            <label className="rg-label">Bio <span className="rg-optional">Opcional</span></label>
            <textarea className="rg-input" rows={3}
              placeholder="Contá algo sobre vos... ¿qué te hace único?"
              value={bio} onChange={e => setBio(e.target.value.slice(0, 160))} />
            <div className="rg-char-count">{bio.length}/160</div>
          </div>

          <div className="rg-actions">
            <button className="rg-btn" onClick={() => setStep(2)}>
              Continuar →
            </button>
            <button className="rg-btn-ghost" onClick={() => setStep(0)}>← Volver</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Fotos ── */}
      {step === 2 && (
        <div className="rg-content" key="step2">
          <div className="rg-step-hero">
            <div className="rg-step-emoji">📸</div>
            <div className="rg-step-title">Tus fotos</div>
            <p className="rg-step-sub">La primera foto es tu foto de perfil principal. Máximo 4.</p>
          </div>

          <div className="rg-photos-grid">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`rg-photo-slot ${photos[idx] ? "filled" : ""}`}
                onClick={() => !photos[idx] && fileRef.current?.click()}
              >
                {photos[idx] ? (
                  <>
                    <img src={photos[idx].url} alt="" />
                    {idx === 0 && <div className="rg-photo-main-badge">Principal</div>}
                    <button className="rg-photo-remove"
                      onClick={e => { e.stopPropagation(); removePhoto(idx); }}>
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <div className="rg-photo-add-icon">
                      {idx === 0 ? "📷" : "+"}
                    </div>
                    <div className="rg-photo-add-text">
                      {idx === 0 ? "Foto principal\n(obligatoria)" : "Agregar foto"}
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

          <p className="rg-photos-hint">
            Usá fotos donde se vea bien tu cara 😊<br />
            JPG, PNG o WEBP · Máx 5MB por foto
          </p>

          <div className="rg-actions">
            <button className="rg-btn"
              onClick={() => photos.length > 0 ? setStep(3) : alert("Agregá al menos una foto")}>
              Continuar →
            </button>
            <button className="rg-btn-ghost" onClick={() => setStep(1)}>← Volver</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Vibe ── */}
      {step === 3 && (
        <div className="rg-content" key="step3">
          <div className="rg-step-hero">
            <div className="rg-step-emoji">🔥</div>
            <div className="rg-step-title">Tu vibe</div>
            <p className="rg-step-sub">Ayudá a que la gente te conozca mejor. Todo opcional.</p>
          </div>

          <div className="rg-field">
            <label className="rg-label">¿Qué buscás?</label>
            <div className="rg-lf-grid">
              {LOOKING_FOR.map(lf => (
                <button
                  key={lf.id}
                  className={`rg-lf-card ${lookingFor.includes(lf.id) ? "active" : ""}`}
                  onClick={() => toggleLookingFor(lf.id)}
                >
                  <div className="rg-lf-emoji">{lf.emoji}</div>
                  <div className="rg-lf-label">{lf.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rg-section-divider" />

          <div className="rg-field">
            <label className="rg-label">
              Intereses
              <span className="rg-optional">Hasta 8</span>
            </label>
            <div className="rg-tags-grid">
              {INTERESTS.map(item => (
                <button
                  key={item}
                  className={`rg-tag ${interests.includes(item) ? "active" : ""}`}
                  onClick={() => toggleInterest(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="rg-actions">
            <button className="rg-btn" onClick={handleFinish} disabled={loading}>
              {loading ? "Guardando perfil..." : "¡Empezar a conocer gente! 🔥"}
            </button>
            <button className="rg-btn-ghost" onClick={() => setStep(2)}>← Volver</button>
          </div>
        </div>
      )}
    </>
  );
}