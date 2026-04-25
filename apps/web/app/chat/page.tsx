"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";

type Match = {
  id: string;
  other_user: {
    id: string;
    name: string;
    age: number;
    avatar_url: string | null;
    is_online: boolean;
  };
  last_message?: string;
};

// ── Monetag In-Page Push ──────────────────────────────────────────────────────
const MONETAG_ZONE = "10895969";
const MONETAG_SRC  = "https://nap5k.com/tag.min.js";
let monetagChatInjected = false;

function injectMonetagChat() {
  if (monetagChatInjected) return;
  if (typeof window === "undefined") return;
  const s = document.createElement("script");
  s.dataset.zone = MONETAG_ZONE;
  s.src = MONETAG_SRC;
  s.async = true;
  document.body.appendChild(s);
  monetagChatInjected = true;
}

function AdSlot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { injectMonetagChat(); }, []);

  return (
    <div className="ad-wrap" ref={ref}>
      <div className="ad-label">
        <span className="ad-dot" />
        Patrocinado
      </div>
      <div className="ad-inner" id="monetag-chat-slot">
        <div className="ad-placeholder">
          <span className="ad-icon">✦</span>
          <span className="ad-text">Cargando anuncio...</span>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) { router.push("/"); return; }

      const { data: matchRows } = await supabase
        .from("matches")
        .select("id, user1, user2")
        .or(`user1.eq.${me.user.id},user2.eq.${me.user.id}`)
        .order("created_at", { ascending: false });

      if (!matchRows?.length) { setLoading(false); return; }

      const enriched: Match[] = await Promise.all(
        matchRows.map(async (m) => {
          const otherId = m.user1 === me.user.id ? m.user2 : m.user1;

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, name, age, avatar_url, is_online")
            .eq("id", otherId)
            .single();

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content")
            .or(`and(from_user.eq.${me.user.id},to_user.eq.${otherId}),and(from_user.eq.${otherId},to_user.eq.${me.user.id})`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: m.id,
            other_user: profile || { id: otherId, name: "Usuario", age: 0, avatar_url: null, is_online: false },
            last_message: lastMsg?.content,
          };
        })
      );

      setMatches(enriched);
      setLoading(false);
    };

    load();
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:        #030a14;
          --surface:   rgba(255,255,255,0.032);
          --surface-h: rgba(84,199,248,0.06);
          --border:    rgba(84,199,248,0.09);
          --border-h:  rgba(84,199,248,0.28);
          --sky:       #54c7f8;
          --sky2:      #3b9eda;
          --sky3:      #1a6fa8;
          --text:      #f5f8ff;
          --muted:     rgba(180,215,240,0.45);
        }

        html, body {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          cursor: none;
        }

        /* ── CURSOR ── */
        .custom-cursor {
          position: fixed;
          width: 10px; height: 10px;
          background: white;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
          mix-blend-mode: difference;
        }

        /* ── FONDO ── */
        .bg-mesh {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
        }
        .bg-mesh::before {
          content: '';
          position: fixed; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 70% 35% at 15% 0%,  rgba(84,199,248,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 50% 30% at 85% 100%, rgba(59,158,218,0.08) 0%, transparent 58%),
            radial-gradient(ellipse 60% 40% at 80% 10%,  rgba(84,199,248,0.05) 0%, transparent 55%),
            radial-gradient(ellipse 55% 35% at 10% 90%,  rgba(59,158,218,0.05) 0%, transparent 55%);
        }

        /* ── ROOT ── */
        .page-root {
          position: relative; z-index: 1;
          min-height: 100vh;
          padding-bottom: 80px;
        }

        /* ── HEADER ── */
        .page-header {
          padding: 64px 28px 28px;
          position: relative; z-index: 1;
          opacity: 0; transform: translateY(24px);
          transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1),
                      transform 0.9s cubic-bezier(0.16,1,0.3,1);
        }
        .page-header.in { opacity: 1; transform: translateY(0); }

        .header-top {
          display: flex; align-items: flex-start;
          justify-content: space-between;
        }

        .header-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 600;
          letter-spacing: 2.5px; text-transform: uppercase;
          color: var(--sky); opacity: 0.8;
          margin-bottom: 8px;
        }
        .header-eyebrow::before {
          content: '';
          display: block; width: 20px; height: 1px;
          background: var(--sky); opacity: 0.6;
        }

        .header-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(36px, 8vw, 52px);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .header-title span {
          background: linear-gradient(110deg, var(--sky) 0%, #a5d8f8 60%, var(--text) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-count {
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 50%, var(--sky3) 100%);
          color: #020d18;
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 900;
          width: 34px; height: 34px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-top: 4px; flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(84,199,248,0.45);
        }

        /* ── SEPARADOR ── */
        .section-divider {
          display: flex; align-items: center; gap: 12px;
          padding: 4px 28px 20px;
          position: relative; z-index: 1;
          opacity: 0; transform: translateY(10px);
          transition: opacity 0.7s 0.15s cubic-bezier(0.16,1,0.3,1),
                      transform 0.7s 0.15s cubic-bezier(0.16,1,0.3,1);
        }
        .section-divider.in { opacity: 1; transform: translateY(0); }
        .divider-line { flex: 1; height: 1px; background: rgba(84,199,248,0.08); }
        .divider-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 2px; text-transform: uppercase;
          color: rgba(84,199,248,0.3); white-space: nowrap;
        }

        /* ── LISTA ── */
        .matches-list {
          padding: 0 20px;
          display: flex; flex-direction: column;
          gap: 10px;
          position: relative; z-index: 1;
        }

        /* ── TARJETA ── */
        .match-card {
          display: flex; align-items: center; gap: 16px;
          padding: 16px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          cursor: none; text-align: left; width: 100%;
          position: relative; overflow: hidden;

          opacity: 0; transform: translateY(20px);
          transition:
            opacity 0.6s cubic-bezier(0.16,1,0.3,1),
            transform 0.6s cubic-bezier(0.16,1,0.3,1),
            background 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }
        .match-card.in { opacity: 1; transform: translateY(0); }

        .match-card:hover {
          background: var(--surface-h);
          border-color: var(--border-h);
          transform: translateY(-3px);
          box-shadow:
            0 12px 32px -8px rgba(0,0,0,0.5),
            0 0 0 1px rgba(84,199,248,0.05) inset,
            0 0 40px -16px rgba(84,199,248,0.14);
        }
        .match-card:active { transform: translateY(0); }

        /* Shimmer */
        .match-card::after {
          content: '';
          position: absolute; inset: 0; border-radius: inherit;
          background: linear-gradient(
            115deg, transparent 40%, rgba(84,199,248,0.04) 50%, transparent 60%
          );
          background-size: 200% 100%;
          opacity: 0; pointer-events: none;
          transition: opacity 0.3s;
        }
        .match-card:hover::after {
          opacity: 1;
          animation: shimmerSlide 1.6s ease infinite;
        }
        @keyframes shimmerSlide {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── AVATAR ── */
        .avatar-wrap { position: relative; flex-shrink: 0; }
        .avatar {
          width: 58px; height: 58px; border-radius: 20px;
          background: linear-gradient(135deg, #050f1e, #0a1a2e);
          border: 1.5px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; overflow: hidden;
          transition: border-color 0.25s ease;
        }
        .match-card:hover .avatar { border-color: var(--border-h); }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }

        .online-dot {
          position: absolute; bottom: 2px; right: 2px;
          width: 12px; height: 12px; border-radius: 50%;
          border: 2px solid var(--bg);
        }
        .online-dot.online  { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.7); }
        .online-dot.offline { background: rgba(255,255,255,0.15); }

        /* ── INFO ── */
        .match-info { flex: 1; min-width: 0; }
        .match-name {
          font-family: 'Syne', sans-serif;
          font-size: 15px; font-weight: 800;
          letter-spacing: -0.01em;
          margin-bottom: 4px;
        }
        .match-preview {
          font-size: 13px; color: var(--muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          transition: color 0.2s;
        }
        .match-preview.no-msg { color: rgba(84,199,248,0.5); font-style: italic; }
        .match-card:hover .match-preview { color: rgba(180,215,240,0.65); }

        /* ── FLECHA ── */
        .match-arrow {
          color: rgba(84,199,248,0.2); flex-shrink: 0;
          display: flex; align-items: center;
          transition: color 0.2s ease, transform 0.2s ease;
        }
        .match-card:hover .match-arrow {
          color: rgba(84,199,248,0.6);
          transform: translateX(3px);
        }

        /* ── SKELETON ── */
        .skeleton-list {
          padding: 0 20px;
          display: flex; flex-direction: column;
          gap: 10px; position: relative; z-index: 1;
        }
        .skel-card {
          display: flex; align-items: center; gap: 16px;
          padding: 16px 20px;
          background: var(--surface);
          border: 1px solid rgba(84,199,248,0.05);
          border-radius: 24px;
        }
        .skel-avatar {
          width: 58px; height: 58px; border-radius: 20px;
          background: rgba(84,199,248,0.06); flex-shrink: 0;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .skel-lines { flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .skel-line {
          height: 10px; border-radius: 6px;
          background: rgba(84,199,248,0.06);
          animation: pulse 1.5s ease-in-out infinite;
        }
        .skel-line.w65 { width: 65%; }
        .skel-line.w42 { width: 42%; animation-delay: 0.15s; }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.8} }

        /* ── EMPTY ── */
        .empty-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 80px 40px;
          gap: 14px; text-align: center;
          position: relative; z-index: 1;
        }
        .empty-icon { font-size: 64px; margin-bottom: 8px; }
        .empty-title {
          font-family: 'Syne', sans-serif;
          font-size: 24px; font-weight: 900;
          color: rgba(245,248,255,0.4);
          letter-spacing: -0.03em;
        }
        .empty-sub {
          font-size: 14px; color: var(--muted);
          line-height: 1.7; max-width: 260px;
        }
        .empty-btn {
          margin-top: 16px; padding: 14px 36px;
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 50%, var(--sky3) 100%);
          border: none; border-radius: 100px;
          color: #020d18;
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 800;
          cursor: none; letter-spacing: 0.3px;
          box-shadow: 0 8px 24px rgba(84,199,248,0.35);
          position: relative; overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .empty-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent 55%);
        }
        .empty-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(84,199,248,0.5); }
        .empty-btn:active { transform: translateY(0); }

        /* ── AD SLOT ── */
        .ad-wrap {
          position: relative; z-index: 1;
          margin: 0 20px 20px;
          border-radius: 24px; overflow: hidden;
          border: 1px solid rgba(84,199,248,0.1);
          background: linear-gradient(135deg, rgba(84,199,248,0.025) 0%, rgba(26,111,168,0.04) 100%);
          opacity: 0; transform: translateY(10px);
          animation: adIn 0.6s 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        @keyframes adIn { to { opacity: 1; transform: translateY(0); } }
        .ad-wrap::before {
          content: '';
          position: absolute; top: 0; left: 0; bottom: 0; width: 2px;
          background: linear-gradient(to bottom,
            transparent 0%, rgba(84,199,248,0.4) 30%,
            rgba(84,199,248,0.6) 50%, rgba(84,199,248,0.4) 70%, transparent 100%);
        }
        .ad-label {
          display: flex; align-items: center; gap: 5px;
          padding: 8px 14px 0 14px;
          font-size: 9px; font-weight: 600;
          letter-spacing: 2px; text-transform: uppercase;
          color: rgba(84,199,248,0.35);
        }
        .ad-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(84,199,248,0.35); }
        .ad-inner {
          padding: 6px 12px 12px; min-height: 76px;
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .ad-placeholder {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          position: absolute; inset: 0; justify-content: center;
          pointer-events: none;
        }
        .ad-icon { font-size: 15px; color: rgba(84,199,248,0.12); animation: adPulse 2s ease-in-out infinite; }
        @keyframes adPulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        .ad-text { font-size: 10px; color: rgba(84,199,248,0.18); letter-spacing: 1px; text-transform: uppercase; }
        #monetag-chat-slot > * { position: relative; z-index: 1; }

        /* ── MOBILE ── */
        @media (max-width: 480px) {
          .page-header { padding: 52px 20px 20px; }
          .matches-list, .skeleton-list { padding: 0 16px; }
          .ad-wrap { margin: 0 16px 16px; }
          .section-divider { padding: 4px 20px 16px; }
          html, body { cursor: auto; }
          .custom-cursor { display: none; }
        }
      `}</style>

      {/* Cursor */}
      <div ref={cursorRef} className="custom-cursor" />

      {/* Fondo */}
      <div className="bg-mesh" />

      <div className="page-root">

        {/* ── Header ── */}
        <div className={`page-header ${mounted ? "in" : ""}`}>
          <div className="header-top">
            <div>
              <div className="header-eyebrow">Conexiones</div>
              <h1 className="header-title">
                Mat<span>ches</span>
              </h1>
            </div>
            {!loading && matches.length > 0 && (
              <div className="header-count">{matches.length}</div>
            )}
          </div>
        </div>

        {/* ── Ad slot ── */}
        <AdSlot />

        {/* ── Contenido ── */}
        {loading ? (
          <div className="skeleton-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skel-card">
                <div className="skel-avatar" />
                <div className="skel-lines">
                  <div className="skel-line w65" />
                  <div className="skel-line w42" />
                </div>
              </div>
            ))}
          </div>

        ) : matches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💫</div>
            <div className="empty-title">Sin matches aún</div>
            <p className="empty-sub">
              Cuando ambos se den like, el contacto aparece acá para que puedan chatear.
            </p>
            <button className="empty-btn" onClick={() => router.push("/discover")}>
              Ir a Discover ✨
            </button>
          </div>

        ) : (
          <>
            <div className={`section-divider ${mounted ? "in" : ""}`}>
              <div className="divider-line" />
              <span className="divider-label">Tus conexiones</span>
              <div className="divider-line" />
            </div>

            <div className="matches-list">
              {matches.map((match, i) => (
                <button
                  key={match.id}
                  className={`match-card ${mounted ? "in" : ""}`}
                  style={{ transitionDelay: mounted ? `${0.1 + i * 0.07}s` : "0s" }}
                  onClick={() => router.push(`/chat/${match.other_user.id}`)}
                >
                  <div className="avatar-wrap">
                    <div className="avatar">
                      {match.other_user.avatar_url
                        ? <img src={match.other_user.avatar_url} alt="" />
                        : "👤"}
                    </div>
                    <div className={`online-dot ${match.other_user.is_online ? "online" : "offline"}`} />
                  </div>

                  <div className="match-info">
                    <div className="match-name">
                      {match.other_user.name}, {match.other_user.age}
                    </div>
                    <div className={`match-preview ${!match.last_message ? "no-msg" : ""}`}>
                      {match.last_message || "Escribile algo ✨"}
                    </div>
                  </div>

                  <span className="match-arrow">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}