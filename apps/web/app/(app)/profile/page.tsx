"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";
import imgCamara   from "../../../Images/camara.png";
import imgDiamante from "../../../Images/diamante.png";
import imgPerfil   from "../../../Images/perfil.png";
import imgVip      from "../../../Images/logovip.png";
import imgStreamer  from "../../../Images/debates.png";

/* ─────────────────────────── CONSTANTS ─────────────────────────── */

const LOOKING_FOR_ALL = [
  { id: "friends",  label: "Amigos",    emoji: "👥" },
  { id: "dates",    label: "Citas",     emoji: "💫" },
  { id: "chat",     label: "Charlar",   emoji: "💬" },
  { id: "network",  label: "Streamer",  emoji: "🎙️" },
  { id: "collab",   label: "Colabs",    emoji: "🤝" },
  { id: "creative", label: "Creativos", emoji: "🎨" },
];

const GENDERS = ["Hombre", "Mujer", "No binario", "Prefiero no decir"];

const INTEREST_OPTIONS = [
  "Gaming", "Música", "Arte", "Tecnología", "Deportes", "Viajes",
  "Fotografía", "Cocina", "Cine", "Lectura", "Fitness", "Moda",
  "Naturaleza", "Anime", "Podcasts", "Meditación", "Baile", "Teatro",
];

const LANGUAGES = ["Español", "Inglés", "Portugués", "Francés", "Alemán", "Italiano", "Japonés", "Otro"];

/* ─────────────────────────── TYPES ─────────────────────────── */

type Photo = { file?: File; url: string; isNew?: boolean };
type Tab   = "info" | "fotos" | "vibe";

interface ValidationErrors {
  name?: string;
  age?: string;
}

/* ─────────────────────────── COMPONENT ─────────────────────────── */

