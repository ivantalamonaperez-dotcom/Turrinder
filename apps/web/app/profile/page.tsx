"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";

const INTERESTS_ALL = [
  "🎵 Música", "🎮 Gaming", "✈️ Viajes", "📚 Libros", "🎬 Cine",
  "🏋️ Fitness", "🍕 Gastronomía", "🎨 Arte", "📸 Fotografía", "🌿 Naturaleza",
  "💻 Tecnología", "🎭 Teatro", "🏄 Surf", "🐕 Mascotas", "🧘 Yoga",
  "🎸 Guitarra", "⚽ Fútbol", "🏀 Básquet", "🎤 Karaoke", "🎲 Juegos de mesa",
];

const LOOKING_FOR_ALL = [
  { id: "friends", label: "Amigos",      emoji: "👋" },
  { id: "dates",   label: "Citas",       emoji: "❤️" },
  { id: "chat",    label: "Charlar",     emoji: "💬" },
  { id: "network", label: "Networking",  emoji: "🤝" },
];

const GENDERS = ["Hombre", "Mujer", "No binario", "Prefiero no decir"];

type Photo = { file?: File; url: string; isNew?: boolean };

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "fotos" | "vibe">("info");
  const [mounted,   setMounted]   = useState(false);

  // Datos del perfil
  const [userId,    setUserId]    = useState("");
  const [email,     setEmail]     = useState("");
  const [name,      setName]      = useState("");
  const [age,       setAge]       = useState("");
  const [bio,       setBio]       = useState("");
  const [gender,    setGender]    = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [photos,    setPhotos]    = useState<Photo[]>([]);

  useEffect(() => {
    setMounted(true);
    const load = async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) { router.push("/"); return; }
      setUserId(me.user.id);
      setEmail(me.user.email || "");

      const { data: p } = await supabase
        .from("profiles")
        .select("name, age, bio, gender, avatar_url, photos, interests, looking_for")
        .eq("id", me.user.id)
        .single();

      if (p) {
        setName(p.name || "");
        setAge(p.age?.toString() || "");
        setBio(p.bio || "");
        setGender(p.gender || "");
        setInterests(p.interests || []);
        setLookingFor(p.looking_for || []);

        // Cargar fotos existentes
        const urls: Photo[] = [];
        if (p.photos?.length) {
          p.photos.forEach((url: string) => urls.push({ url }));
        } else if (p.avatar_url) {
          urls.push({ url: p.avatar_url });
        }
        setPhotos(urls);
      }

      setLoading(false);
    };
    load();
  }, []);

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

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - photos.length;
    const newPhotos: Photo[] = files.slice(0, remaining).map(f => ({
      file: f, url: URL.createObjectURL(f), isNew: true,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);

    // Subir fotos nuevas
    const finalUrls: string[] = [];
    for (const photo of photos) {
      if (photo.isNew && photo.file) {
        const ext = photo.file.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, photo.file, { upsert: true });
        if (!error) {
          const { data } = supabase.storage.from("avatars").getPublicUrl(path);
          finalUrls.push(data.publicUrl);
        }
      } else {
        finalUrls.push(photo.url);
      }
    }

    await supabase.from("profiles").update({
      name, age: parseInt(age) || 20, bio, gender,
      avatar_url: finalUrls[0] || null,
      photos: finalUrls,
      interests,
      looking_for: lookingFor,
    }).eq("id", userId);

    // Actualizar estado con URLs definitivas
    setPhotos(finalUrls.map(url => ({ url })));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Cabinet+Grotesk:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pf-root {
          min-height: 100vh;
          background: #07070f;
          font-family: 'Cabinet Grotesk', sans-serif;
          padding-bottom: 100px;
          position: relative;
          overflow-x: hidden;
        }

        /* Fondo */
        .pf-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 55% 35% at 80% 5%, rgba(255,45,107,0.1) 0%, transparent 60%),
            radial-gradient(ellipse 45% 35% at 15% 95%, rgba(255,107,53,0.07) 0%, transparent 60%);
          animation: bgBreath 10s ease-in-out infinite alternate;
        }

        @keyframes bgBreath {
          from { opacity: 0.7; } to { opacity: 1; }
        }

        /* ── Hero del perfil ── */
        .pf-hero {
          position: relative;
          z-index: 1;
          padding: 52px 24px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }

        /* Foto principal — grande y destacada */
        .pf-avatar-wrap {
          position: relative;
          margin-bottom: 20px;
        }

        .pf-avatar {
          width: 110px; height: 110px;
          border-radius: 32px;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(255,45,107,0.25), rgba(255,107,53,0.15));
          border: 2px solid rgba(255,45,107,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 48px;
          box-shadow:
            0 0 0 4px rgba(255,45,107,0.08),
            0 20px 50px rgba(0,0,0,0.5),
            0 0 40px rgba(255,45,107,0.15);
          animation: avatarGlow 4s ease-in-out infinite alternate;
        }

        @keyframes avatarGlow {
          from { box-shadow: 0 0 0 4px rgba(255,45,107,0.08), 0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(255,45,107,0.12); }
          to   { box-shadow: 0 0 0 4px rgba(255,45,107,0.18), 0 20px 50px rgba(0,0,0,0.5), 0 0 60px rgba(255,45,107,0.25); }
        }

        .pf-avatar img { width: 100%; height: 100%; object-fit: cover; }

        /* Badge de edit en el avatar */
        .pf-avatar-edit {
          position: absolute;
          bottom: -6px; right: -6px;
          width: 30px; height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          border: 2px solid #07070f;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          cursor: pointer;
          transition: transform 0.2s;
          box-shadow: 0 4px 12px rgba(255,45,107,0.4);
        }

        .pf-avatar-edit:hover { transform: scale(1.1); }

        .pf-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 26px; font-weight: 800;
          color: white; letter-spacing: -0.8px;
          text-align: center;
          animation: fadeUp 0.5s 0.1s both;
        }

        .pf-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          margin-top: 4px;
          animation: fadeUp 0.5s 0.2s both;
        }

        /* Stats row */
        .pf-stats {
          display: flex;
          gap: 1px;
          margin-top: 20px;
          background: rgba(255,255,255,0.05);
          border-radius: 16px;
          overflow: hidden;
          width: 100%;
          max-width: 360px;
          animation: fadeUp 0.5s 0.3s both;
        }

        .pf-stat {
          flex: 1;
          padding: 14px 8px;
          background: rgba(255,255,255,0.03);
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          transition: background 0.2s;
        }

        .pf-stat:hover { background: rgba(255,255,255,0.06); }

        .pf-stat-val {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 20px; font-weight: 800; color: white;
        }

        .pf-stat-key {
          font-size: 10px; color: rgba(255,255,255,0.28);
          letter-spacing: 0.5px; text-transform: uppercase;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Tabs ── */
        .pf-tabs {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 4px;
          padding: 20px 24px 0;
          max-width: 480px;
          margin: 0 auto;
          animation: fadeUp 0.5s 0.35s both;
        }

        .pf-tab {
          flex: 1;
          padding: 10px 6px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.5px; text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          transition: all 0.22s ease;
          text-align: center;
        }

        .pf-tab.active {
          background: rgba(255,45,107,0.12);
          border-color: rgba(255,45,107,0.35);
          color: #ff2d6b;
        }

        /* ── Body ── */
        .pf-body {
          position: relative;
          z-index: 1;
          padding: 24px 24px 0;
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeUp 0.45s 0.4s both;
        }

        /* Campos */
        .pf-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .pf-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 1.5px; text-transform: uppercase;
          color: rgba(255,255,255,0.25);
        }

        .pf-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 13px;
          padding: 13px 16px;
          font-size: 15px; color: white;
          font-family: 'Cabinet Grotesk', sans-serif;
          outline: none;
          transition: all 0.2s;
          resize: none;
        }

        .pf-input::placeholder { color: rgba(255,255,255,0.18); }

        .pf-input:focus {
          border-color: rgba(255,45,107,0.45);
          background: rgba(255,45,107,0.04);
          box-shadow: 0 0 0 3px rgba(255,45,107,0.1);
        }

        .pf-char { text-align: right; font-size: 11px; color: rgba(255,255,255,0.2); }

        .pf-row { display: flex; gap: 12px; }
        .pf-row .pf-field { flex: 1; }

        /* Gender pills */
        .pf-gender-row { display: flex; gap: 7px; flex-wrap: wrap; }

        .pf-gender-pill {
          padding: 8px 14px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 100px;
          color: rgba(255,255,255,0.4);
          font-family: 'Cabinet Grotesk', sans-serif;
          font-size: 13px; cursor: pointer;
          transition: all 0.18s;
        }

        .pf-gender-pill.active {
          background: rgba(255,45,107,0.12);
          border-color: rgba(255,45,107,0.4);
          color: #ff2d6b;
        }

        /* ── Fotos ── */
        .pf-photos-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .pf-photo-slot {
          aspect-ratio: 3/4;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          background: rgba(255,255,255,0.03);
          border: 1.5px dashed rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.2s;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px;
        }

        .pf-photo-slot:hover { border-color: rgba(255,45,107,0.4); background: rgba(255,45,107,0.05); }
        .pf-photo-slot.filled { border-style: solid; border-color: rgba(255,255,255,0.08); cursor: default; }
        .pf-photo-slot img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .pf-photo-add-icon { font-size: 26px; opacity: 0.35; }
        .pf-photo-add-text { font-size: 11px; color: rgba(255,255,255,0.22); text-align: center; }

        .pf-photo-main {
          position: absolute; top: 8px; left: 8px;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          color: white; font-size: 9px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase;
          padding: 3px 8px; border-radius: 6px; z-index: 2;
        }

        .pf-photo-rm {
          position: absolute; top: 8px; right: 8px;
          width: 26px; height: 26px; border-radius: 50%;
          background: rgba(0,0,0,0.7); border: none;
          color: white; font-size: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          z-index: 2; transition: background 0.15s;
        }

        .pf-photo-rm:hover { background: rgba(255,45,107,0.8); }

        .pf-photos-hint {
          font-size: 12px; color: rgba(255,255,255,0.22);
          text-align: center; line-height: 1.6;
        }

        /* ── Interests ── */
        .pf-tags { display: flex; flex-wrap: wrap; gap: 8px; }

        .pf-tag {
          padding: 8px 14px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 100px;
          color: rgba(255,255,255,0.45);
          font-size: 13px; cursor: pointer;
          transition: all 0.18s;
          font-family: 'Cabinet Grotesk', sans-serif;
          white-space: nowrap;
        }

        .pf-tag:hover { border-color: rgba(255,45,107,0.3); color: rgba(255,255,255,0.8); }

        .pf-tag.active {
          background: rgba(255,45,107,0.12);
          border-color: rgba(255,45,107,0.45);
          color: #ff6b9d;
        }

        /* Looking for cards */
        .pf-lf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .pf-lf-card {
          padding: 14px;
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          cursor: pointer; transition: all 0.2s;
          display: flex; flex-direction: column; gap: 5px;
          text-align: left;
        }

        .pf-lf-card:hover { border-color: rgba(255,45,107,0.25); }

        .pf-lf-card.active {
          background: rgba(255,45,107,0.08);
          border-color: rgba(255,45,107,0.4);
        }

        .pf-lf-emoji { font-size: 20px; }
        .pf-lf-label {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.6);
        }
        .pf-lf-card.active .pf-lf-label { color: white; }

        /* Sección divider */
        .pf-section-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 12px; font-weight: 700;
          color: rgba(255,255,255,0.2);
          letter-spacing: 1.5px; text-transform: uppercase;
        }

        /* Botones */
        .pf-btn {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          border: none; border-radius: 14px; color: white;
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: 15px; font-weight: 700; letter-spacing: 0.3px;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 8px 24px rgba(255,45,107,0.35);
          position: relative; overflow: hidden;
        }

        .pf-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s;
        }

        .pf-btn:hover::after { transform: translateX(100%); }
        .pf-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(255,45,107,0.5); }
        .pf-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        .pf-btn.saved-state {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 8px 24px rgba(34,197,94,0.35);
        }

        .pf-btn-ghost {
          width: 100%; padding: 13px;
          background: transparent;
          border: 1px solid rgba(255,77,77,0.2);
          border-radius: 14px;
          color: rgba(255,77,77,0.6);
          font-family: 'Cabinet Grotesk', sans-serif;
          font-size: 14px; cursor: pointer;
          transition: all 0.2s;
        }

        .pf-btn-ghost:hover {
          background: rgba(255,77,77,0.07);
          border-color: rgba(255,77,77,0.4);
          color: #ff4d4d;
        }

        .pf-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }

        /* Skeleton */
        .pf-skel {
          height: 48px; border-radius: 13px;
          background: rgba(255,255,255,0.05);
          animation: shimmer 1.4s ease-in-out infinite;
        }

        @keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
      `}</style>

      <div className="pf-bg" />

      <div className="pf-root">

        {/* ── Hero ── */}
        <div className="pf-hero">
          <div className="pf-avatar-wrap">
            <div className="pf-avatar">
              {photos[0]
                ? <img src={photos[0].url} alt={name} />
                : "👤"}
            </div>
            <div className="pf-avatar-edit" onClick={() => setActiveTab("fotos")} title="Editar fotos">
              ✏️
            </div>
          </div>

          <div className="pf-name">{name || "Tu perfil"}</div>
          <div className="pf-sub">{email}</div>

          {!loading && (
            <div className="pf-stats">
              <div className="pf-stat">
                <div className="pf-stat-val">{age || "—"}</div>
                <div className="pf-stat-key">Años</div>
              </div>
              <div className="pf-stat">
                <div className="pf-stat-val">{photos.length}</div>
                <div className="pf-stat-key">Fotos</div>
              </div>
              <div className="pf-stat">
                <div className="pf-stat-val">{interests.length}</div>
                <div className="pf-stat-key">Intereses</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="pf-tabs">
          {(["info", "fotos", "vibe"] as const).map(tab => (
            <button
              key={tab}
              className={`pf-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "info" ? "👤 Info" : tab === "fotos" ? "📸 Fotos" : "🔥 Vibe"}
            </button>
          ))}
        </div>

        {/* ── Contenido ── */}
        {loading ? (
          <div className="pf-body">
            <div className="pf-skel" />
            <div className="pf-skel" />
            <div className="pf-skel" style={{ height: 90 }} />
          </div>
        ) : (

          <div className="pf-body" key={activeTab}>

            {/* ── TAB: INFO ── */}
            {activeTab === "info" && (
              <>
                <div className="pf-row">
                  <div className="pf-field">
                    <label className="pf-label">Nombre</label>
                    <input className="pf-input" placeholder="Tu nombre"
                      value={name} onChange={e => setName(e.target.value)} maxLength={30} />
                  </div>
                  <div className="pf-field" style={{ maxWidth: 90 }}>
                    <label className="pf-label">Edad</label>
                    <input className="pf-input" type="number" placeholder="18"
                      value={age} onChange={e => setAge(e.target.value)} min={18} max={99} />
                  </div>
                </div>

                <div className="pf-field">
                  <label className="pf-label">Género</label>
                  <div className="pf-gender-row">
                    {GENDERS.map(g => (
                      <button key={g}
                        className={`pf-gender-pill ${gender === g ? "active" : ""}`}
                        onClick={() => setGender(gender === g ? "" : g)}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pf-field">
                  <label className="pf-label">Bio</label>
                  <textarea className="pf-input" rows={4}
                    placeholder="Contá algo sobre vos..."
                    value={bio} onChange={e => setBio(e.target.value.slice(0, 160))} />
                  <div className="pf-char">{bio.length}/160</div>
                </div>

                <div className="pf-actions">
                  <button
                    className={`pf-btn ${saved ? "saved-state" : ""}`}
                    onClick={save} disabled={saving}
                  >
                    {saved ? "✓ Cambios guardados" : saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button className="pf-btn-ghost" onClick={logout}>
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}

            {/* ── TAB: FOTOS ── */}
            {activeTab === "fotos" && (
              <>
                <div className="pf-photos-grid">
                  {[0, 1, 2, 3].map(idx => (
                    <div
                      key={idx}
                      className={`pf-photo-slot ${photos[idx] ? "filled" : ""}`}
                      onClick={() => !photos[idx] && fileRef.current?.click()}
                    >
                      {photos[idx] ? (
                        <>
                          <img src={photos[idx].url} alt="" />
                          {idx === 0 && <div className="pf-photo-main">Principal</div>}
                          <button className="pf-photo-rm"
                            onClick={e => { e.stopPropagation(); removePhoto(idx); }}>
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="pf-photo-add-icon">{idx === 0 ? "📷" : "+"}</div>
                          <div className="pf-photo-add-text">
                            {idx === 0 ? "Foto principal" : "Agregar foto"}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <input ref={fileRef} type="file" accept="image/*" multiple
                  style={{ display: "none" }} onChange={handlePhotoAdd} />

                <p className="pf-photos-hint">
                  La primera foto es la que ven los demás 😊<br />
                  JPG, PNG o WEBP · Máx 4 fotos
                </p>

                <div className="pf-actions">
                  <button
                    className={`pf-btn ${saved ? "saved-state" : ""}`}
                    onClick={save} disabled={saving}
                  >
                    {saved ? "✓ Fotos guardadas" : saving ? "Guardando..." : "Guardar fotos"}
                  </button>
                </div>
              </>
            )}

            {/* ── TAB: VIBE ── */}
            {activeTab === "vibe" && (
              <>
                <div className="pf-field">
                  <div className="pf-section-title">¿Qué buscás?</div>
                  <div style={{ height: 8 }} />
                  <div className="pf-lf-grid">
                    {LOOKING_FOR_ALL.map(lf => (
                      <button key={lf.id}
                        className={`pf-lf-card ${lookingFor.includes(lf.id) ? "active" : ""}`}
                        onClick={() => toggleLookingFor(lf.id)}>
                        <div className="pf-lf-emoji">{lf.emoji}</div>
                        <div className="pf-lf-label">{lf.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pf-field">
                  <div className="pf-section-title">
                    Intereses · {interests.length}/8
                  </div>
                  <div style={{ height: 8 }} />
                  <div className="pf-tags">
                    {INTERESTS_ALL.map(item => (
                      <button key={item}
                        className={`pf-tag ${interests.includes(item) ? "active" : ""}`}
                        onClick={() => toggleInterest(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pf-actions">
                  <button
                    className={`pf-btn ${saved ? "saved-state" : ""}`}
                    onClick={save} disabled={saving}
                  >
                    {saved ? "✓ Vibe guardada" : saving ? "Guardando..." : "Guardar vibe"}
                  </button>
                </div>
              </>
            )}

          </div>
        )}
      </div>
    </>
  );
}