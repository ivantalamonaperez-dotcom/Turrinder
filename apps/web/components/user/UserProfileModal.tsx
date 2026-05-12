"use client";

/**
 * UserProfileModal — Tamaño fijo, scroll interno, secciones siempre visibles,
 * colores azul del sistema de perfil, badges VIP/Streamer destacados.
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/services/supabase.client";

export interface MatchUserProfile {
  id?: string;
  name?: string;
  age?: number;
  avatar_url?: string;
  bio?: string;
  photos?: string[];
  interests?: string[];
  looking_for?: string[];
  gender?: string;
  role?: "viewer" | "vip" | "streamer";
}

interface Props {
  user: MatchUserProfile | null;
  isConnected?: boolean;
  visible: boolean;
  onClose: () => void;
  onReport?: (userId: string) => void;
  /** ID del usuario que está viendo el modal (el que reporta) */
  reporterId?: string;
}

export default function UserProfileModal({
  user,
  isConnected = false,
  visible,
  onClose,
  onReport,
  reporterId,
}: Props) {
  const [activePhoto, setActivePhoto] = useState(0);
  const [reportState, setReportState] = useState<"idle" | "confirm" | "sent">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      setActivePhoto(0);
      setReportState("idle");
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [visible, user]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  if (!user) return null;

  const initials      = user.name?.[0]?.toUpperCase() ?? "?";
  const hasPhotos     = (user.photos?.length ?? 0) > 0;
  const hasInterests  = (user.interests?.length ?? 0) > 0;
  const hasLookingFor = (user.looking_for?.length ?? 0) > 0;
  const hasBio        = !!user.bio?.trim();
  const isVip         = user.role === "vip";
  const isStreamer     = user.role === "streamer";
  const hasRole       = isVip || isStreamer;

  const handleReport = async () => {
    if (reportState === "idle") {
      setReportState("confirm");
      return;
    }
    if (reportState === "confirm") {
      try {
        await supabase.from("reports").insert({
          reporter_user_id: reporterId ?? null,
          reported_user_id: user.id ?? null,
          reported_name:    user.name ?? null,
          reason:           "Reporte de usuario",
          details:          null,
          status:           "pending",
        });
      } catch (_) {
        // fallo silencioso — igual mostramos "enviado"
      }
      onReport?.(user.id ?? "");
      setReportState("sent");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');

        /* ── Design tokens (mismo sistema que page.tsx) ── */
        .upm-overlay {
          --sky:      #54c7f8;
          --sky2:     #3b9eda;
          --sky3:     #1a6fa8;
          --bg:       #030a14;
          --bg2:      #060f1e;
          --glass:    rgba(84,199,248,0.04);
          --glass-b:  rgba(84,199,248,0.12);
          --muted:    rgba(180,215,240,0.45);
          --w:        #f0f6ff;
          --vip-a:    #fbbf24;
          --vip-b:    #f59e0b;
          --vip-c:    #92400e;
          --str-a:    #4ade80;
          --str-b:    #22c55e;
          --str-c:    #14532d;
        }

        .upm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background: rgba(3,10,20,0.88);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          padding: 16px;
          opacity: 0; pointer-events: none;
          transition: opacity 0.25s ease;
        }
        .upm-overlay.upm-open { opacity: 1; pointer-events: auto; }

        /* ── Shell tamaño FIJO ── */
        .upm-shell {
          position: relative;
          width: min(420px, 100%);
          height: min(680px, 90dvh);
          background: var(--bg2);
          border: 1px solid var(--glass-b);
          border-radius: 24px;
          overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow:
            0 0 0 1px rgba(84,199,248,0.06),
            0 32px 80px rgba(0,0,0,0.75),
            0 0 80px rgba(84,199,248,0.04);
          transform: translateY(18px) scale(0.97);
          transition: transform 0.3s cubic-bezier(0.34,1.4,0.64,1);
        }
        .upm-overlay.upm-open .upm-shell { transform: translateY(0) scale(1); }

        .upm-shell.shell-vip {
          border-color: rgba(251,191,36,0.22);
          box-shadow:
            0 0 0 1px rgba(251,191,36,0.12),
            0 32px 80px rgba(0,0,0,0.75),
            0 0 80px rgba(251,191,36,0.08);
        }
        .upm-shell.shell-streamer {
          border-color: rgba(74,222,128,0.20);
          box-shadow:
            0 0 0 1px rgba(74,222,128,0.10),
            0 32px 80px rgba(0,0,0,0.75),
            0 0 80px rgba(74,222,128,0.07);
        }

        /* ── Cerrar ── */
        .upm-close {
          position: absolute; top: 14px; right: 14px; z-index: 10;
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(3,10,20,0.75);
          border: 1px solid rgba(84,199,248,0.15);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(180,215,240,0.6);
          transition: all 0.2s; flex-shrink: 0;
        }
        .upm-close:hover {
          background: rgba(84,199,248,0.12);
          border-color: rgba(84,199,248,0.4);
          color: var(--sky);
        }

        /* ── Hero ── */
        .upm-hero {
          position: relative; width: 100%; height: 190px;
          flex-shrink: 0;
          background: linear-gradient(135deg, #060f1e 0%, #030a14 100%);
          overflow: hidden;
        }
        .upm-hero::before {
          content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background-image: repeating-linear-gradient(
            0deg, transparent, transparent 39px,
            rgba(84,199,248,0.025) 39px, rgba(84,199,248,0.025) 40px
          );
        }
        .upm-hero-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; object-position: center top; z-index: 0;
        }
        .upm-hero-overlay {
          position: absolute; inset: 0; z-index: 2;
          background: linear-gradient(to bottom, transparent 25%, var(--bg2) 100%);
        }
        .upm-hero-empty {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px;
          background: repeating-linear-gradient(
            45deg,
            rgba(84,199,248,0.018) 0px, rgba(84,199,248,0.018) 1px,
            transparent 1px, transparent 12px
          ), linear-gradient(135deg, #060f1e, #030a14);
        }
        .upm-hero-empty-icon {
          width: 52px; height: 52px; border-radius: 50%;
          background: rgba(84,199,248,0.06);
          border: 1.5px dashed rgba(84,199,248,0.2);
          display: flex; align-items: center; justify-content: center; font-size: 22px;
        }
        .upm-hero-empty-text {
          font-family: 'DM Sans', sans-serif; font-size: 12px;
          color: rgba(84,199,248,0.25); letter-spacing: 0.5px;
        }

        /* Barra de rol en el tope del hero */
        .upm-role-hero-banner {
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px; z-index: 5;
        }
        .upm-role-hero-banner.banner-vip {
          background: linear-gradient(90deg, transparent, var(--vip-a), var(--vip-b), var(--vip-a), transparent);
          box-shadow: 0 0 16px rgba(251,191,36,0.7);
        }
        .upm-role-hero-banner.banner-streamer {
          background: linear-gradient(90deg, transparent, var(--str-a), var(--str-b), var(--str-a), transparent);
          box-shadow: 0 0 16px rgba(74,222,128,0.7);
        }

        /* Status badge */
        .upm-status-badge {
          position: absolute; top: 14px; left: 14px; z-index: 6;
          display: flex; align-items: center; gap: 6px;
          padding: 4px 10px 4px 7px;
          background: rgba(3,10,20,0.75);
          border: 1px solid rgba(84,199,248,0.18);
          border-radius: 100px; backdrop-filter: blur(8px);
          font-family: 'DM Sans', sans-serif; font-size: 11px; color: var(--muted);
        }
        .upm-status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .upm-status-dot.live { background: #22c55e; box-shadow: 0 0 6px #22c55e; animation: upmBlink 2s infinite; }
        .upm-status-dot.waiting { background: rgba(180,215,240,0.2); }
        @keyframes upmBlink { 0%,100%{ opacity:1; } 50%{ opacity:0.3; } }

        /* ── Body scroll ── */
        .upm-body {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 0 20px 24px;
          scrollbar-width: thin;
          scrollbar-color: rgba(84,199,248,0.2) transparent;
        }
        .upm-body::-webkit-scrollbar { width: 4px; }
        .upm-body::-webkit-scrollbar-track { background: transparent; }
        .upm-body::-webkit-scrollbar-thumb { background: rgba(84,199,248,0.2); border-radius: 4px; }

        /* ── Identity ── */
        .upm-identity {
          display: flex; align-items: flex-start; gap: 14px;
          margin-top: 16px; margin-bottom: 18px;
          position: relative; z-index: 2;
        }

        /* Avatar con ring — columna para que el badge quede abajo sin solaparse */
        .upm-avatar-wrap {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; flex-shrink: 0;
        }
        .upm-avatar-ring {
          width: 68px; height: 68px; border-radius: 20px; padding: 2.5px;
          background: linear-gradient(145deg, var(--sky) 0%, var(--sky3) 60%, rgba(84,199,248,0.15) 100%);
          animation: upmRingGlow 6s ease-in-out infinite alternate;
          flex-shrink: 0;
        }
        .upm-avatar-ring.ring-vip {
          background: linear-gradient(145deg, var(--vip-a) 0%, var(--vip-b) 50%, var(--vip-c) 100%);
          animation: upmRingVip 4s ease-in-out infinite alternate;
        }
        .upm-avatar-ring.ring-streamer {
          background: linear-gradient(145deg, var(--str-a) 0%, var(--str-b) 50%, var(--str-c) 100%);
          animation: upmRingStr 4s ease-in-out infinite alternate;
        }
        @keyframes upmRingGlow {
          from { box-shadow: 0 0 12px rgba(84,199,248,0.25), 0 8px 28px rgba(0,0,0,0.5); }
          to   { box-shadow: 0 0 32px rgba(84,199,248,0.55), 0 12px 36px rgba(0,0,0,0.6); }
        }
        @keyframes upmRingVip {
          from { box-shadow: 0 0 18px rgba(251,191,36,0.4),  0 8px 28px rgba(0,0,0,0.5); }
          to   { box-shadow: 0 0 50px rgba(251,191,36,0.82), 0 12px 36px rgba(0,0,0,0.6); }
        }
        @keyframes upmRingStr {
          from { box-shadow: 0 0 18px rgba(74,222,128,0.37), 0 8px 28px rgba(0,0,0,0.5); }
          to   { box-shadow: 0 0 48px rgba(74,222,128,0.78), 0 12px 36px rgba(0,0,0,0.6); }
        }
        .upm-avatar-inner {
          width: 100%; height: 100%; border-radius: 17px; overflow: hidden;
          background: var(--bg2);
          display: flex; align-items: center; justify-content: center;
        }
        .upm-avatar-inner img { width: 100%; height: 100%; object-fit: cover; }
        .upm-avatar-ph {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: var(--sky);
        }

        /* Badge de rol — en flujo normal debajo del avatar, no absoluto */
        .upm-role-tier {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px 3px 6px; border-radius: 100px;
          font-family: 'Syne', sans-serif; font-size: 9px; font-weight: 800;
          letter-spacing: 1px; text-transform: uppercase;
          border: 1.5px solid; white-space: nowrap;
          max-width: 80px;
        }
        .upm-role-tier.tier-vip {
          background: linear-gradient(90deg, rgba(251,191,36,0.2), rgba(245,158,11,0.12));
          border-color: rgba(251,191,36,0.55); color: var(--vip-a);
          box-shadow: 0 0 14px rgba(251,191,36,0.35);
          animation: upmVipPulse 3s ease-in-out infinite;
        }
        .upm-role-tier.tier-streamer {
          background: linear-gradient(90deg, rgba(74,222,128,0.18), rgba(34,197,94,0.1));
          border-color: rgba(74,222,128,0.52); color: var(--str-a);
          box-shadow: 0 0 14px rgba(74,222,128,0.32);
          animation: upmStrPulse 3s ease-in-out infinite;
        }
        @keyframes upmVipPulse {
          0%,100% { box-shadow: 0 0 8px rgba(251,191,36,0.25); }
          50%     { box-shadow: 0 0 22px rgba(251,191,36,0.58); }
        }
        @keyframes upmStrPulse {
          0%,100% { box-shadow: 0 0 8px rgba(74,222,128,0.22); }
          50%     { box-shadow: 0 0 22px rgba(74,222,128,0.52); }
        }
        .upm-role-tier-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .tier-vip     .upm-role-tier-dot { background: var(--vip-a); box-shadow: 0 0 5px var(--vip-a); animation: upmDotBlink 2s infinite; }
        .tier-streamer .upm-role-tier-dot { background: var(--str-a); box-shadow: 0 0 5px var(--str-a); animation: upmDotBlink 2s infinite; }
        @keyframes upmDotBlink { 0%,100%{ opacity:1; } 50%{ opacity:0.35; } }

        /* Name block */
        .upm-name-block { flex: 1; min-width: 0; }
        .upm-name {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          color: var(--w); letter-spacing: -0.3px; line-height: 1.1;
          display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
        }
        .upm-age { font-size: 15px; font-weight: 300; color: var(--muted); font-family: 'DM Sans', sans-serif; }
        .upm-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
        .upm-meta-badge {
          padding: 3px 9px; border-radius: 100px;
          font-size: 11px; font-weight: 500; letter-spacing: 0.3px;
          border: 1px solid; font-family: 'DM Sans', sans-serif;
        }
        .upm-meta-gender {
          background: rgba(84,199,248,0.07); border-color: rgba(84,199,248,0.2); color: var(--sky);
        }

        /* Divider */
        .upm-divider { height: 1px; background: var(--glass-b); margin: 14px 0; }

        /* Section */
        .upm-section { margin-bottom: 16px; }
        .upm-section-label {
          font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 500;
          letter-spacing: 1.2px; text-transform: uppercase;
          color: rgba(84,199,248,0.4); margin-bottom: 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .upm-section-label::after { content: ''; flex: 1; height: 1px; background: var(--glass-b); }

        .upm-bio { font-family: 'DM Sans', sans-serif; font-size: 13.5px; line-height: 1.65; color: var(--muted); }
        .upm-empty-text { font-family: 'DM Sans', sans-serif; font-size: 13px; font-style: italic; color: rgba(84,199,248,0.2); }

        /* Tags */
        .upm-tags { display: flex; flex-wrap: wrap; gap: 7px; }
        .upm-tag {
          background: var(--glass); border: 1px solid var(--glass-b);
          border-radius: 100px; padding: 5px 12px;
          font-size: 12px; font-family: 'DM Sans', sans-serif; color: var(--muted); font-weight: 500;
        }
        .upm-tag-accent {
          background: rgba(84,199,248,0.06); border-color: rgba(84,199,248,0.22); color: var(--sky2);
        }

        /* Photos */
        .upm-photos { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; }
        .upm-photo-thumb {
          aspect-ratio: 1; border-radius: 10px; overflow: hidden;
          cursor: pointer; border: 1px solid var(--glass-b);
          background: var(--bg2); transition: border-color 0.2s;
        }
        .upm-photo-thumb:hover { border-color: rgba(84,199,248,0.35); }
        .upm-photo-thumb img { width:100%; height:100%; object-fit:cover; transition: transform 0.3s; }
        .upm-photo-thumb:hover img { transform: scale(1.06); }
        .upm-photo-thumb.active { outline: 2px solid rgba(84,199,248,0.55); outline-offset: 2px; }
        .upm-photo-empty { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; }
        .upm-photo-slot {
          aspect-ratio: 1; border-radius: 10px;
          border: 1.5px dashed rgba(84,199,248,0.1);
          background: repeating-linear-gradient(
            45deg, rgba(84,199,248,0.015) 0px, rgba(84,199,248,0.015) 1px,
            transparent 1px, transparent 10px
          );
          display: flex; align-items: center; justify-content: center;
          color: rgba(84,199,248,0.15); font-size: 20px;
        }

        /* Report */
        .upm-report-wrap { margin-top: 6px; padding-top: 16px; border-top: 1px solid var(--glass-b); }
        .upm-report-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 11px 20px; border-radius: 14px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.22s ease; letter-spacing: 0.2px;
        }
        .upm-report-btn.idle {
          background: rgba(84,199,248,0.025); border: 1px solid rgba(84,199,248,0.08); color: rgba(84,199,248,0.3);
        }
        .upm-report-btn.idle:hover {
          background: rgba(239,68,68,0.07); border-color: rgba(239,68,68,0.2); color: rgba(239,68,68,0.7);
        }
        .upm-report-btn.confirm {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.28);
          color: rgba(239,68,68,0.9); animation: upmShake 0.35s ease;
        }
        .upm-report-btn.confirm:hover { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.4); }
        .upm-report-btn.sent {
          background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.2);
          color: rgba(34,197,94,0.7); cursor: default;
        }
        @keyframes upmShake {
          0%,100%{ transform:translateX(0); } 25%{ transform:translateX(-4px); } 75%{ transform:translateX(4px); }
        }
        .upm-report-hint {
          text-align: center; font-family: 'DM Sans', sans-serif;
          font-size: 11px; color: rgba(239,68,68,0.4); margin-top: 6px;
        }
      `}</style>

      <div
        className={`upm-overlay ${visible ? "upm-open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog" aria-modal="true" aria-label={`Perfil de ${user.name}`}
      >
        <div className={`upm-shell ${isVip ? "shell-vip" : isStreamer ? "shell-streamer" : ""}`}>

          <button className="upm-close" onClick={onClose} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>

          {/* Hero */}
          <div className="upm-hero">
            {hasRole && (
              <div className={`upm-role-hero-banner ${isVip ? "banner-vip" : "banner-streamer"}`} />
            )}
            {hasPhotos ? (
              <>
                <img key={activePhoto} src={user.photos![activePhoto]} alt="" className="upm-hero-img" />
                <div className="upm-hero-overlay" />
              </>
            ) : user.avatar_url ? (
              <>
                <img src={user.avatar_url} alt="" className="upm-hero-img"
                  style={{ filter: "blur(3px) brightness(0.4)", transform: "scale(1.08)" }} />
                <div className="upm-hero-overlay" />
              </>
            ) : (
              <div className="upm-hero-empty">
                <div className="upm-hero-empty-icon">📷</div>
                <span className="upm-hero-empty-text">Sin foto de portada</span>
              </div>
            )}
            <div className="upm-status-badge">
              <div className={`upm-status-dot ${isConnected ? "live" : "waiting"}`} />
              {isConnected ? "En vivo" : "Conectando"}
            </div>
          </div>

          {/* Body */}
          <div className="upm-body" ref={scrollRef}>

            <div className="upm-identity">
              <div className="upm-avatar-wrap">
                <div className={`upm-avatar-ring ${isVip ? "ring-vip" : isStreamer ? "ring-streamer" : ""}`}>
                  <div className="upm-avatar-inner">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt={user.name} />
                      : <div className="upm-avatar-ph">{initials}</div>
                    }
                  </div>
                </div>
                {/* Badge en flujo normal debajo del ring — no absoluto */}
                {isVip && (
                  <div className="upm-role-tier tier-vip">
                    <div className="upm-role-tier-dot" />VIP
                  </div>
                )}
                {isStreamer && (
                  <div className="upm-role-tier tier-streamer">
                    <div className="upm-role-tier-dot" />STREAMER
                  </div>
                )}
              </div>

              <div className="upm-name-block">
                <div className="upm-name">
                  {user.name || "Sin nombre"}
                  {user.age && <span className="upm-age">{user.age}</span>}
                </div>
                <div className="upm-meta">
                  {user.gender && <span className="upm-meta-badge upm-meta-gender">{user.gender}</span>}
                </div>
              </div>
            </div>

            <div className="upm-section">
              <div className="upm-section-label">Sobre mí</div>
              {hasBio ? <p className="upm-bio">{user.bio}</p> : <p className="upm-empty-text">No escribió una bio todavía</p>}
            </div>

            <div className="upm-divider" />

            <div className="upm-section">
              <div className="upm-section-label">Intereses</div>
              {hasInterests
                ? <div className="upm-tags">{user.interests!.map((t,i) => <span key={i} className="upm-tag">{t}</span>)}</div>
                : <p className="upm-empty-text">No tiene intereses cargados</p>}
            </div>

            <div className="upm-section">
              <div className="upm-section-label">Busca</div>
              {hasLookingFor
                ? <div className="upm-tags">{user.looking_for!.map((t,i) => <span key={i} className="upm-tag upm-tag-accent">{t}</span>)}</div>
                : <p className="upm-empty-text">No especificó qué busca</p>}
            </div>

            <div className="upm-divider" />

            <div className="upm-section">
              <div className="upm-section-label">Fotos</div>
              {hasPhotos ? (
                <div className="upm-photos">
                  {user.photos!.map((src,i) => (
                    <div key={i} className={`upm-photo-thumb ${activePhoto===i?"active":""}`} onClick={() => setActivePhoto(i)}>
                      <img src={src} alt={`foto ${i+1}`} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="upm-photo-empty">
                    {[0,1,2].map(i => <div key={i} className="upm-photo-slot">🖼</div>)}
                  </div>
                  <p className="upm-empty-text" style={{ marginTop: 10 }}>No tiene fotos cargadas</p>
                </>
              )}
            </div>

            <div className="upm-report-wrap">
              <button className={`upm-report-btn ${reportState}`} onClick={reportState !== "sent" ? handleReport : undefined}>
                {reportState === "idle" && (<>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>Reportar usuario
                </>)}
                {reportState === "confirm" && (<>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>¿Confirmar reporte?
                </>)}
                {reportState === "sent" && (<>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>Reporte enviado
                </>)}
              </button>
              {reportState === "confirm" && <p className="upm-report-hint">Tocá de nuevo para confirmar</p>}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}