export default function ProfilePage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  /* — UI state — */
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [errors,    setErrors]    = useState<ValidationErrors>({});

  /* — Drag state — */
  const [dragIdx,   setDragIdx]   = useState<number | null>(null);
  const [overIdx,   setOverIdx]   = useState<number | null>(null);

  /* — User data — */
  const [userId,     setUserId]     = useState("");
  const [email,      setEmail]      = useState("");
  const [name,       setName]       = useState("");
  const [age,        setAge]        = useState("");
  const [bio,        setBio]        = useState("");
  const [gender,     setGender]     = useState("");
  const [location,   setLocation]   = useState("");
  const [occupation, setOccupation] = useState("");
  const [languages,  setLanguages]  = useState<string[]>([]);
  const [interests,  setInterests]  = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [photos,     setPhotos]     = useState<Photo[]>([]);
  const [role,       setRole]       = useState<string>("viewer");

  /* ── Load profile ── */
  useEffect(() => {
    const load = async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) { router.push("/"); return; }
      setUserId(me.user.id);
      setEmail(me.user.email || "");

      const { data: p } = await supabase
        .from("profiles")
        .select("name, age, bio, gender, location, occupation, languages, avatar_url, photos, interests, looking_for, role")
        .eq("id", me.user.id)
        .single();

      if (p) {
        setName(p.name || "");
        setAge(p.age?.toString() || "");
        setBio(p.bio || "");
        setGender(p.gender || "");
        setLocation(p.location || "");
        setOccupation(p.occupation || "");
        setLanguages(p.languages || []);
        setInterests(p.interests || []);
        setLookingFor(p.looking_for || []);
        setRole(p.role || "viewer");

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
  }, [router]);

  /* ── Validation ── */
  const validate = (): boolean => {
    const errs: ValidationErrors = {};
    if (!name.trim()) errs.name = "El nombre es requerido";
    if (age) {
      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
        errs.age = "La edad debe ser entre 18 y 99";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Toggles ── */
  const toggleLookingFor = (id: string) =>
    setLookingFor(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleInterest = (id: string) =>
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleLanguage = (lang: string) =>
    setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);

  /* ── Photo handlers ── */
  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files     = Array.from(e.target.files || []);
    const remaining = 6 - photos.length;
    const newPhotos: Photo[] = files.slice(0, remaining).map(f => ({
      file: f, url: URL.createObjectURL(f), isNew: true,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  const removePhoto = (idx: number) =>
    setPhotos(prev => prev.filter((_, i) => i !== idx));

  /* ── Drag & drop handlers ── */
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    // Only allow dragging filled slots
    if (!photos[idx]) return;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    // Transparent ghost on some browsers
    const ghost = document.createElement("div");
    ghost.style.position = "absolute";
    ghost.style.top = "-9999px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  };

  const handleDragLeave = () => {
    setOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    // Swap the two slots
    setPhotos(prev => {
      const next = [...prev];
      const dragPhoto   = next[dragIdx]   ?? null;
      const targetPhoto = next[targetIdx] ?? null;
      // Place target photo in drag origin slot
      if (targetPhoto) {
        next[dragIdx] = targetPhoto;
      } else {
        // If target was empty, remove from original position
        next.splice(dragIdx, 1);
      }
      // Place drag photo in target slot
      if (dragPhoto) {
        next[targetIdx] = dragPhoto;
      }
      return next.filter(Boolean); // clean any undefined gaps
    });
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  /* ── Touch drag (mobile) ── */
  const touchOriginIdx = useRef<number | null>(null);
  const touchOverIdxRef = useRef<number | null>(null);

  const handleTouchStart = (idx: number) => {
    if (!photos[idx]) return;
    touchOriginIdx.current = idx;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const slot = el?.closest("[data-slot-idx]") as HTMLElement | null;
    const idx = slot ? parseInt(slot.dataset.slotIdx!) : null;
    touchOverIdxRef.current = idx;
    setOverIdx(idx);
  };

  const handleTouchEnd = () => {
    const from = touchOriginIdx.current;
    const to   = touchOverIdxRef.current;
    if (from !== null && to !== null && from !== to) {
      setPhotos(prev => {
        const next = [...prev];
        const dragPhoto   = next[from] ?? null;
        const targetPhoto = next[to]   ?? null;
        if (targetPhoto) next[from] = targetPhoto;
        else next.splice(from, 1);
        if (dragPhoto) next[to] = dragPhoto;
        return next.filter(Boolean);
      });
    }
    touchOriginIdx.current = null;
    touchOverIdxRef.current = null;
    setDragIdx(null);
    setOverIdx(null);
  };

  /* ── Save ── */
  const uploadPhotos = async (photoList: Photo[]): Promise<string[]> => {
    const finalUrls: string[] = [];
    for (const photo of photoList) {
      if (photo.isNew && photo.file) {
        const ext  = photo.file.name.split(".").pop();
        const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from("avatars")
          .upload(path, photo.file, { upsert: true });
        if (error) throw new Error(`Error subiendo foto: ${error.message}`);
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        finalUrls.push(data.publicUrl);
      } else {
        finalUrls.push(photo.url);
      }
    }
    return finalUrls;
  };

  const updateProfile = async (finalUrls: string[]) => {
    const { error } = await supabase.from("profiles").update({
      name:        name.trim(),
      age:         parseInt(age) || null,
      bio,
      gender,
      location,
      occupation,
      languages,
      avatar_url:  finalUrls[0] || null,
      photos:      finalUrls,
      interests,
      looking_for: lookingFor,
    }).eq("id", userId);
    if (error) throw new Error(`Error guardando perfil: ${error.message}`);
  };

  const save = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const finalUrls = await uploadPhotos(photos);
      await updateProfile(finalUrls);
      setPhotos(finalUrls.map(url => ({ url })));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, name, age, bio, gender, location, occupation, languages, interests, lookingFor, userId]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  /* ── Completion score ── */
  const completionItems = [
    !!name, !!age, !!bio, !!gender,
    photos.length > 0, lookingFor.length > 0,
    interests.length > 0, !!location,
  ];
  const completionPct = Math.round(
    (completionItems.filter(Boolean).length / completionItems.length) * 100
  );

  const tabMeta: { id: Tab; label: string; imgSrc: string }[] = [
    { id: "info",  label: "Info",  imgSrc: imgPerfil.src   },
    { id: "fotos", label: "Fotos", imgSrc: imgCamara.src   },
    { id: "vibe",  label: "Vibe",  imgSrc: imgDiamante.src },
  ];

  /* ─────────────────────────── RENDER ─────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --sky:      #54c7f8;
          --sky2:     #3b9eda;
          --sky3:     #1a6fa8;
          --sky-glow: rgba(84,199,248,0.38);
          --w:        #f0f6ff;
          --bg:       #030a14;
          --bg2:      #060f1e;
          --glass:    rgba(84,199,248,0.04);
          --glass-b:  rgba(84,199,248,0.12);
          --muted:    rgba(180,215,240,0.45);
          --error:    #f87171;
          --success:  #22c55e;
        }

        .pf {
          min-height: 100dvh;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          padding-bottom: 120px;
        }

        .pf-ambient {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
        }
        .pf-ambient::before {
          content: ''; position: absolute; width: 800px; height: 800px;
          top: -200px; right: -200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(84,199,248,0.09) 0%, transparent 65%);
          animation: orb1 12s ease-in-out infinite alternate;
        }
        .pf-ambient::after {
          content: ''; position: absolute; width: 600px; height: 600px;
          bottom: -150px; left: -150px; border-radius: 50%;
          background: radial-gradient(circle, rgba(59,158,218,0.07) 0%, transparent 65%);
          animation: orb2 16s ease-in-out infinite alternate;
        }
        @keyframes orb1 { from { transform: translate(0,0) scale(1); } to { transform: translate(-40px,60px) scale(1.15); } }
        @keyframes orb2 { from { transform: translate(0,0) scale(1); } to { transform: translate(50px,-40px) scale(1.1); } }

        .pf-flag {
          position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 300;
          background: linear-gradient(90deg,
            var(--sky) 0%, var(--sky) 33%,
            rgba(245,248,255,0.8) 33%, rgba(245,248,255,0.8) 66%,
            var(--sky) 66%, var(--sky) 100%);
          opacity: 0.6;
        }

        .pf-wrap { max-width: 900px; margin: 0 auto; padding: 0 32px; }

        /* ═══════════ HERO REDESIGN ═══════════ */

        :root {
          --vip-a: #fbbf24; --vip-b: #f59e0b; --vip-c: #92400e;
          --str-a: #4ade80; --str-b: #22c55e; --str-c: #14532d;
        }

        .pf-hero {
          position: relative; z-index: 1; width: 100%;
          padding: 52px 0 0; overflow: visible;
        }
        .pf-hero::before {
          content: ''; position: absolute; inset: 0;
          background-image: repeating-linear-gradient(
            0deg, transparent, transparent 39px,
            rgba(84,199,248,0.018) 39px, rgba(84,199,248,0.018) 40px);
          pointer-events: none;
        }

        /* ── Role-specific hero tint ── */
        .pf-hero.hero-vip::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 70% 60% at 50% -10%, rgba(251,191,36,0.10) 0%, transparent 70%);
        }
        .pf-hero.hero-streamer::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 70% 60% at 50% -10%, rgba(74,222,128,0.09) 0%, transparent 70%);
        }

        .pf-hero-card {
          position: relative; z-index: 2;
          border-radius: 24px 24px 0 0;
          border: 1px solid var(--glass-b); border-bottom: none;
          background: linear-gradient(180deg, rgba(84,199,248,0.055) 0%, rgba(84,199,248,0.02) 100%);
          backdrop-filter: blur(2px);
          padding: 28px 28px 0;
          overflow: visible;
        }
        .pf-hero-card.card-vip {
          border-color: rgba(251,191,36,0.22);
          background: linear-gradient(180deg, rgba(251,191,36,0.07) 0%, rgba(251,191,36,0.02) 100%);
        }
        .pf-hero-card.card-streamer {
          border-color: rgba(74,222,128,0.20);
          background: linear-gradient(180deg, rgba(74,222,128,0.07) 0%, rgba(74,222,128,0.02) 100%);
        }

        .pf-hero-inner {
          display: grid; grid-template-columns: auto 1fr auto;
          align-items: start; gap: 0 24px; padding-bottom: 24px;
        }

        /* ── AVATAR ── */
        .pf-avatar-col { position: relative; flex-shrink: 0; }

        .pf-avatar-ring {
          width: 118px; height: 118px; border-radius: 32px; padding: 3px;
          background: linear-gradient(145deg, var(--sky) 0%, var(--sky3) 60%, rgba(84,199,248,0.15) 100%);
          animation: ringGlow 6s ease-in-out infinite alternate; flex-shrink: 0;
          position: relative;
        }
        @keyframes ringGlow {
          from { box-shadow: 0 0 18px rgba(84,199,248,0.18), 0 16px 48px rgba(0,0,0,0.55); }
          to   { box-shadow: 0 0 46px rgba(84,199,248,0.42), 0 20px 60px rgba(0,0,0,0.6); }
        }
        .pf-avatar-ring.ring-vip {
          background: linear-gradient(145deg, var(--vip-a) 0%, var(--vip-b) 50%, var(--vip-c) 100%);
          animation: ringGlowVip 5s ease-in-out infinite alternate;
        }
        @keyframes ringGlowVip {
          from { box-shadow: 0 0 22px rgba(251,191,36,0.3),  0 16px 48px rgba(0,0,0,0.6); }
          to   { box-shadow: 0 0 60px rgba(251,191,36,0.65), 0 20px 60px rgba(0,0,0,0.6); }
        }
        .pf-avatar-ring.ring-streamer {
          background: linear-gradient(145deg, var(--str-a) 0%, var(--str-b) 50%, var(--str-c) 100%);
          animation: ringGlowStreamer 5s ease-in-out infinite alternate;
        }
        @keyframes ringGlowStreamer {
          from { box-shadow: 0 0 22px rgba(74,222,128,0.28), 0 16px 48px rgba(0,0,0,0.6); }
          to   { box-shadow: 0 0 58px rgba(74,222,128,0.62), 0 20px 60px rgba(0,0,0,0.6); }
        }

        .pf-avatar-inner {
          width: 100%; height: 100%; border-radius: 29px; overflow: hidden;
          background: var(--bg2); display: flex; align-items: center; justify-content: center;
        }
        .pf-avatar-inner img { width: 100%; height: 100%; object-fit: cover; }
        .pf-avatar-placeholder {
          width: 58px; height: 58px; opacity: 0.3;
          filter: brightness(0) invert(1) drop-shadow(0 0 8px rgba(84,199,248,0.4));
        }

        /* Edit button */
        .pf-avatar-edit-btn {
          position: absolute; bottom: -7px; right: -7px;
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, var(--sky), var(--sky3));
          border: 2.5px solid var(--bg); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.25s cubic-bezier(.34,1.56,.64,1);
          box-shadow: 0 4px 16px rgba(84,199,248,0.5); z-index: 5;
        }
        .pf-avatar-edit-btn img { width: 15px; height: 15px; filter: brightness(0) invert(1); }
        .pf-avatar-edit-btn:hover { transform: scale(1.2) rotate(14deg); }

        /* Role badge — bottom-left of avatar */
        .pf-role-badge {
          position: absolute; bottom: -7px; left: -7px; z-index: 5;
          border: 2.5px solid var(--bg); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; overflow: hidden;
        }
        .pf-role-badge.badge-vip {
          background: linear-gradient(135deg, var(--vip-a), var(--vip-b));
          box-shadow: 0 4px 16px rgba(251,191,36,0.6);
        }
        .pf-role-badge.badge-streamer {
          background: linear-gradient(135deg, var(--str-a), var(--str-b));
          box-shadow: 0 4px 16px rgba(74,222,128,0.6);
        }
        .pf-role-badge img { width: 18px; height: 18px; object-fit: contain; filter: brightness(0) invert(1); }

        /* ── ROLE TIER BANNER ── */
        .pf-role-tier {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px 4px 8px; border-radius: 100px;
          font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 800;
          letter-spacing: 1.5px; text-transform: uppercase;
          border: 1.5px solid; margin-top: 2px; width: fit-content;
          transition: all 0.2s;
        }
        .pf-role-tier.tier-viewer {
          background: rgba(84,199,248,0.07); border-color: rgba(84,199,248,0.18);
          color: rgba(84,199,248,0.7);
        }
        .pf-role-tier.tier-vip {
          background: linear-gradient(90deg, rgba(251,191,36,0.14), rgba(245,158,11,0.08));
          border-color: rgba(251,191,36,0.40); color: var(--vip-a);
          box-shadow: 0 0 16px rgba(251,191,36,0.14), inset 0 1px 0 rgba(255,255,255,0.05);
          animation: vipPulse 3s ease-in-out infinite;
        }
        @keyframes vipPulse {
          0%,100% { box-shadow: 0 0 12px rgba(251,191,36,0.14); }
          50%      { box-shadow: 0 0 26px rgba(251,191,36,0.28); }
        }
        .pf-role-tier.tier-streamer {
          background: linear-gradient(90deg, rgba(74,222,128,0.13), rgba(34,197,94,0.07));
          border-color: rgba(74,222,128,0.38); color: var(--str-a);
          box-shadow: 0 0 16px rgba(74,222,128,0.13), inset 0 1px 0 rgba(255,255,255,0.04);
          animation: strPulse 3s ease-in-out infinite;
        }
        @keyframes strPulse {
          0%,100% { box-shadow: 0 0 12px rgba(74,222,128,0.13); }
          50%      { box-shadow: 0 0 26px rgba(74,222,128,0.27); }
        }
        .pf-role-tier-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
          animation: dotBlink 2s ease-in-out infinite;
        }
        .tier-viewer .pf-role-tier-dot  { background: rgba(84,199,248,0.6); animation: none; }
        .tier-vip    .pf-role-tier-dot  { background: var(--vip-a); box-shadow: 0 0 6px var(--vip-a); }
        .tier-streamer .pf-role-tier-dot { background: var(--str-a); box-shadow: 0 0 6px var(--str-a); }
        @keyframes dotBlink { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

        /* ── HERO INFO ── */
        .pf-hero-info { display: flex; flex-direction: column; gap: 5px; animation: fadeUp 0.5s 0.1s both; min-width: 0; }

        .pf-hero-name {
          font-family: 'Syne', sans-serif;
          font-size: clamp(22px, 4vw, 34px); font-weight: 800;
          color: var(--w); letter-spacing: -0.8px; line-height: 1.1;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pf-hero-email { font-size: 12px; color: var(--muted); letter-spacing: 0.3px; }

        .pf-hero-badges { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
        .pf-badge {
          padding: 4px 10px; border-radius: 100px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.4px;
          border: 1px solid; transition: all 0.2s;
        }
        .pf-badge-gender { background: rgba(84,199,248,0.08); border-color: rgba(84,199,248,0.22); color: var(--sky); }
        .pf-badge-age    { background: rgba(59,158,218,0.08);  border-color: rgba(59,158,218,0.22);  color: var(--sky2); }
        .pf-badge-loc    { background: rgba(26,111,168,0.10);  border-color: rgba(26,111,168,0.28);  color: #7ec8f0; }
        .pf-badge-occ    { background: rgba(84,199,248,0.06);  border-color: rgba(84,199,248,0.16);  color: var(--muted); }

        /* Bio — NUNCA cortada, altura libre */
        .pf-hero-bio-preview {
          font-size: 13px; color: var(--muted); line-height: 1.6;
          margin-top: 6px; width: 100%;
          /* Sin clamp, sin overflow hidden, sin -webkit-line-clamp */
          word-break: break-word; white-space: pre-wrap;
        }

        /* ── STATS ── */
        .pf-hero-stats { display: flex; flex-direction: column; gap: 8px; animation: fadeUp 0.5s 0.2s both; }
        .pf-stat-card {
          background: var(--glass); border: 1px solid var(--glass-b);
          border-radius: 14px; padding: 10px 16px;
          display: flex; align-items: center; gap: 10px; min-width: 120px; transition: all 0.2s;
        }
        .pf-stat-card:hover { background: rgba(84,199,248,0.07); border-color: rgba(84,199,248,0.25); transform: translateX(-2px); }
        .pf-stat-icon { width: 28px; height: 28px; opacity: 0.55; filter: drop-shadow(0 0 6px rgba(84,199,248,0.3)); }
        .pf-stat-info { display: flex; flex-direction: column; }
        .pf-stat-val { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: var(--sky); line-height: 1; }
        .pf-stat-key { font-size: 9px; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }

        .pf-completion { position: relative; padding: 16px 0; animation: fadeUp 0.5s 0.25s both; }
        .pf-completion-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
        .pf-completion-label { font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); }
        .pf-completion-pct { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: var(--sky); }
        .pf-completion-track { width: 100%; height: 4px; background: var(--glass-b); border-radius: 100px; overflow: hidden; }
        .pf-completion-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg, var(--sky3), var(--sky));
          transition: width 0.8s cubic-bezier(.4,0,.2,1);
          position: relative; overflow: hidden;
        }
        .pf-completion-fill::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimBar 2s ease-in-out infinite;
        }
        @keyframes shimBar { from { transform: translateX(-200%); } to { transform: translateX(200%); } }

        .pf-tabs-wrap { position: relative; }
        .pf-tabs {
          display: flex; gap: 4px; padding: 12px 0;
          border-bottom: 1px solid var(--glass-b);
          animation: fadeUp 0.5s 0.3s both;
        }
        .pf-tab {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 10px 6px; background: transparent; border: 1px solid transparent;
          border-radius: 12px; font-family: 'Syne', sans-serif;
          font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;
          color: var(--muted); cursor: pointer; transition: all 0.22s ease;
        }
        .pf-tab img { width: 20px; height: 20px; opacity: 0.45; transition: all 0.25s; }
        .pf-tab:hover { color: var(--w); background: var(--glass); }
        .pf-tab:hover img { opacity: 0.8; transform: scale(1.05); }
        .pf-tab.active { background: rgba(84,199,248,0.10); border-color: rgba(84,199,248,0.32); color: var(--sky); }
        .pf-tab.active img { opacity: 1; filter: drop-shadow(0 0 5px rgba(84,199,248,0.7)); transform: scale(1.1); }

        .pf-content { position: relative; padding: 28px 0 0; animation: fadeUp 0.4s 0.35s both; }
        .pf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

        .pf-section-hdr { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .pf-section-hdr img { width: 22px; height: 22px; opacity: 0.7; filter: drop-shadow(0 0 6px rgba(84,199,248,0.35)); }
        .pf-section-hdr-title { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: var(--sky); opacity: 0.8; }
        .pf-section-hdr-line { flex: 1; height: 1px; background: linear-gradient(90deg, var(--glass-b), transparent); }

        .pf-card {
          background: var(--glass); border: 1px solid var(--glass-b);
          border-radius: 18px; padding: 20px;
          transition: border-color 0.2s, background 0.2s;
        }
        .pf-card:focus-within { border-color: rgba(84,199,248,0.3); background: rgba(84,199,248,0.05); }
        .pf-card.pf-card-error { border-color: rgba(248,113,113,0.4) !important; }

        .pf-field { display: flex; flex-direction: column; gap: 6px; }

        .pf-input {
          width: 100%; background: rgba(84,199,248,0.04);
          border: 1px solid rgba(84,199,248,0.10); border-radius: 12px;
          padding: 12px 14px; font-size: 14px; color: var(--w);
          font-family: 'DM Sans', sans-serif; outline: none;
          transition: all 0.2s; resize: none;
        }
        .pf-input::placeholder { color: rgba(84,199,248,0.2); }
        .pf-input:focus { border-color: rgba(84,199,248,0.42); background: rgba(84,199,248,0.07); box-shadow: 0 0 0 3px rgba(84,199,248,0.07); }
        .pf-input.has-error { border-color: rgba(248,113,113,0.5); }
        .pf-input.has-error:focus { border-color: rgba(248,113,113,0.7); box-shadow: 0 0 0 3px rgba(248,113,113,0.08); }

        .pf-field-error { font-size: 11px; color: var(--error); margin-top: 2px; }
        .pf-char { text-align: right; font-size: 10px; color: var(--muted); margin-top: 3px; }

        .pf-pill-row { display: flex; gap: 7px; flex-wrap: wrap; }
        .pf-pill {
          padding: 7px 14px; background: var(--glass); border: 1.5px solid var(--glass-b);
          border-radius: 100px; color: var(--muted);
          font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer;
          transition: all 0.18s; white-space: nowrap;
        }
        .pf-pill.active { background: rgba(84,199,248,0.12); border-color: rgba(84,199,248,0.45); color: var(--sky); }
        .pf-pill:hover:not(.active) { border-color: rgba(84,199,248,0.22); color: var(--w); }

        .pf-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .pf-chip {
          padding: 6px 13px; background: var(--glass); border: 1.5px solid var(--glass-b);
          border-radius: 8px; color: var(--muted);
          font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer;
          transition: all 0.18s;
        }
        .pf-chip.active {
          background: rgba(84,199,248,0.12); border-color: rgba(84,199,248,0.4); color: var(--sky);
          box-shadow: 0 2px 10px rgba(84,199,248,0.12);
        }
        .pf-chip:hover:not(.active) { border-color: rgba(84,199,248,0.2); color: var(--w); }

        /* ── PHOTOS GRID ── */
        .pf-photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

        .pf-photo-slot {
          aspect-ratio: 3/4; border-radius: 14px; overflow: hidden; position: relative;
          background: var(--glass); border: 1.5px dashed var(--glass-b);
          cursor: pointer; transition: all 0.22s ease;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
          user-select: none;
        }
        /* Empty slot hover */
        .pf-photo-slot.empty:hover {
          border-color: rgba(84,199,248,0.4);
          background: rgba(84,199,248,0.07);
          transform: scale(1.02);
        }
        /* Filled slot: solid border */
        .pf-photo-slot.filled {
          border-style: solid;
          border-color: rgba(84,199,248,0.15);
          cursor: grab;
        }
        .pf-photo-slot.filled:active { cursor: grabbing; }

        /* Dragging source: dimmed */
        .pf-photo-slot.dragging-source {
          opacity: 0.38;
          transform: scale(0.96);
          border-color: rgba(84,199,248,0.35);
          transition: opacity 0.15s, transform 0.15s;
        }

        /* Drop target highlight */
        .pf-photo-slot.drop-target {
          border-color: var(--sky) !important;
          border-style: solid !important;
          background: rgba(84,199,248,0.10) !important;
          box-shadow: 0 0 0 2px rgba(84,199,248,0.28), inset 0 0 20px rgba(84,199,248,0.08);
          transform: scale(1.03);
        }
        /* Special glow for slot 0 (will become principal) */
        .pf-photo-slot.drop-target.slot-0 {
          border-color: #fbbf24 !important;
          box-shadow: 0 0 0 2px rgba(251,191,36,0.4), inset 0 0 20px rgba(251,191,36,0.07);
        }

        .pf-photo-slot img.photo-img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
        .pf-photo-add-icon { width: 36px; height: 36px; opacity: 0.2; transition: opacity 0.2s, transform 0.2s; pointer-events: none; }
        .pf-photo-slot.empty:hover .pf-photo-add-icon { opacity: 0.45; transform: scale(1.1); }
        .pf-photo-add-text { font-size: 10px; color: var(--muted); text-align: center; padding: 0 8px; pointer-events: none; }

        .pf-photo-main {
          position: absolute; top: 7px; left: 7px;
          background: linear-gradient(135deg, var(--sky), var(--sky3));
          color: #020d18; font-size: 9px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase;
          padding: 3px 7px; border-radius: 6px; z-index: 2;
          pointer-events: none;
        }
        .pf-photo-rm {
          position: absolute; top: 7px; right: 7px;
          width: 24px; height: 24px; border-radius: 50%;
          background: rgba(0,0,0,0.75); border: none; color: white;
          font-size: 11px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          z-index: 2; transition: background 0.15s;
        }
        .pf-photo-rm:hover { background: rgba(239,68,68,0.8); }

        /* Drag handle icon overlay on filled slots */
        .pf-drag-handle {
          position: absolute; bottom: 7px; left: 50%; transform: translateX(-50%);
          display: flex; align-items: center; gap: 2px;
          opacity: 0; transition: opacity 0.2s; z-index: 3; pointer-events: none;
        }
        .pf-photo-slot.filled:hover .pf-drag-handle { opacity: 1; }
        .pf-drag-handle span {
          display: block; width: 3px; height: 3px; border-radius: 50%;
          background: rgba(255,255,255,0.6);
        }

        /* Drop hint overlay on slot 0 when dragging */
        .pf-photo-slot.drop-target.slot-0::after {
          content: '★ Principal';
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(to top, rgba(251,191,36,0.7), transparent);
          color: #fef08a; font-size: 10px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase;
          padding: 16px 0 8px; text-align: center;
          pointer-events: none; z-index: 4;
        }

        .pf-drag-hint {
          display: flex; align-items: center; gap: 7px;
          font-size: 11px; color: var(--muted);
          padding: 10px 14px;
          background: rgba(84,199,248,0.04);
          border: 1px solid rgba(84,199,248,0.10);
          border-radius: 10px; margin-bottom: 4px;
        }
        .pf-drag-hint-icon { font-size: 14px; flex-shrink: 0; }

        .pf-photos-hint { font-size: 12px; color: var(--muted); line-height: 1.6; text-align: center; padding: 8px 0; }

        .pf-lf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .pf-lf-card {
          padding: 16px 10px; background: var(--glass); border: 1.5px solid var(--glass-b);
          border-radius: 16px; cursor: pointer;
          transition: all 0.22s cubic-bezier(.34,1.56,.64,1);
          display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
        }
        .pf-lf-card:hover { border-color: rgba(84,199,248,0.28); transform: translateY(-3px); }
        .pf-lf-card.active {
          background: rgba(84,199,248,0.09); border-color: rgba(84,199,248,0.45);
          transform: translateY(-3px); box-shadow: 0 8px 24px rgba(84,199,248,0.12);
        }
        .pf-lf-emoji { font-size: 26px; line-height: 1; transition: transform 0.3s; }
        .pf-lf-card.active .pf-lf-emoji { transform: scale(1.2); }
        .pf-lf-card:hover:not(.active) .pf-lf-emoji { transform: scale(1.1); }
        .pf-lf-label { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; color: var(--muted); transition: color 0.2s; }
        .pf-lf-card.active .pf-lf-label { color: var(--sky); }
        .pf-lf-check { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--glass-b); display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .pf-lf-card.active .pf-lf-check { background: var(--sky); border-color: var(--sky); }
        .pf-lf-check-dot { width: 6px; height: 6px; border-radius: 50%; background: #020d18; opacity: 0; transition: opacity 0.2s; }
        .pf-lf-card.active .pf-lf-check-dot { opacity: 1; }

        .pf-actions { display: flex; gap: 10px; margin-top: 6px; }
        .pf-error-banner {
          background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.3);
          border-radius: 12px; padding: 12px 16px;
          font-size: 13px; color: var(--error); display: flex; align-items: center; gap: 8px;
        }
        .pf-btn {
          flex: 1; padding: 14px;
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 50%, var(--sky3) 100%);
          border: none; border-radius: 13px; color: #020d18;
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 0.5px;
          cursor: pointer; transition: all 0.22s;
          box-shadow: 0 6px 22px rgba(84,199,248,0.32);
          position: relative; overflow: hidden;
        }
        .pf-btn::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transform: translateX(-150%); transition: transform 0.55s;
        }
        .pf-btn:hover::after { transform: translateX(150%); }
        .pf-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(84,199,248,0.48); }
        .pf-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
        .pf-btn.saved { background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 6px 22px rgba(34,197,94,0.35); color: white; }
        .pf-btn-ghost {
          padding: 14px 22px; background: transparent;
          border: 1px solid rgba(84,199,248,0.14); border-radius: 13px;
          color: var(--muted); font-family: 'DM Sans', sans-serif;
          font-size: 14px; cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .pf-btn-ghost:hover { background: rgba(84,199,248,0.06); border-color: rgba(84,199,248,0.28); color: var(--sky); }

        .pf-skel { height: 48px; border-radius: 12px; background: var(--glass); animation: shimmer 1.4s ease-in-out infinite; }
        @keyframes shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 680px) {
          .pf-hero-inner { grid-template-columns: auto 1fr; padding-bottom: 20px; gap: 0 18px; }
          .pf-hero-stats { display: none; }
          .pf-hero-card { padding: 20px 18px 0; }
          .pf-wrap { padding: 0 18px; }
          .pf-content { padding: 20px 0 0; }
          .pf-grid-2 { grid-template-columns: 1fr; }
          .pf-photos-grid { grid-template-columns: repeat(2, 1fr); }
          .pf-lf-grid { grid-template-columns: repeat(2, 1fr); }
          .pf-actions { flex-direction: column; }
          .pf-btn-ghost { width: 100%; }
          .pf-avatar-ring { width: 96px; height: 96px; }
          .pf-hero-bio-preview { font-size: 12px; }
        }
      `}</style>

      <div className="pf-flag" />
      <div className="pf-ambient" />

      <div className="pf">

        {/* ════ HERO ════ */}
        <div className={`pf-hero${role === "vip" ? " hero-vip" : role === "streamer" ? " hero-streamer" : ""}`}>
          <div className="pf-wrap">
            <div className={`pf-hero-card${role === "vip" ? " card-vip" : role === "streamer" ? " card-streamer" : ""}`}>
            <div className="pf-hero-inner">

              <div className="pf-avatar-col" style={{ animation: "fadeUp 0.5s 0.05s both" }}>
                <div className={`pf-avatar-ring ${role === "vip" ? "ring-vip" : role === "streamer" ? "ring-streamer" : ""}`}>
                  <div className="pf-avatar-inner">
                    {photos[0]
                      ? <img src={photos[0].url} alt={name || "Avatar"} className="photo-img" />
                      : <img src={imgPerfil.src} alt="" className="pf-avatar-placeholder" aria-hidden="true" />
                    }
                  </div>
                </div>
                <button
                  type="button"
                  className="pf-avatar-edit-btn"
                  onClick={() => setActiveTab("fotos")}
                  aria-label="Ir a editar fotos"
                >
                  <img src={imgCamara.src} alt="" aria-hidden="true" />
                </button>
                {role === "vip" && (
                  <div className="pf-role-badge badge-vip" title="VIP">
                    <img src={imgVip.src} alt="VIP" />
                  </div>
                )}
                {role === "streamer" && (
                  <div className="pf-role-badge badge-streamer" title="Streamer">
                    <img src={imgStreamer.src} alt="Streamer" />
                  </div>
                )}
              </div>

              <div className="pf-hero-info">
                <div className="pf-hero-name">{name || "Tu perfil"}</div>
                <div className="pf-hero-email">{email}</div>

                {/* Role tier pill */}
                {!loading && (
                  <div className={`pf-role-tier ${role === "vip" ? "tier-vip" : role === "streamer" ? "tier-streamer" : "tier-viewer"}`}>
                    <span className="pf-role-tier-dot" />
                    {role === "vip" ? "✦ VIP" : role === "streamer" ? "◉ Streamer" : "Viewer"}
                  </div>
                )}

                {!loading && (
                  <div className="pf-hero-badges">
                    {gender     && <span className="pf-badge pf-badge-gender">{gender}</span>}
                    {age        && <span className="pf-badge pf-badge-age">{age} años</span>}
                    {location   && <span className="pf-badge pf-badge-loc">📍 {location}</span>}
                    {occupation && <span className="pf-badge pf-badge-occ">{occupation}</span>}
                  </div>
                )}
                {bio && <div className="pf-hero-bio-preview">{bio}</div>}
              </div>

              {!loading && (
                <div className="pf-hero-stats">
                  <div className="pf-stat-card">
                    <img src={imgCamara.src} className="pf-stat-icon" alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                    <div className="pf-stat-info">
                      <div className="pf-stat-val">{photos.length}</div>
                      <div className="pf-stat-key">Fotos</div>
                    </div>
                  </div>
                  <div className="pf-stat-card">
                    <img src={imgDiamante.src} className="pf-stat-icon" alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                    <div className="pf-stat-info">
                      <div className="pf-stat-val">{interests.length}</div>
                      <div className="pf-stat-key">Intereses</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>

        {/* Completion bar */}
        {!loading && (
          <div className="pf-wrap">
            <div className="pf-completion">
              <div className="pf-completion-header">
                <span className="pf-completion-label">Completitud del perfil</span>
                <span className="pf-completion-pct">{completionPct}%</span>
              </div>
              <div
                className="pf-completion-track"
                role="progressbar"
                aria-valuenow={completionPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Completitud del perfil"
              >
                <div className="pf-completion-fill" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* ════ TABS ════ */}
        <div className="pf-tabs-wrap">
          <div className="pf-wrap">
            <div className="pf-tabs" role="tablist">
              {tabMeta.map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.id}
                  className={`pf-tab ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  <img
                    src={t.imgSrc}
                    alt=""
                    aria-hidden="true"
                    style={activeTab === t.id ? { filter: "none" } : { filter: "brightness(0) invert(1)" }}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ════ CONTENIDO ════ */}
        {loading ? (
          <div className="pf-wrap">
            <div className="pf-content" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="pf-skel" />
              <div className="pf-skel" />
              <div className="pf-skel" style={{ height: 100 }} />
            </div>
          </div>
        ) : (
          <div className="pf-wrap">
            <div className="pf-content" key={activeTab}>

              {/* ══ TAB: INFO ══ */}
              {activeTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                  <div className="pf-grid-2">
                    <div className={`pf-card pf-field ${errors.name ? "pf-card-error" : ""}`}>
                      <div className="pf-section-hdr">
                        <img src={imgPerfil.src} alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                        <span className="pf-section-hdr-title">Nombre</span>
                        <div className="pf-section-hdr-line" />
                      </div>
                      <input
                        className={`pf-input ${errors.name ? "has-error" : ""}`}
                        placeholder="Tu nombre"
                        value={name}
                        onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
                        maxLength={30}
                        aria-label="Nombre"
                        aria-invalid={!!errors.name}
                        aria-describedby={errors.name ? "error-name" : undefined}
                      />
                      {errors.name && <span id="error-name" className="pf-field-error">{errors.name}</span>}
                    </div>

                    <div className={`pf-card pf-field ${errors.age ? "pf-card-error" : ""}`}>
                      <div className="pf-section-hdr">
                        <img src={imgDiamante.src} alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                        <span className="pf-section-hdr-title">Edad</span>
                        <div className="pf-section-hdr-line" />
                      </div>
                      <input
                        className={`pf-input ${errors.age ? "has-error" : ""}`}
                        type="number"
                        placeholder="18"
                        value={age}
                        onChange={e => { setAge(e.target.value); setErrors(prev => ({ ...prev, age: undefined })); }}
                        min={18}
                        max={99}
                        aria-label="Edad"
                        aria-invalid={!!errors.age}
                        aria-describedby={errors.age ? "error-age" : undefined}
                      />
                      {errors.age && <span id="error-age" className="pf-field-error">{errors.age}</span>}
                    </div>
                  </div>

                  <div className="pf-grid-2">
                    <div className="pf-card pf-field">
                      <div className="pf-section-hdr">
                        <img src={imgPerfil.src} alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                        <span className="pf-section-hdr-title">Ubicación</span>
                        <div className="pf-section-hdr-line" />
                      </div>
                      <input
                        className="pf-input"
                        placeholder="Ciudad, País"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        maxLength={50}
                        aria-label="Ubicación"
                      />
                    </div>

                    <div className="pf-card pf-field">
                      <div className="pf-section-hdr">
                        <img src={imgDiamante.src} alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                        <span className="pf-section-hdr-title">Ocupación</span>
                        <div className="pf-section-hdr-line" />
                      </div>
                      <input
                        className="pf-input"
                        placeholder="¿A qué te dedicás?"
                        value={occupation}
                        onChange={e => setOccupation(e.target.value)}
                        maxLength={50}
                        aria-label="Ocupación"
                      />
                    </div>
                  </div>

                  <div className="pf-card pf-field">
                    <div className="pf-section-hdr">
                      <img src={imgPerfil.src} alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                      <span className="pf-section-hdr-title">Género</span>
                      <div className="pf-section-hdr-line" />
                    </div>
                    <div className="pf-pill-row" role="group" aria-label="Género">
                      {GENDERS.map(g => (
                        <button
                          key={g}
                          type="button"
                          className={`pf-pill ${gender === g ? "active" : ""}`}
                          onClick={() => setGender(gender === g ? "" : g)}
                          aria-pressed={gender === g}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pf-card pf-field">
                    <div className="pf-section-hdr">
                      <img src={imgDiamante.src} alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                      <span className="pf-section-hdr-title">Idiomas</span>
                      <div className="pf-section-hdr-line" />
                      <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>Podés elegir varios</span>
                    </div>
                    <div className="pf-pill-row" role="group" aria-label="Idiomas">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang}
                          type="button"
                          className={`pf-pill ${languages.includes(lang) ? "active" : ""}`}
                          onClick={() => toggleLanguage(lang)}
                          aria-pressed={languages.includes(lang)}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pf-card pf-field">
                    <div className="pf-section-hdr">
                      <img src={imgDiamante.src} alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                      <span className="pf-section-hdr-title">Bio</span>
                      <div className="pf-section-hdr-line" />
                    </div>
                    <textarea
                      className="pf-input"
                      rows={4}
                      placeholder="Contá algo sobre vos, qué te apasiona, qué te hace único..."
                      value={bio}
                      onChange={e => setBio(e.target.value.slice(0, 200))}
                      aria-label="Biografía"
                    />
                    <div className="pf-char">{bio.length}/200</div>
                  </div>

                  {saveError && (
                    <div className="pf-error-banner" role="alert">⚠️ {saveError}</div>
                  )}

                  <div className="pf-actions">
                    <button
                      type="button"
                      className={`pf-btn ${saved ? "saved" : ""}`}
                      onClick={save}
                      disabled={saving}
                      aria-busy={saving}
                    >
                      {saved ? "✓ Cambios guardados" : saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button type="button" className="pf-btn-ghost" onClick={logout}>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}

              {/* ══ TAB: FOTOS ══ */}
              {activeTab === "fotos" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div className="pf-card">
                    <div className="pf-section-hdr" style={{ marginBottom: 12 }}>
                      <img src={imgCamara.src} alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                      <span className="pf-section-hdr-title">Mis fotos</span>
                      <div className="pf-section-hdr-line" />
                      <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {photos.length}/6
                      </span>
                    </div>

                    {/* Drag hint — solo cuando hay más de 1 foto */}
                    {photos.length > 1 && (
                      <div className="pf-drag-hint" style={{ marginBottom: 14 }}>
                        <span className="pf-drag-hint-icon">⇄</span>
                        <span>Arrastrá cualquier foto al primer casillero para convertirla en principal</span>
                      </div>
                    )}

                    <div className="pf-photos-grid">
                      {[0, 1, 2, 3, 4, 5].map(idx => {
                        const hasPhoto    = !!photos[idx];
                        const isDraggingSrc = dragIdx === idx;
                        const isDropTarget  = dragIdx !== null && dragIdx !== idx && overIdx === idx;

                        return (
                          <div
                            key={idx}
                            data-slot-idx={idx}
                            className={[
                              "pf-photo-slot",
                              hasPhoto ? "filled" : "empty",
                              isDraggingSrc ? "dragging-source" : "",
                              isDropTarget  ? `drop-target slot-${idx}` : "",
                            ].filter(Boolean).join(" ")}
                            /* ── Desktop drag ── */
                            draggable={hasPhoto}
                            onDragStart={e  => handleDragStart(e, idx)}
                            onDragOver={e   => handleDragOver(e, idx)}
                            onDragLeave={   () => handleDragLeave()}
                            onDrop={e       => handleDrop(e, idx)}
                            onDragEnd={     () => handleDragEnd()}
                            /* ── Mobile touch ── */
                            onTouchStart={  () => handleTouchStart(idx)}
                            onTouchMove={e  => handleTouchMove(e)}
                            onTouchEnd={    () => handleTouchEnd()}
                            /* ── Click to add (empty slots) ── */
                            onClick={() => !hasPhoto && fileRef.current?.click()}
                            role={!hasPhoto ? "button" : undefined}
                            tabIndex={!hasPhoto ? 0 : undefined}
                            aria-label={
                              !hasPhoto
                                ? idx === 0 ? "Agregar foto principal" : `Agregar foto ${idx + 1}`
                                : idx === 0 ? "Foto principal (arrastrá para reorganizar)" : `Foto ${idx + 1} (arrastrá para reorganizar)`
                            }
                            onKeyDown={e => !hasPhoto && e.key === "Enter" && fileRef.current?.click()}
                          >
                            {hasPhoto ? (
                              <>
                                <img src={photos[idx].url} alt={`Foto ${idx + 1}`} className="photo-img" />
                                {idx === 0 && <div className="pf-photo-main">Principal</div>}
                                <button
                                  type="button"
                                  className="pf-photo-rm"
                                  onClick={e => { e.stopPropagation(); removePhoto(idx); }}
                                  aria-label={`Eliminar foto ${idx + 1}`}
                                >
                                  ✕
                                </button>
                                {/* Drag handle dots */}
                                <div className="pf-drag-handle" aria-hidden="true">
                                  {[0,1,2,3,4,5].map(d => <span key={d} />)}
                                </div>
                              </>
                            ) : (
                              <>
                                <img src={imgCamara.src} alt="" aria-hidden="true" className="pf-photo-add-icon" style={{ filter: "brightness(0) invert(1)" }} />
                                <div className="pf-photo-add-text">
                                  {idx === 0 ? "Foto principal" : "Agregar foto"}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    style={{ display: "none" }}
                    onChange={handlePhotoAdd}
                    aria-hidden="true"
                  />

                  <p className="pf-photos-hint">
                    La primera foto es tu foto principal — la que ven todos.<br />
                    JPG, PNG o WEBP · Máximo 6 fotos
                  </p>

                  {saveError && (
                    <div className="pf-error-banner" role="alert">⚠️ {saveError}</div>
                  )}

                  <div className="pf-actions">
                    <button
                      type="button"
                      className={`pf-btn ${saved ? "saved" : ""}`}
                      onClick={save}
                      disabled={saving}
                      aria-busy={saving}
                    >
                      {saved ? "✓ Fotos guardadas" : saving ? "Guardando..." : "Guardar fotos"}
                    </button>
                  </div>
                </div>
              )}

              {/* ══ TAB: VIBE ══ */}
              {activeTab === "vibe" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                  <div className="pf-card">
                    <div className="pf-section-hdr" style={{ marginBottom: 16 }}>
                      <img src={imgDiamante.src} alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                      <span className="pf-section-hdr-title">¿Qué buscás?</span>
                      <div className="pf-section-hdr-line" />
                      <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>Podés elegir varios</span>
                    </div>
                    <div className="pf-lf-grid" role="group" aria-label="Qué buscás">
                      {LOOKING_FOR_ALL.map(lf => (
                        <button
                          key={lf.id}
                          type="button"
                          className={`pf-lf-card ${lookingFor.includes(lf.id) ? "active" : ""}`}
                          onClick={() => toggleLookingFor(lf.id)}
                          aria-pressed={lookingFor.includes(lf.id)}
                        >
                          <div className="pf-lf-check" aria-hidden="true">
                            <div className="pf-lf-check-dot" />
                          </div>
                          <div className="pf-lf-emoji">{lf.emoji}</div>
                          <div className="pf-lf-label">{lf.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pf-card">
                    <div className="pf-section-hdr" style={{ marginBottom: 16 }}>
                      <img src={imgPerfil.src} alt="" aria-hidden="true" style={{ filter: "brightness(0) invert(1)" }} />
                      <span className="pf-section-hdr-title">Intereses</span>
                      <div className="pf-section-hdr-line" />
                      <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {interests.length} seleccionados
                      </span>
                    </div>
                    <div className="pf-chips" role="group" aria-label="Intereses">
                      {INTEREST_OPTIONS.map(interest => (
                        <button
                          key={interest}
                          type="button"
                          className={`pf-chip ${interests.includes(interest) ? "active" : ""}`}
                          onClick={() => toggleInterest(interest)}
                          aria-pressed={interests.includes(interest)}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>

                  {saveError && (
                    <div className="pf-error-banner" role="alert">⚠️ {saveError}</div>
                  )}

                  <div className="pf-actions">
                    <button
                      type="button"
                      className={`pf-btn ${saved ? "saved" : ""}`}
                      onClick={save}
                      disabled={saving}
                      aria-busy={saving}
                    >
                      {saved ? "✓ Vibe guardada" : saving ? "Guardando..." : "Guardar vibe"}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </>
  );
}