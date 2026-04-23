"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";
import imgCamara   from "../../Images/camara.png";
import imgDiamante from "../../Images/diamante.png";
import imgPerfil   from "../../Images/perfil.png";

const LOOKING_FOR_ALL = [
  { id: "friends", label: "Amigos",   img: imgPerfil   },
  { id: "dates",   label: "Citas",    img: imgDiamante },
  { id: "chat",    label: "Charlar",  img: imgDiamante },
  { id: "network", label: "Streamer", img: imgCamara   },
];

const GENDERS = ["Hombre", "Mujer", "No binario", "Prefiero no decir"];

type Photo = { file?: File; url: string; isNew?: boolean };
type Tab = "info" | "fotos" | "vibe";

export default function ProfilePage() {
  const router   = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [activeTab,  setActiveTab]  = useState<Tab>("info");
  const [mounted,    setMounted]    = useState(false);

  const [userId,     setUserId]     = useState("");
  const [email,      setEmail]      = useState("");
  const [name,       setName]       = useState("");
  const [age,        setAge]        = useState("");
  const [bio,        setBio]        = useState("");
  const [gender,     setGender]     = useState("");
  const [interests,  setInterests]  = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [photos,     setPhotos]     = useState<Photo[]>([]);

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

  const toggleLookingFor = (id: string) =>
    setLookingFor(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - photos.length;
    const newPhotos: Photo[] = files.slice(0, remaining).map(f => ({
      file: f, url: URL.createObjectURL(f), isNew: true,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  const removePhoto = (idx: number) =>
    setPhotos(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
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
    setPhotos(finalUrls.map(url => ({ url })));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const tabMeta: { id: Tab; label: string; icon: typeof imgPerfil }[] = [
    { id: "info",  label: "Info",  icon: imgPerfil   },
    { id: "fotos", label: "Fotos", icon: imgCamara   },
    { id: "vibe",  label: "Vibe",  icon: imgDiamante },
  ];

  /* ── completion score ── */
  const completionItems = [
    !!name, !!age, !!bio, !!gender, photos.length > 0, lookingFor.length > 0,
  ];
  const completionPct = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --sky:       #54c7f8;
          --sky2:      #3b9eda;
          --sky3:      #1a6fa8;
          --sky-glow:  rgba(84,199,248,0.38);
          --sky-dim:   rgba(84,199,248,0.08);
          --w:         #f0f6ff;
          --bg:        #030a14;
          --bg2:       #060f1e;
          --glass:     rgba(84,199,248,0.04);
          --glass-b:   rgba(84,199,248,0.12);
          --muted:     rgba(180,215,240,0.45);
          --success:   #22c55e;
        }

        /* ─── ROOT ─── */
        .pf {
          min-height: 100dvh;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          padding-bottom: 100px;
        }

        /* ─── AMBIENT BACKGROUND ─── */
        .pf-ambient {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          overflow: hidden;
        }
        .pf-ambient::before {
          content: '';
          position: absolute;
          width: 800px; height: 800px;
          top: -200px; right: -200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(84,199,248,0.09) 0%, transparent 65%);
          animation: orb1 12s ease-in-out infinite alternate;
        }
        .pf-ambient::after {
          content: '';
          position: absolute;
          width: 600px; height: 600px;
          bottom: -150px; left: -150px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59,158,218,0.07) 0%, transparent 65%);
          animation: orb2 16s ease-in-out infinite alternate;
        }
        @keyframes orb1 { from { transform: translate(0,0) scale(1); } to { transform: translate(-40px,60px) scale(1.15); } }
        @keyframes orb2 { from { transform: translate(0,0) scale(1); } to { transform: translate(50px,-40px) scale(1.1); } }

        /* ─── FLAG STRIPE ─── */
        .pf-flag {
          position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 300;
          background: linear-gradient(90deg,
            var(--sky) 0%, var(--sky) 33%,
            rgba(245,248,255,0.8) 33%, rgba(245,248,255,0.8) 66%,
            var(--sky) 66%, var(--sky) 100%);
          opacity: 0.6;
        }

        /* ─── HERO BANNER ─── */
        .pf-hero {
          position: relative; z-index: 1;
          width: 100%;
          background: linear-gradient(180deg, rgba(84,199,248,0.06) 0%, transparent 100%);
          border-bottom: 1px solid var(--glass-b);
          padding: 56px 0 0;
          overflow: hidden;
        }

        /* Scanline decorative lines */
        .pf-hero::before {
          content: '';
          position: absolute; inset: 0;
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 39px,
            rgba(84,199,248,0.025) 39px,
            rgba(84,199,248,0.025) 40px
          );
          pointer-events: none;
        }

        .pf-hero-inner {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: start;
          gap: 0 28px;
          padding-bottom: 28px;
        }

        /* ─── AVATAR ─── */
        .pf-avatar-col { position: relative; }

        .pf-avatar-ring {
          width: 108px; height: 108px;
          border-radius: 28px;
          padding: 3px;
          background: linear-gradient(135deg, var(--sky), var(--sky3), rgba(84,199,248,0.2));
          animation: ringGlow 5s ease-in-out infinite alternate;
          flex-shrink: 0;
        }
        @keyframes ringGlow {
          from { box-shadow: 0 0 20px rgba(84,199,248,0.2), 0 20px 50px rgba(0,0,0,0.6); }
          to   { box-shadow: 0 0 50px rgba(84,199,248,0.45), 0 20px 60px rgba(0,0,0,0.6); }
        }

        .pf-avatar-inner {
          width: 100%; height: 100%;
          border-radius: 25px;
          overflow: hidden;
          background: var(--bg2);
          display: flex; align-items: center; justify-content: center;
        }

        .pf-avatar-inner img { width: 100%; height: 100%; object-fit: cover; }

        .pf-avatar-placeholder {
          width: 58px; height: 58px; opacity: 0.3;
          filter: brightness(0) invert(1) drop-shadow(0 0 8px rgba(84,199,248,0.4));
        }

        .pf-avatar-edit-btn {
          position: absolute; bottom: -6px; right: -6px;
          width: 30px; height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--sky), var(--sky3));
          border: 2.5px solid var(--bg);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.25s cubic-bezier(.34,1.56,.64,1);
          box-shadow: 0 4px 14px rgba(84,199,248,0.45);
        }
        .pf-avatar-edit-btn img { width: 16px; height: 16px; filter: brightness(0) invert(1); }
        .pf-avatar-edit-btn:hover { transform: scale(1.18) rotate(12deg); }

        /* ─── HERO CENTER ─── */
        .pf-hero-info {
          display: flex; flex-direction: column; gap: 6px;
          animation: fadeUp 0.5s 0.1s both;
        }

        .pf-hero-name {
          font-family: 'Syne', sans-serif;
          font-size: clamp(22px, 4vw, 32px);
          font-weight: 800;
          color: var(--w);
          letter-spacing: -0.8px;
          line-height: 1.1;
        }

        .pf-hero-email {
          font-size: 12px; color: var(--muted);
          letter-spacing: 0.3px;
        }

        .pf-hero-badges {
          display: flex; gap: 6px; flex-wrap: wrap;
          margin-top: 4px;
        }

        .pf-badge {
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.5px;
          border: 1px solid;
          transition: all 0.2s;
        }
        .pf-badge-gender {
          background: rgba(84,199,248,0.08);
          border-color: rgba(84,199,248,0.22);
          color: var(--sky);
        }
        .pf-badge-age {
          background: rgba(59,158,218,0.08);
          border-color: rgba(59,158,218,0.22);
          color: var(--sky2);
        }

        .pf-hero-bio-preview {
          font-size: 13px; color: var(--muted);
          line-height: 1.55;
          max-width: 360px;
          margin-top: 2px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ─── HERO RIGHT: STATS ─── */
        .pf-hero-stats {
          display: flex; flex-direction: column; gap: 8px;
          animation: fadeUp 0.5s 0.2s both;
        }

        .pf-stat-card {
          background: var(--glass);
          border: 1px solid var(--glass-b);
          border-radius: 14px;
          padding: 10px 16px;
          display: flex; align-items: center; gap: 10px;
          min-width: 120px;
          transition: all 0.2s;
        }
        .pf-stat-card:hover {
          background: rgba(84,199,248,0.07);
          border-color: rgba(84,199,248,0.25);
          transform: translateX(-2px);
        }
        .pf-stat-icon { width: 28px; height: 28px; opacity: 0.55; filter: drop-shadow(0 0 6px rgba(84,199,248,0.3)); }
        .pf-stat-info { display: flex; flex-direction: column; }
        .pf-stat-val {
          font-family: 'Syne', sans-serif;
          font-size: 18px; font-weight: 800; color: var(--sky);
          line-height: 1;
        }
        .pf-stat-key {
          font-size: 9px; color: var(--muted);
          letter-spacing: 1px; text-transform: uppercase;
          margin-top: 2px;
        }

        /* ─── COMPLETION BAR ─── */
        .pf-completion {
          position: relative;
          padding: 16px 0;
          animation: fadeUp 0.5s 0.25s both;
        }

        .pf-completion-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 7px;
        }
        .pf-completion-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 2px; text-transform: uppercase;
          color: var(--muted);
        }
        .pf-completion-pct {
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 700; color: var(--sky);
        }

        .pf-completion-track {
          width: 100%; height: 4px;
          background: var(--glass-b);
          border-radius: 100px;
          overflow: hidden;
        }
        .pf-completion-fill {
          height: 100%;
          border-radius: 100px;
          background: linear-gradient(90deg, var(--sky3), var(--sky));
          transition: width 0.8s cubic-bezier(.4,0,.2,1);
          position: relative;
          overflow: hidden;
        }
        .pf-completion-fill::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimBar 2s ease-in-out infinite;
        }
        @keyframes shimBar { from { transform: translateX(-200%); } to { transform: translateX(200%); } }

        /* ─── TABS ─── */
        /* ─── SHARED CONTAINER ─── */
        .pf-wrap {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 32px;
        }

        .pf-tabs-wrap {
          position: relative;
        }

        .pf-tabs {
          display: flex; gap: 4px;
          padding: 12px 0;
          border-bottom: 1px solid var(--glass-b);
          animation: fadeUp 0.5s 0.3s both;
        }

        .pf-tab {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 10px 6px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 12px;
          font-family: 'Syne', sans-serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.8px; text-transform: uppercase;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.22s ease;
        }
        .pf-tab img { width: 20px; height: 20px; opacity: 0.45; transition: all 0.25s; }

        .pf-tab:hover { color: var(--w); background: var(--glass); }
        .pf-tab:hover img { opacity: 0.8; transform: scale(1.05); }

        .pf-tab.active {
          background: rgba(84,199,248,0.10);
          border-color: rgba(84,199,248,0.32);
          color: var(--sky);
        }
        .pf-tab.active img { opacity: 1; filter: drop-shadow(0 0 5px rgba(84,199,248,0.7)); transform: scale(1.1); }

        /* ─── CONTENT GRID ─── */
        .pf-content {
          position: relative;
          padding: 28px 0 0;
          animation: fadeUp 0.4s 0.35s both;
        }

        /* Two-column layout on wider screens */
        .pf-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .pf-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .pf-col-span { grid-column: 1 / -1; }

        /* ─── SECTION HEADER ─── */
        .pf-section-hdr {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 12px;
        }
        .pf-section-hdr img {
          width: 26px; height: 26px; opacity: 0.7;
          filter: drop-shadow(0 0 6px rgba(84,199,248,0.35));
        }
        .pf-section-hdr-title {
          font-size: 10px; font-weight: 700;
          letter-spacing: 2.5px; text-transform: uppercase;
          color: var(--sky); opacity: 0.8;
        }
        .pf-section-hdr-line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, var(--glass-b), transparent);
        }

        /* ─── CARD ─── */
        .pf-card {
          background: var(--glass);
          border: 1px solid var(--glass-b);
          border-radius: 18px;
          padding: 20px;
          transition: border-color 0.2s, background 0.2s;
        }
        .pf-card:focus-within {
          border-color: rgba(84,199,248,0.3);
          background: rgba(84,199,248,0.05);
        }

        /* ─── FIELD ─── */
        .pf-field { display: flex; flex-direction: column; gap: 6px; }
        .pf-label {
          font-size: 9px; font-weight: 700;
          letter-spacing: 2.5px; text-transform: uppercase;
          color: var(--sky); opacity: 0.7;
        }

        .pf-input {
          width: 100%;
          background: rgba(84,199,248,0.04);
          border: 1px solid rgba(84,199,248,0.10);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px; color: var(--w);
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.2s;
          resize: none;
        }
        .pf-input::placeholder { color: rgba(84,199,248,0.2); }
        .pf-input:focus {
          border-color: rgba(84,199,248,0.42);
          background: rgba(84,199,248,0.07);
          box-shadow: 0 0 0 3px rgba(84,199,248,0.07);
        }

        .pf-char { text-align: right; font-size: 10px; color: var(--muted); margin-top: 3px; }

        /* ─── GENDER PILLS ─── */
        .pf-gender-row { display: flex; gap: 7px; flex-wrap: wrap; }
        .pf-gender-pill {
          padding: 7px 14px;
          background: var(--glass);
          border: 1.5px solid var(--glass-b);
          border-radius: 100px;
          color: var(--muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
        }
        .pf-gender-pill.active {
          background: rgba(84,199,248,0.12);
          border-color: rgba(84,199,248,0.45);
          color: var(--sky);
        }
        .pf-gender-pill:hover:not(.active) {
          border-color: rgba(84,199,248,0.22);
          color: var(--w);
        }

        /* ─── PHOTOS GRID ─── */
        .pf-photos-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .pf-photo-slot {
          aspect-ratio: 3/4;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          background: var(--glass);
          border: 1.5px dashed var(--glass-b);
          cursor: pointer;
          transition: all 0.22s ease;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 7px;
        }
        .pf-photo-slot:not(.filled):hover {
          border-color: rgba(84,199,248,0.4);
          background: rgba(84,199,248,0.07);
          transform: scale(1.02);
        }
        .pf-photo-slot.filled {
          border-style: solid;
          border-color: rgba(84,199,248,0.15);
          cursor: default;
        }
        .pf-photo-slot img.photo-img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .pf-photo-add-icon { width: 42px; height: 42px; opacity: 0.2; transition: opacity 0.2s, transform 0.2s; }
        .pf-photo-slot:not(.filled):hover .pf-photo-add-icon { opacity: 0.45; transform: scale(1.1); }
        .pf-photo-add-text { font-size: 10px; color: var(--muted); text-align: center; padding: 0 8px; }

        .pf-photo-main {
          position: absolute; top: 7px; left: 7px;
          background: linear-gradient(135deg, var(--sky), var(--sky3));
          color: #020d18; font-size: 9px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase;
          padding: 3px 7px; border-radius: 6px; z-index: 2;
        }

        .pf-photo-rm {
          position: absolute; top: 7px; right: 7px;
          width: 24px; height: 24px; border-radius: 50%;
          background: rgba(0,0,0,0.75); border: none;
          color: white; font-size: 11px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          z-index: 2; transition: background 0.15s;
        }
        .pf-photo-rm:hover { background: rgba(239,68,68,0.8); }

        .pf-photos-hint {
          font-size: 12px; color: var(--muted);
          line-height: 1.6; text-align: center;
          padding: 8px 0;
        }

        /* ─── LOOKING FOR CARDS ─── */
        .pf-lf-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .pf-lf-card {
          padding: 18px 12px;
          background: var(--glass);
          border: 1.5px solid var(--glass-b);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.22s cubic-bezier(.34,1.56,.64,1);
          display: flex; flex-direction: column;
          align-items: center; gap: 10px;
          text-align: center;
        }
        .pf-lf-card:hover { border-color: rgba(84,199,248,0.28); transform: translateY(-3px); }
        .pf-lf-card.active {
          background: rgba(84,199,248,0.09);
          border-color: rgba(84,199,248,0.45);
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(84,199,248,0.12);
        }

        .pf-lf-img {
          width: 56px; height: 56px;
          opacity: 0.35;
          transition: opacity 0.3s, transform 0.3s, filter 0.3s;
          filter: brightness(0) invert(1);
        }
        .pf-lf-card.active .pf-lf-img {
          opacity: 1;
          filter: drop-shadow(0 0 10px var(--sky)) drop-shadow(0 0 22px rgba(84,199,248,0.5));
          transform: scale(1.08);
        }
        .pf-lf-card:hover .pf-lf-img { transform: scale(1.12); opacity: 0.7; filter: brightness(0) invert(1) drop-shadow(0 2px 8px rgba(84,199,248,0.3)); }

        .pf-lf-label {
          font-family: 'Syne', sans-serif;
          font-size: 12px; font-weight: 700;
          color: var(--muted);
          transition: color 0.2s;
        }
        .pf-lf-card.active .pf-lf-label { color: var(--sky); }

        .pf-lf-check {
          width: 18px; height: 18px;
          border-radius: 50%;
          border: 1.5px solid var(--glass-b);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .pf-lf-card.active .pf-lf-check {
          background: var(--sky);
          border-color: var(--sky);
        }
        .pf-lf-check-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #020d18;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .pf-lf-card.active .pf-lf-check-dot { opacity: 1; }

        /* ─── ACTIONS ─── */
        .pf-actions { display: flex; gap: 10px; margin-top: 6px; }

        .pf-btn {
          flex: 1; padding: 14px;
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 50%, var(--sky3) 100%);
          border: none; border-radius: 13px; color: #020d18;
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 800; letter-spacing: 0.5px;
          cursor: pointer; transition: all 0.22s;
          box-shadow: 0 6px 22px rgba(84,199,248,0.32);
          position: relative; overflow: hidden;
        }
        .pf-btn::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transform: translateX(-150%);
          transition: transform 0.55s;
        }
        .pf-btn:hover::after { transform: translateX(150%); }
        .pf-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(84,199,248,0.48); }
        .pf-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
        .pf-btn.saved {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 6px 22px rgba(34,197,94,0.35); color: white;
        }

        .pf-btn-ghost {
          padding: 14px 22px;
          background: transparent;
          border: 1px solid rgba(84,199,248,0.14);
          border-radius: 13px;
          color: var(--muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .pf-btn-ghost:hover {
          background: rgba(84,199,248,0.06);
          border-color: rgba(84,199,248,0.28);
          color: var(--sky);
        }

        /* ─── SKELETON ─── */
        .pf-skel {
          height: 48px; border-radius: 12px;
          background: var(--glass);
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @keyframes shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }

        /* ─── ANIMATIONS ─── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 680px) {
          .pf-hero-inner {
            grid-template-columns: auto 1fr;
            padding-bottom: 22px;
          }
          .pf-hero-stats { display: none; }
          .pf-wrap { padding: 0 18px; }
          .pf-content { padding: 20px 0 0; }
          .pf-grid-2 { grid-template-columns: 1fr; }
          .pf-grid-3 { grid-template-columns: 1fr 1fr; }
          .pf-photos-grid { grid-template-columns: repeat(2, 1fr); }
          .pf-lf-grid { grid-template-columns: 1fr 1fr; }
          .pf-actions { flex-direction: column; }
          .pf-btn-ghost { width: 100%; }
        }
      `}</style>

      {/* ── Ambient & Flag ── */}
      <div className="pf-flag" />
      <div className="pf-ambient" />

      <div className="pf">

        {/* ════ HERO BANNER ════ */}
        <div className="pf-hero">
          <div className="pf-wrap">
          <div className="pf-hero-inner">

            {/* Avatar */}
            <div className="pf-avatar-col" style={{ animation: "fadeUp 0.5s 0.05s both" }}>
              <div className="pf-avatar-ring">
                <div className="pf-avatar-inner">
                  {photos[0]
                    ? <img src={photos[0].url} alt={name} className="photo-img" />
                    : <img src={imgPerfil.src} alt="avatar" className="pf-avatar-placeholder" />
                  }
                </div>
              </div>
              <button className="pf-avatar-edit-btn" onClick={() => setActiveTab("fotos")} title="Editar fotos">
                <img src={imgCamara.src} alt="editar" />
              </button>
            </div>

            {/* Info central */}
            <div className="pf-hero-info">
              <div className="pf-hero-name">{name || "Tu perfil"}</div>
              <div className="pf-hero-email">{email}</div>
              {!loading && (gender || age) && (
                <div className="pf-hero-badges">
                  {gender && <span className="pf-badge pf-badge-gender">{gender}</span>}
                  {age    && <span className="pf-badge pf-badge-age">{age} años</span>}
                </div>
              )}
              {bio && <div className="pf-hero-bio-preview">{bio}</div>}
            </div>

            {/* Stats (desktop) */}
            {!loading && (
              <div className="pf-hero-stats">
                <div className="pf-stat-card">
                  <img src={imgCamara.src} className="pf-stat-icon" alt="fotos" style={{ filter: "brightness(0) invert(1)" }} />
                  <div className="pf-stat-info">
                    <div className="pf-stat-val">{photos.length}</div>
                    <div className="pf-stat-key">Fotos</div>
                  </div>
                </div>
                <div className="pf-stat-card">
                  <img src={imgDiamante.src} className="pf-stat-icon" alt="vibe" style={{ filter: "brightness(0) invert(1)" }} />
                  <div className="pf-stat-info">
                    <div className="pf-stat-val">{lookingFor.length}</div>
                    <div className="pf-stat-key">Vibe</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* ── Completion Bar ── */}
        {!loading && (
          <div className="pf-wrap">
          <div className="pf-completion">
            <div className="pf-completion-header">
              <span className="pf-completion-label">Completitud del perfil</span>
              <span className="pf-completion-pct">{completionPct}%</span>
            </div>
            <div className="pf-completion-track">
              <div className="pf-completion-fill" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
          </div>
        )}

        {/* ════ TABS ════ */}
        <div className="pf-tabs-wrap">
          <div className="pf-wrap">
          <div className="pf-tabs">
            {tabMeta.map(t => (
              <button
                key={t.id}
                className={`pf-tab ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <img
                  src={t.icon.src}
                  alt={t.label}
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

                {/* Row: Nombre + Edad */}
                <div className="pf-grid-2">
                  <div className="pf-card pf-field">
                    <div className="pf-section-hdr">
                      <img src={imgPerfil.src} alt="" style={{ filter: "brightness(0) invert(1)" }} />
                      <span className="pf-section-hdr-title">Nombre</span>
                      <div className="pf-section-hdr-line" />
                    </div>
                    <input className="pf-input" placeholder="Tu nombre"
                      value={name} onChange={e => setName(e.target.value)} maxLength={30} />
                  </div>

                  <div className="pf-card pf-field">
                    <div className="pf-section-hdr">
                      <img src={imgDiamante.src} alt="" style={{ filter: "brightness(0) invert(1)" }} />
                      <span className="pf-section-hdr-title">Edad</span>
                      <div className="pf-section-hdr-line" />
                    </div>
                    <input className="pf-input" type="number" placeholder="18"
                      value={age} onChange={e => setAge(e.target.value)} min={18} max={99} />
                  </div>
                </div>

                {/* Género */}
                <div className="pf-card pf-field">
                  <div className="pf-section-hdr">
                    <img src={imgPerfil.src} alt="" style={{ filter: "brightness(0) invert(1)" }} />
                    <span className="pf-section-hdr-title">Género</span>
                    <div className="pf-section-hdr-line" />
                  </div>
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

                {/* Bio */}
                <div className="pf-card pf-field" style={{ gridColumn: "1/-1" }}>
                  <div className="pf-section-hdr">
                    <img src={imgDiamante.src} alt="" style={{ filter: "brightness(0) invert(1)" }} />
                    <span className="pf-section-hdr-title">Bio</span>
                    <div className="pf-section-hdr-line" />
                  </div>
                  <textarea className="pf-input" rows={4}
                    placeholder="Contá algo sobre vos, qué te apasiona, qué te hace único..."
                    value={bio} onChange={e => setBio(e.target.value.slice(0, 160))} />
                  <div className="pf-char">{bio.length}/160</div>
                </div>

                {/* Acciones */}
                <div className="pf-actions">
                  <button className={`pf-btn ${saved ? "saved" : ""}`} onClick={save} disabled={saving}>
                    {saved ? "✓ Cambios guardados" : saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button className="pf-btn-ghost" onClick={logout}>Cerrar sesión</button>
                </div>

              </div>
            )}

            {/* ══ TAB: FOTOS ══ */}
            {activeTab === "fotos" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                <div className="pf-card">
                  <div className="pf-section-hdr" style={{ marginBottom: 16 }}>
                    <img src={imgCamara.src} alt="" style={{ filter: "brightness(0) invert(1)" }} />
                    <span className="pf-section-hdr-title">Mis fotos</span>
                    <div className="pf-section-hdr-line" />
                    <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {photos.length}/4
                    </span>
                  </div>

                  <div className="pf-photos-grid">
                    {[0, 1, 2, 3].map(idx => (
                      <div
                        key={idx}
                        className={`pf-photo-slot ${photos[idx] ? "filled" : ""}`}
                        onClick={() => !photos[idx] && fileRef.current?.click()}
                      >
                        {photos[idx] ? (
                          <>
                            <img src={photos[idx].url} alt="" className="photo-img" />
                            {idx === 0 && <div className="pf-photo-main">Principal</div>}
                            <button className="pf-photo-rm"
                              onClick={e => { e.stopPropagation(); removePhoto(idx); }}>
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <img src={imgCamara.src} alt="" className="pf-photo-add-icon" style={{ filter: "brightness(0) invert(1)" }} />
                            <div className="pf-photo-add-text">
                              {idx === 0 ? "Foto principal" : "Agregar foto"}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <input ref={fileRef} type="file" accept="image/*" multiple
                  style={{ display: "none" }} onChange={handlePhotoAdd} />

                <p className="pf-photos-hint">
                  La primera foto es tu foto principal — la que ven todos.<br />
                  JPG, PNG o WEBP · Máximo 4 fotos
                </p>

                <div className="pf-actions">
                  <button className={`pf-btn ${saved ? "saved" : ""}`} onClick={save} disabled={saving}>
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
                    <img src={imgDiamante.src} alt="" style={{ filter: "brightness(0) invert(1)" }} />
                    <span className="pf-section-hdr-title">¿Qué buscás?</span>
                    <div className="pf-section-hdr-line" />
                    <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                      Podés elegir varios
                    </span>
                  </div>

                  <div className="pf-lf-grid">
                    {LOOKING_FOR_ALL.map(lf => (
                      <button
                        key={lf.id}
                        className={`pf-lf-card ${lookingFor.includes(lf.id) ? "active" : ""}`}
                        onClick={() => toggleLookingFor(lf.id)}
                      >
                        <div className="pf-lf-check">
                          <div className="pf-lf-check-dot" />
                        </div>
                        <img
                          src={lf.img.src}
                          className="pf-lf-img"
                          alt={lf.label}
                          style={lookingFor.includes(lf.id)
                            ? { filter: "drop-shadow(0 0 6px var(--sky))" }
                            : { filter: "brightness(0) invert(1)" }
                          }
                        />
                        <div className="pf-lf-label">{lf.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pf-actions">
                  <button className={`pf-btn ${saved ? "saved" : ""}`} onClick={save} disabled={saving}>
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