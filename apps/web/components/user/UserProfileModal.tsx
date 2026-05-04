"use client";

import { useEffect, useState } from "react";
import type { MatchUserProfile } from "./UserChip";
import { supabase } from "@/services/supabase.client";

interface Props {
  user: MatchUserProfile | null;
  isConnected?: boolean;
  visible: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  "Contenido inapropiado",
  "Acoso o bullying",
  "Spam o publicidad",
  "Lenguaje ofensivo",
  "Comportamiento abusivo",
  "Suplantación de identidad",
  "Otro",
];

export default function UserProfileModal({ user, isConnected = false, visible, onClose }: Props) {
  const [show, setShow]               = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  // Report state
  const [reportOpen, setReportOpen]   = useState(false);
  const [reason, setReason]           = useState(REPORT_REASONS[0]);
  const [details, setDetails]         = useState("");
  const [reporting, setReporting]     = useState(false);
  const [reportDone, setReportDone]   = useState(false);
  const [reportErr, setReportErr]     = useState<string | null>(null);

  useEffect(() => {
    if (visible) { setTimeout(() => setShow(true), 30); }
    else { setShow(false); setActivePhoto(0); setReportOpen(false); setReportDone(false); setReportErr(null); }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { if (reportOpen) setReportOpen(false); else onClose(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose, reportOpen]);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  const handleReport = async () => {
    if (!user?.id) return;
    setReporting(true);
    setReportErr(null);
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      const { error } = await supabase.from("reports").insert({
        reported_user_id: user.id,
        reporter_user_id: me?.id ?? null,
        reported_name: user.name ?? null,
        reason,
        details: details.trim() || null,
        status: "pendiente",
      });
      if (error) throw error;
      setReportDone(true);
      setDetails("");
    } catch (e: any) {
      setReportErr(e?.message ?? "Error al enviar reporte");
    } finally {
      setReporting(false);
    }
  };

  if (!visible && !show) return null;
  if (!user) return null;

  const role      = user.role ?? "viewer";
  const initials  = user.name?.[0]?.toUpperCase() ?? "?";
  const allPhotos = user.photos?.length ? user.photos : (user.avatar_url ? [user.avatar_url] : []);

  const genderLabel: Record<string, string> = {
    male: "Hombre", female: "Mujer", non_binary: "No binario",
    "No binario": "No binario", "Hombre": "Hombre", "Mujer": "Mujer",
    other: "Otro", prefer_not_to_say: "Prefiero no decir",
  };

  type ThemeKey = "viewer" | "vip" | "streamer";
  const themes: Record<ThemeKey, {
    a: string; b: string; c: string; glow: string; soft: string; border: string;
    topLine: string; sheetBg: string; ringBg: string;
    tierLabel: string; tierIcon: string; tierColor: string;
    ringAnim: string; tierAnim: string; dotAnim: string;
  }> = {
    viewer: {
      a: "#54c7f8", b: "#3b9eda", c: "#1a6fa8",
      glow: "rgba(84,199,248,0.38)", soft: "rgba(84,199,248,0.07)", border: "rgba(84,199,248,0.18)",
      topLine: "linear-gradient(90deg, transparent, #1a6fa8 20%, #54c7f8 50%, #1a6fa8 80%, transparent)",
      sheetBg: "radial-gradient(ellipse 80% 35% at 50% 0%, rgba(84,199,248,0.07) 0%, transparent 60%), #060f1e",
      ringBg: "linear-gradient(145deg, #54c7f8, #1a6fa8, rgba(84,199,248,0.15))",
      tierLabel: "Viewer", tierIcon: "◌", tierColor: "rgba(84,199,248,0.65)",
      ringAnim: "", tierAnim: "", dotAnim: "",
    },
    vip: {
      a: "#fbbf24", b: "#f59e0b", c: "#92400e",
      glow: "rgba(251,191,36,0.45)", soft: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.22)",
      topLine: "linear-gradient(90deg, transparent, #92400e 20%, #fbbf24 50%, #92400e 80%, transparent)",
      sheetBg: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(251,191,36,0.10) 0%, transparent 65%), #060f1e",
      ringBg: "linear-gradient(145deg, #fbbf24, #f59e0b, #92400e)",
      tierLabel: "VIP", tierIcon: "✦", tierColor: "#fbbf24",
      ringAnim: "vipRing 5s ease-in-out infinite alternate",
      tierAnim: "vipTier 3s ease-in-out infinite",
      dotAnim: "dotBlink 2s ease-in-out infinite",
    },
    streamer: {
      a: "#4ade80", b: "#22c55e", c: "#14532d",
      glow: "rgba(74,222,128,0.42)", soft: "rgba(74,222,128,0.07)", border: "rgba(74,222,128,0.20)",
      topLine: "linear-gradient(90deg, transparent, #14532d 20%, #4ade80 50%, #14532d 80%, transparent)",
      sheetBg: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(74,222,128,0.09) 0%, transparent 65%), #060f1e",
      ringBg: "linear-gradient(145deg, #4ade80, #22c55e, #14532d)",
      tierLabel: "Streamer", tierIcon: "◉", tierColor: "#4ade80",
      ringAnim: "strRing 5s ease-in-out infinite alternate",
      tierAnim: "strTier 3s ease-in-out infinite",
      dotAnim: "dotBlink 2s ease-in-out infinite",
    },
  };

  const t = themes[role as ThemeKey];

  const inlineTheme = `
    @keyframes vipRing {
      from { box-shadow: 0 0 20px rgba(251,191,36,0.28), 0 12px 40px rgba(0,0,0,0.5); }
      to   { box-shadow: 0 0 55px rgba(251,191,36,0.62), 0 14px 44px rgba(0,0,0,0.55); }
    }
    @keyframes strRing {
      from { box-shadow: 0 0 20px rgba(74,222,128,0.26), 0 12px 40px rgba(0,0,0,0.5); }
      to   { box-shadow: 0 0 52px rgba(74,222,128,0.60), 0 14px 44px rgba(0,0,0,0.55); }
    }
    @keyframes vipTier {
      0%,100% { box-shadow: 0 0 10px rgba(251,191,36,0.12); }
      50%      { box-shadow: 0 0 24px rgba(251,191,36,0.30); }
    }
    @keyframes strTier {
      0%,100% { box-shadow: 0 0 10px rgba(74,222,128,0.11); }
      50%      { box-shadow: 0 0 24px rgba(74,222,128,0.28); }
    }
    @keyframes dotBlink { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
    @keyframes upmBlink { 0%,100%{opacity:1} 50%{opacity:0.25} }

    .upm-sheet {
      background: ${t.sheetBg};
      border-color: ${t.border};
    }
    .upm-sheet::before {
      background: ${t.topLine};
      box-shadow: 0 0 18px ${t.glow};
    }
    .upm-handle { background: ${t.soft}; border: 1px solid ${t.border}; }
    .upm-close { background: ${t.soft}; border-color: ${t.border}; }
    .upm-close:hover { background: ${t.a}22; color: ${t.a}; }

    .upm-hero-card {
      background: ${t.soft};
      border-color: ${t.border};
    }
    .upm-avatar-ring {
      background: ${t.ringBg};
      box-shadow: 0 0 28px ${t.glow}, 0 12px 40px rgba(0,0,0,0.5);
      ${t.ringAnim ? `animation: ${t.ringAnim};` : ""}
    }
    .upm-avatar-ph { color: ${t.a}; }

    .upm-role-tier {
      background: ${t.soft};
      border-color: ${t.border};
      color: ${t.tierColor};
      ${t.tierAnim ? `animation: ${t.tierAnim};` : ""}
    }
    .upm-role-dot {
      background: ${t.a};
      ${role !== "viewer" ? `box-shadow: 0 0 5px ${t.a}; animation: ${t.dotAnim};` : ""}
    }

    .upm-section-hdr-dot { background: ${t.a}; box-shadow: 0 0 6px ${t.glow}; }
    .upm-section-label { color: ${t.a}88; }
    .upm-section-hdr-line { background: linear-gradient(to right, ${t.border}, transparent); }
    .upm-divider { background: linear-gradient(to right, transparent, ${t.border} 30%, ${t.border} 70%, transparent); }

    .upm-thumb.active { border-color: ${t.a}; box-shadow: 0 0 10px ${t.glow}; }

    .upm-footer::before { background: linear-gradient(to right, transparent, ${t.a}); }
    .upm-footer::after  { background: linear-gradient(to left,  transparent, ${t.a}); }
    .upm-footer-gem { background: ${t.a}; box-shadow: 0 0 8px ${t.glow}; }
  `;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        .upm-root {
          position: fixed; inset: 0; z-index: 9000;
          display: flex; align-items: flex-end; justify-content: center;
          font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased;
          background: rgba(3,10,20,0.72);
          backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
          opacity: 0; transition: opacity 0.3s ease; pointer-events: none;
        }
        .upm-root.show { opacity: 1; pointer-events: all; }

        .upm-sheet {
          width: 100%; max-width: 480px; max-height: 91dvh;
          border: 1px solid; border-bottom: none;
          border-radius: 26px 26px 0 0;
          overflow: hidden; display: flex; flex-direction: column; position: relative;
          transform: translateY(36px);
          transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .upm-root.show .upm-sheet { transform: translateY(0); }
        .upm-sheet::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 2px; z-index: 20;
        }

        .upm-handle { width: 36px; height: 4px; border-radius: 2px; margin: 14px auto 0; flex-shrink: 0; }

        .upm-close {
          position: absolute; top: 14px; right: 16px; z-index: 30;
          width: 32px; height: 32px; border-radius: 50%; border: 1px solid;
          color: rgba(180,215,240,0.4); font-size: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, color 0.2s, transform 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .upm-close:hover { transform: scale(1.1) rotate(90deg); }

        /* ── Report button ── */
        .upm-report-btn {
          position: absolute; top: 14px; right: 56px; z-index: 30;
          height: 32px; padding: 0 12px; border-radius: 100px;
          border: 1px solid rgba(249,115,22,0.3);
          background: rgba(249,115,22,0.08);
          color: rgba(249,115,22,0.75); font-size: 11px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; display: flex; align-items: center; gap: 5px;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .upm-report-btn:hover {
          background: rgba(249,115,22,0.18);
          border-color: rgba(249,115,22,0.6);
          color: #f97316;
        }

        /* ── Report overlay (inside sheet) ── */
        .upm-report-overlay {
          position: absolute; inset: 0; z-index: 50;
          background: rgba(3,8,18,0.92);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 28px 24px 36px;
          opacity: 0; pointer-events: none;
          transition: opacity 0.25s ease;
        }
        .upm-report-overlay.open { opacity: 1; pointer-events: all; }

        .upm-report-title {
          font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 800;
          color: #f5f8ff; margin-bottom: 4px;
        }
        .upm-report-sub {
          font-size: 12px; color: rgba(180,215,240,0.38); margin-bottom: 20px;
        }

        .upm-report-reasons {
          display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 16px;
        }
        .upm-reason-chip {
          padding: 6px 13px; border-radius: 100px; font-size: 11.5px; font-weight: 500;
          border: 1px solid rgba(249,115,22,0.18);
          background: rgba(249,115,22,0.05); color: rgba(240,210,180,0.65);
          cursor: pointer; transition: all 0.18s ease;
          font-family: 'DM Sans', sans-serif;
        }
        .upm-reason-chip:hover { background: rgba(249,115,22,0.12); border-color: rgba(249,115,22,0.4); }
        .upm-reason-chip.selected {
          background: rgba(249,115,22,0.2); border-color: rgba(249,115,22,0.7);
          color: #fb923c;
          box-shadow: 0 0 10px rgba(249,115,22,0.18);
        }

        .upm-report-textarea {
          width: 100%; min-height: 72px; resize: vertical;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(249,115,22,0.15);
          border-radius: 12px; padding: 11px 14px;
          font-family: 'DM Sans', sans-serif; font-size: 12.5px;
          color: rgba(220,235,255,0.8); outline: none;
          transition: border-color 0.2s; margin-bottom: 16px;
          box-sizing: border-box;
        }
        .upm-report-textarea:focus { border-color: rgba(249,115,22,0.45); }
        .upm-report-textarea::placeholder { color: rgba(180,215,240,0.22); }

        .upm-report-actions { display: flex; gap: 10px; }

        .upm-report-cancel {
          flex: 1; padding: 11px 0; border-radius: 12px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(180,215,240,0.5); font-size: 13px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          transition: background 0.2s;
        }
        .upm-report-cancel:hover { background: rgba(255,255,255,0.08); }

        .upm-report-submit {
          flex: 2; padding: 11px 0; border-radius: 12px;
          background: rgba(249,115,22,0.18); border: 1px solid rgba(249,115,22,0.5);
          color: #fb923c; font-size: 13px; font-weight: 700;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          transition: all 0.2s;
        }
        .upm-report-submit:hover:not(:disabled) { background: rgba(249,115,22,0.3); }
        .upm-report-submit:disabled { opacity: 0.5; cursor: default; }

        .upm-report-success {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; text-align: center; padding: 24px 0;
        }
        .upm-report-success-icon {
          width: 60px; height: 60px; border-radius: 50%;
          background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.3);
          display: flex; align-items: center; justify-content: center; font-size: 26px;
        }

        .upm-scroll { overflow-y: auto; flex: 1; min-height: 0; padding: 0 0 44px; scrollbar-width: none; }
        .upm-scroll::-webkit-scrollbar { display: none; }

        /* Hero card */
        .upm-hero-card {
          margin: 16px 20px 0; border-radius: 20px; border: 1px solid;
          padding: 20px; position: relative; overflow: hidden;
        }
        .upm-hero-card::before {
          content: ''; position: absolute; inset: 0; border-radius: 20px;
          background-image: repeating-linear-gradient(
            0deg, transparent, transparent 39px,
            rgba(255,255,255,0.012) 39px, rgba(255,255,255,0.012) 40px);
          pointer-events: none;
        }
        .upm-hero-row { display: flex; align-items: flex-start; gap: 18px; position: relative; z-index: 1; }

        /* Avatar ring */
        .upm-avatar-ring { width: 96px; height: 96px; border-radius: 26px; padding: 3px; flex-shrink: 0; }
        .upm-avatar-inner {
          width: 100%; height: 100%; border-radius: 23px; overflow: hidden;
          background: #060f1e; display: flex; align-items: center; justify-content: center;
        }
        .upm-avatar-inner img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .upm-avatar-ph { font-family: 'Syne', sans-serif; font-size: 34px; font-weight: 900; }

        /* Status dot */
        .upm-status-dot {
          position: absolute; bottom: -5px; right: -5px;
          width: 22px; height: 22px; border-radius: 50%;
          border: 2.5px solid #060f1e; background: #060f1e;
          display: flex; align-items: center; justify-content: center;
        }
        .upm-status-dot::after { content: ''; width: 9px; height: 9px; border-radius: 50%; }
        .upm-status-dot.live::after { background: #22c55e; box-shadow: 0 0 7px #22c55e; animation: upmBlink 2s infinite; }
        .upm-status-dot.idle::after { background: rgba(255,255,255,0.2); }

        /* Hero info */
        .upm-hero-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }

        /* Role tier pill */
        .upm-role-tier {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 11px 4px 8px; border-radius: 100px;
          font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 800;
          letter-spacing: 1.5px; text-transform: uppercase; border: 1.5px solid; width: fit-content;
        }
        .upm-role-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .upm-name {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 900;
          color: #f5f8ff; letter-spacing: -0.5px; line-height: 1.1;
        }
        .upm-name-age {
          font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 300;
          color: rgba(180,215,240,0.45);
        }

        .upm-live-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px; border-radius: 100px;
          font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; border: 1px solid;
        }
        .upm-live-pill.live { background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.2); color: rgba(100,220,130,0.9); }
        .upm-live-pill.idle { background: rgba(84,199,248,0.05); border-color: rgba(84,199,248,0.12); color: rgba(143,212,255,0.5); }
        .upm-live-pip { width: 5px; height: 5px; border-radius: 50%; }
        .upm-live-pill.live .upm-live-pip { background: #22c55e; box-shadow: 0 0 5px #22c55e; animation: upmBlink 2s infinite; }
        .upm-live-pill.idle .upm-live-pip { background: rgba(84,199,248,0.4); }

        .upm-quick-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .upm-qtag {
          padding: 3px 10px; border-radius: 100px;
          font-size: 10px; letter-spacing: 0.3px;
          background: rgba(84,199,248,0.06); border: 1px solid rgba(84,199,248,0.13);
          color: rgba(143,212,255,0.75);
        }

        /* Gallery */
        .upm-gallery { padding: 16px 20px 0; }
        .upm-gallery-main {
          position: relative; width: 100%; aspect-ratio: 4/3;
          border-radius: 16px; overflow: hidden; background: #040c18;
          border: 1px solid rgba(84,199,248,0.10); margin-bottom: 8px;
        }
        .upm-gallery-main img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .upm-gallery-main::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(6,15,30,0.65) 0%, transparent 45%);
          pointer-events: none;
        }
        .upm-photo-count {
          position: absolute; bottom: 10px; right: 12px; z-index: 2;
          background: rgba(3,10,20,0.65); border: 1px solid rgba(84,199,248,0.12);
          backdrop-filter: blur(8px); border-radius: 100px;
          padding: 3px 10px; font-size: 9px; font-weight: 600;
          color: rgba(143,212,255,0.65); letter-spacing: 1px;
        }
        .upm-thumbs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
        .upm-thumbs::-webkit-scrollbar { display: none; }

        .upm-thumb {
          width: 52px; height: 52px; border-radius: 10px; object-fit: cover;
          flex-shrink: 0; cursor: pointer; border: 2px solid transparent;
          transition: border-color 0.2s, transform 0.15s; background: #040c18;
        }
        .upm-thumb:hover:not(.active) { border-color: rgba(84,199,248,0.18); transform: scale(1.05); }

        /* Sections */
        .upm-divider { height: 1px; margin: 18px 20px 0; }
        .upm-section { padding: 16px 20px 0; }
        .upm-section-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .upm-section-hdr-dot { width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0; }
        .upm-section-label { font-size: 9px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; }
        .upm-section-hdr-line { flex: 1; height: 1px; }

        /* Bio */
        .upm-bio {
          font-size: 14px; font-weight: 300; color: rgba(180,215,240,0.7);
          line-height: 1.7; font-style: italic;
          padding: 14px 16px 14px 32px;
          background: rgba(84,199,248,0.04); border: 1px solid rgba(84,199,248,0.10);
          border-radius: 14px; position: relative;
          word-break: break-word; white-space: pre-wrap;
        }
        .upm-bio::before {
          content: '"'; position: absolute; top: 4px; left: 12px;
          font-size: 30px; line-height: 1;
          color: rgba(84,199,248,0.16); font-family: 'Syne', sans-serif;
        }
        .upm-bio-empty { font-size: 13px; color: rgba(255,255,255,0.18); font-style: italic; }

        /* Tags */
        .upm-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .upm-interest-tag {
          padding: 5px 13px; border-radius: 100px;
          background: rgba(84,199,248,0.07); border: 1.5px solid rgba(84,199,248,0.14);
          font-size: 11px; color: rgba(143,212,255,0.85); letter-spacing: 0.3px;
          transition: background 0.2s, border-color 0.2s;
        }
        .upm-interest-tag:hover { background: rgba(84,199,248,0.14); border-color: rgba(84,199,248,0.30); }
        .upm-looking-tag {
          padding: 5px 13px; border-radius: 100px;
          background: rgba(26,111,168,0.10); border: 1.5px solid rgba(84,199,248,0.18);
          font-size: 11px; color: rgba(168,230,255,0.8);
        }

        /* Footer */
        .upm-footer {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; padding: 24px 24px 0; opacity: 0.2;
        }
        .upm-footer::before, .upm-footer::after { content: ''; flex: 1; height: 1px; }
        .upm-footer-gem { width: 5px; height: 5px; border-radius: 50%; }
      `}</style>

      <style>{inlineTheme}</style>

      <div className={`upm-root${show ? " show" : ""}`} onClick={onClose}>
        <div className="upm-sheet" onClick={(e) => e.stopPropagation()}>

          <div className="upm-handle" />

          {/* Report button */}
          <button
            className="upm-report-btn"
            onClick={() => { setReportOpen(true); setReportDone(false); setReportErr(null); }}
            title="Reportar usuario"
          >
            🚩 Reportar
          </button>

          <button className="upm-close" onClick={onClose} aria-label="Cerrar">✕</button>

          {/* ── Report overlay ── */}
          <div className={`upm-report-overlay${reportOpen ? " open" : ""}`}>
            {!reportDone ? (
              <>
                <div className="upm-report-title">Reportar a {user.name}</div>
                <div className="upm-report-sub">El reporte quedará guardado para revisión del equipo de moderación.</div>

                <div className="upm-report-reasons">
                  {REPORT_REASONS.map(r => (
                    <button
                      key={r}
                      className={`upm-reason-chip${reason === r ? " selected" : ""}`}
                      onClick={() => setReason(r)}
                    >{r}</button>
                  ))}
                </div>

                <textarea
                  className="upm-report-textarea"
                  placeholder="Detalles adicionales (opcional)..."
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  maxLength={500}
                />

                {reportErr && (
                  <div style={{
                    padding: "8px 12px", borderRadius: 10, marginBottom: 12,
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    fontSize: 12, color: "#f87171", fontFamily: "'DM Sans', sans-serif",
                  }}>{reportErr}</div>
                )}

                <div className="upm-report-actions">
                  <button className="upm-report-cancel" onClick={() => setReportOpen(false)}>Cancelar</button>
                  <button
                    className="upm-report-submit"
                    onClick={handleReport}
                    disabled={reporting}
                  >
                    {reporting ? "Enviando..." : "Enviar reporte"}
                  </button>
                </div>
              </>
            ) : (
              <div className="upm-report-success">
                <div className="upm-report-success-icon">🚩</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: "#f5f8ff" }}>
                  Reporte enviado
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: "rgba(180,215,240,0.45)", maxWidth: 240, lineHeight: 1.6 }}>
                  El equipo de moderación revisará tu reporte. Podés ver el estado en Configuración → Moderación.
                </div>
                <button
                  className="upm-report-submit"
                  style={{ marginTop: 8, width: "100%" }}
                  onClick={() => { setReportOpen(false); onClose(); }}
                >
                  Entendido
                </button>
              </div>
            )}
          </div>

          <div className="upm-scroll">

            {/* ══ HERO CARD ══ */}
            <div className="upm-hero-card">
              <div className="upm-hero-row">

                {/* Avatar con ring de rango */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div className="upm-avatar-ring">
                    <div className="upm-avatar-inner">
                      {allPhotos[0]
                        ? <img src={allPhotos[0]} alt={user.name} />
                        : <div className="upm-avatar-ph">{initials}</div>
                      }
                    </div>
                  </div>
                  <div className={`upm-status-dot ${isConnected ? "live" : "idle"}`} />
                </div>

                {/* Info */}
                <div className="upm-hero-info">
                  <div className="upm-role-tier">
                    <span className="upm-role-dot" />
                    {t.tierIcon} {t.tierLabel}
                  </div>

                  <div className="upm-name">
                    {user.name}
                    {user.age && <span className="upm-name-age">, {user.age}</span>}
                  </div>

                  <div className={`upm-live-pill ${isConnected ? "live" : "idle"}`}>
                    <div className="upm-live-pip" />
                    {isConnected ? "En vivo ahora" : "Conectando"}
                  </div>

                  {(user.gender || (user.looking_for?.length ?? 0) > 0) && (
                    <div className="upm-quick-tags">
                      {user.gender && <span className="upm-qtag">{genderLabel[user.gender] ?? user.gender}</span>}
                      {user.looking_for?.slice(0, 2).map((lf, i) => (
                        <span key={i} className="upm-qtag">{lf}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio dentro del hero card */}
              {user.bio
                ? <p className="upm-bio" style={{ marginTop: 16 }}>{user.bio}</p>
                : <p className="upm-bio-empty" style={{ marginTop: 12 }}>Sin descripción todavía.</p>
              }
            </div>

            {/* ══ GALERÍA (solo si hay más de 1 foto) ══ */}
            {allPhotos.length > 1 && (
              <div className="upm-gallery">
                <div className="upm-gallery-main">
                  <img src={allPhotos[activePhoto]} alt="foto principal" />
                  <div className="upm-photo-count">{activePhoto + 1} / {allPhotos.length}</div>
                </div>
                <div className="upm-thumbs">
                  {allPhotos.map((url, i) => (
                    <img
                      key={i} src={url} alt={`foto ${i + 1}`}
                      className={`upm-thumb ${activePhoto === i ? "active" : ""}`}
                      onClick={() => setActivePhoto(i)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ══ INTERESES ══ */}
            {user.interests && user.interests.length > 0 && (
              <>
                <div className="upm-divider" />
                <div className="upm-section">
                  <div className="upm-section-hdr">
                    <div className="upm-section-hdr-dot" />
                    <span className="upm-section-label">Intereses</span>
                    <div className="upm-section-hdr-line" />
                  </div>
                  <div className="upm-tags">
                    {user.interests.map((tag, i) => (
                      <span key={i} className="upm-interest-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ══ BUSCANDO ══ */}
            {user.looking_for && user.looking_for.length > 0 && (
              <>
                <div className="upm-divider" />
                <div className="upm-section">
                  <div className="upm-section-hdr">
                    <div className="upm-section-hdr-dot" />
                    <span className="upm-section-label">Buscando</span>
                    <div className="upm-section-hdr-line" />
                  </div>
                  <div className="upm-tags">
                    {user.looking_for.map((item, i) => (
                      <span key={i} className="upm-looking-tag">{item}</span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="upm-footer">
              <div className="upm-footer-gem" />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}