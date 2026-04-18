"use client";

import React, { useEffect, useState } from "react";
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

export default function ChatPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── TOKENS ── */
        .cl-root {
          --sky:      #54c7f8;
          --sky2:     #3b9eda;
          --sky3:     #1a6fa8;
          --sky-glow: rgba(84,199,248,0.38);
          --w:        #f5f8ff;
          --bg:       #030a14;
          --bg2:      #050f1e;
          --glass:    rgba(84,199,248,0.04);
          --glass-b:  rgba(84,199,248,0.12);
          --muted:    rgba(180,215,240,0.45);
        }

        .cl-root {
          min-height: 100vh;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          padding-bottom: 80px;
          position: relative;
          -webkit-font-smoothing: antialiased;
        }

        /* Aurora ambiental */
        .cl-root::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse 70% 35% at 15% 0%,  rgba(84,199,248,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 50% 30% at 85% 100%, rgba(59,158,218,0.08) 0%, transparent 58%);
        }

        /* Flag stripe */
        .cl-flag {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg,
            var(--sky) 0%,  var(--sky) 33%,
            rgba(245,248,255,0.85) 33%, rgba(245,248,255,0.85) 66%,
            var(--sky) 66%, var(--sky) 100%
          );
          z-index: 200;
          opacity: 0.65;
        }

        /* ── HEADER ── */
        .cl-header {
          padding: 56px 24px 24px;
          position: relative;
          z-index: 1;
        }

        .cl-header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .cl-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: var(--sky);
          margin-bottom: 6px;
          opacity: 0.8;
        }

        .cl-title {
          font-family: 'Syne', sans-serif;
          font-size: 34px;
          font-weight: 900;
          color: var(--w);
          letter-spacing: -1px;
          line-height: 1;
        }

        .cl-count {
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 50%, var(--sky3) 100%);
          color: #020d18;
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 800;
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-top: 4px;
          box-shadow: 0 4px 16px rgba(84,199,248,0.45);
        }

        /* ── LISTA ── */
        .cl-list {
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .cl-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: var(--glass);
          border: 1px solid var(--glass-b);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }

        .cl-card:hover {
          background: rgba(84,199,248,0.08);
          border-color: rgba(84,199,248,0.28);
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(84,199,248,0.1);
        }

        .cl-card:active { transform: translateY(0); }

        /* ── AVATAR ── */
        .cl-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .cl-avatar {
          width: 56px; height: 56px;
          border-radius: 18px;
          background: linear-gradient(135deg, #060f1e, #0a1a2e);
          border: 1.5px solid var(--glass-b);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          overflow: hidden;
        }

        .cl-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .cl-online-dot {
          position: absolute;
          bottom: 2px; right: 2px;
          width: 12px; height: 12px;
          border-radius: 50%;
          border: 2px solid var(--bg);
        }

        .cl-online-dot.online {
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
        }

        .cl-online-dot.offline { background: rgba(255,255,255,0.18); }

        /* ── INFO ── */
        .cl-info { flex: 1; min-width: 0; }

        .cl-name {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--w);
          margin-bottom: 4px;
        }

        .cl-preview {
          font-size: 13px;
          color: var(--muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cl-preview.no-msg {
          color: rgba(84,199,248,0.55);
          font-style: italic;
        }

        .cl-arrow {
          color: rgba(84,199,248,0.2);
          font-size: 20px;
          flex-shrink: 0;
          transition: color 0.2s ease;
        }
        .cl-card:hover .cl-arrow {
          color: rgba(84,199,248,0.55);
        }

        /* ── SKELETON ── */
        .cl-skeleton {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0 16px;
          position: relative;
          z-index: 1;
        }

        .cl-skel-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: var(--glass);
          border: 1px solid rgba(84,199,248,0.06);
          border-radius: 20px;
        }

        .skel-avatar {
          width: 56px; height: 56px;
          border-radius: 18px;
          background: rgba(84,199,248,0.07);
          flex-shrink: 0;
          animation: shimmer 1.4s ease-in-out infinite;
        }

        .skel-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }

        .skel-line {
          height: 11px;
          border-radius: 6px;
          background: rgba(84,199,248,0.07);
          animation: shimmer 1.4s ease-in-out infinite;
        }

        .skel-line.w60 { width: 60%; }
        .skel-line.w40 { width: 40%; }

        @keyframes shimmer {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.85; }
        }

        /* ── EMPTY STATE ── */
        .cl-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 40px;
          gap: 16px;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .cl-empty-icon {
          font-size: 64px;
          filter: grayscale(0.2);
          margin-bottom: 8px;
        }

        .cl-empty-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: rgba(240,248,255,0.55);
          letter-spacing: -0.5px;
        }

        .cl-empty-sub {
          font-size: 14px;
          color: var(--muted);
          line-height: 1.7;
          max-width: 260px;
        }

        .cl-empty-btn {
          margin-top: 12px;
          padding: 14px 32px;
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 50%, var(--sky3) 100%);
          border: none;
          border-radius: 100px;
          color: #020d18;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          letter-spacing: 0.3px;
          box-shadow: 0 8px 24px rgba(84,199,248,0.4);
          position: relative;
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }

        .cl-empty-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent 55%);
        }

        .cl-empty-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(84,199,248,0.55);
        }

        .cl-empty-btn:active { transform: translateY(0); }
      `}</style>

      {/* Flag stripe */}
      <div className="cl-flag" />

      <div className="cl-root">
        <div className="cl-header">
          <div className="cl-header-top">
            <div>
              <div className="cl-label">Conexiones</div>
              <div className="cl-title">Matches</div>
            </div>
            {!loading && matches.length > 0 && (
              <div className="cl-count">{matches.length}</div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="cl-skeleton">
            {[1, 2, 3].map((i) => (
              <div key={i} className="cl-skel-card">
                <div className="skel-avatar" />
                <div className="skel-lines">
                  <div className="skel-line w60" />
                  <div className="skel-line w40" />
                </div>
              </div>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="cl-empty">
            <div className="cl-empty-icon">💫</div>
            <div className="cl-empty-title">Sin matches aún</div>
            <p className="cl-empty-sub">
              Cuando ambos se den like, el contacto aparece acá para que puedan chatear.
            </p>
            <button className="cl-empty-btn" onClick={() => router.push("/discover")}>
              Ir a Discover ✨
            </button>
          </div>
        ) : (
          <div className="cl-list">
            {matches.map((match) => (
              <button
                key={match.id}
                className="cl-card"
                onClick={() => router.push(`/chat/${match.other_user.id}`)}
              >
                <div className="cl-avatar-wrap">
                  <div className="cl-avatar">
                    {match.other_user.avatar_url
                      ? <img src={match.other_user.avatar_url} alt="" />
                      : "👤"}
                  </div>
                  <div className={`cl-online-dot ${match.other_user.is_online ? "online" : "offline"}`} />
                </div>

                <div className="cl-info">
                  <div className="cl-name">
                    {match.other_user.name}, {match.other_user.age}
                  </div>
                  <div className={`cl-preview ${!match.last_message ? "no-msg" : ""}`}>
                    {match.last_message || "Escribile algo ✨"}
                  </div>
                </div>

                <span className="cl-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}