"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";
import imgLogo from "../../Images/logo.png";
import imgChat from "../../Images/chat.png";

// ─── TYPES ────────────────────────────────────────────────────────────────────

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
  last_message_time?: string;
  unread_count: number;
  last_message_from_me?: boolean;
};

// ─── MONETAG ─────────────────────────────────────────────────────────────────

const MONETAG_ZONE = "10895969";
const MONETAG_SRC  = "https://nap5k.com/tag.min.js";
let monetagChatInjected = false;

function injectMonetagChat() {
  if (monetagChatInjected || typeof window === "undefined") return;
  const s = document.createElement("script");
  s.dataset.zone = MONETAG_ZONE;
  s.src = MONETAG_SRC;
  s.async = true;
  document.body.appendChild(s);
  monetagChatInjected = true;
}

function AdSlot() {
  useEffect(() => { injectMonetagChat(); }, []);
  return (
    <div className="ad-wrap">
      <div className="ad-label"><span className="ad-dot" />Patrocinado</div>
      <div className="ad-inner" id="monetag-chat-slot">
        <div className="ad-placeholder">
          <span className="ad-icon">✦</span>
          <span className="ad-text">Cargando anuncio...</span>
        </div>
      </div>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7)  return d.toLocaleDateString("es-AR", { weekday: "short" });
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────

function Avatar({ match, size = 48 }: { match: Match; size?: number }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="avatar-wrap" style={{ width: size, height: size }}>
      <div className="avatar" style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}>
        {match.other_user.avatar_url && !imgError ? (
          <img src={match.other_user.avatar_url} alt={match.other_user.name} onError={() => setImgError(true)} />
        ) : (
          <span className="avatar-initials" style={{ fontSize: size * 0.3 }}>
            {getInitials(match.other_user.name)}
          </span>
        )}
      </div>
      <span className={`status-dot ${match.other_user.is_online ? "online" : "offline"}`} />
    </div>
  );
}

// ─── FETCH HELPERS ────────────────────────────────────────────────────────────

async function fetchMatches(myId: string): Promise<Match[]> {
  const { data: matchRows } = await supabase
    .from("matches")
    .select("id, user1, user2")
    .or(`user1.eq.${myId},user2.eq.${myId}`)
    .order("created_at", { ascending: false });

  if (!matchRows?.length) return [];

  const enriched: Match[] = await Promise.all(
    matchRows.map(async (m) => {
      const otherId = m.user1 === myId ? m.user2 : m.user1;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, age, avatar_url, is_online")
        .eq("id", otherId)
        .single();

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at, from_user")
        .or(
          `and(from_user.eq.${myId},to_user.eq.${otherId}),` +
          `and(from_user.eq.${otherId},to_user.eq.${myId})`
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let unread_count = 0;
      const { data: unreadRows, error: unreadErr } = await supabase
        .from("messages")
        .select("id")
        .eq("from_user", otherId)
        .eq("to_user", myId)
        .eq("read", false);
      if (!unreadErr) {
        unread_count = unreadRows?.length ?? 0;
      }

      return {
        id: m.id,
        other_user: profile ?? {
          id: otherId, name: "Usuario", age: 0, avatar_url: null, is_online: false,
        },
        last_message:          lastMsg?.content,
        last_message_time:     lastMsg?.created_at,
        unread_count,
        last_message_from_me:  lastMsg?.from_user === myId,
      };
    })
  );

  return enriched.sort((a, b) => {
    if (b.unread_count !== a.unread_count) return b.unread_count - a.unread_count;
    return new Date(b.last_message_time ?? 0).getTime() -
           new Date(a.last_message_time ?? 0).getTime();
  });
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const router     = useRouter();
  const cursorRef  = useRef<HTMLDivElement>(null);
  const myIdRef    = useRef<string>("");

  const [matches,  setMatches]  = useState<Match[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [mounted,  setMounted]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  // ── CARGA INICIAL ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) { router.push("/"); return; }

      myIdRef.current = me.user.id;
      const data = await fetchMatches(me.user.id);
      setMatches(data);
      setLoading(false);

      // Refetch diferido: cubre el race condition cuando venimos del chat individual.
      // markMessagesAsRead en ConversationPage es async; puede terminar DESPUÉS
      // de que fetchMatches ya corrió arriba. Con 800ms le damos tiempo suficiente.
      setTimeout(async () => {
        const fresh = await fetchMatches(me.user.id);
        setMatches(fresh);
      }, 800);
    };

    init();
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── REALTIME ───────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!myIdRef.current) return;
    const data = await fetchMatches(myIdRef.current);

    setMatches(prev => {
      const prevMap = new Map(prev.map(m => [m.id, m.unread_count]));
      const newFlash = new Set<string>();

      data.forEach(m => {
        const prevCount = prevMap.get(m.id) ?? 0;
        if (m.unread_count > prevCount) {
          newFlash.add(m.id);
        }
      });

      if (newFlash.size > 0) {
        setFlashIds(newFlash);
        setTimeout(() => setFlashIds(new Set()), 700);
      }

      return data;
    });
  }, []);

  // Refetch cuando el usuario vuelve a la ventana (window focus).
  // visibilitychange NO dispara en navegación interna de Next.js (SPA),
  // pero window focus sí cuando el usuario vuelve desde otra tab/app.
  useEffect(() => {
    const onFocus = () => { refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  useEffect(() => {
    // Esperar a que init() termine y myIdRef.current esté seteado
    if (loading || !myIdRef.current) return;

    const channel = supabase
      .channel("chat-list-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { from_user?: string; to_user?: string } | null;
          if (
            row?.from_user === myIdRef.current ||
            row?.to_user   === myIdRef.current
          ) {
            refresh();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => { refresh(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, loading]);

  // ── TÍTULO DEL NAVEGADOR ───────────────────────────────────────────────────
  const totalUnread = matches.reduce((acc, m) => acc + m.unread_count, 0);

  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Tus Chats · Turrinder`;
    } else {
      document.title = "Tus Chats · Turrinder";
    }
    return () => {
      document.title = "Turrinder";
    };
  }, [totalUnread]);

  // ── CURSOR ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top  = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  // ── DERIVADOS ─────────────────────────────────────────────────────────────
  const onlineCount = matches.filter(m => m.other_user.is_online).length;
  const filtered    = matches.filter(m =>
    m.other_user.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:    #030a14;
          --sky:   #54c7f8;
          --sky2:  #3b9eda;
          --sky3:  #1a6fa8;
          --text:  #f5f8ff;
          --muted: rgba(180,215,240,0.42);
          --green: #22c55e;
          --red:   #ef4444;
          --sidebar-w: 320px;
        }

        html, body {
          height: 100%;
          background: #030a14;
          font-family: 'DM Sans', sans-serif;
          color: var(--text);
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
          cursor: none;
        }

        /* ── CURSOR ── */
        .custom-cursor {
          position: fixed; width: 10px; height: 10px;
          background: white; border-radius: 50%;
          pointer-events: none; z-index: 9999;
          transform: translate(-50%, -50%);
          mix-blend-mode: difference;
        }

        /* ── BG CELESTE ── */
        .bg-mesh {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-color: #030a14;
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(84,199,248,0.12) 0%, transparent 80%),
            radial-gradient(ellipse 60% 60% at 100% 100%, rgba(59,158,218,0.08) 0%, transparent 70%);
        }

        /* ══ LAYOUT ══ */
        .layout {
          position: relative; z-index: 1;
          display: flex;
          height: 100vh;
          max-width: 1360px;
          margin: 0 auto;
        }

        /* ══ SIDEBAR ══ */
        .sidebar {
          width: var(--sidebar-w); flex-shrink: 0;
          display: flex; flex-direction: column;
          height: 100vh;
          padding: 44px 32px 28px;
          border-right: 1px solid rgba(255,255,255,0.055);
          position: relative;
        }
        .sidebar::after {
          content: '';
          position: absolute; top: 0; right: -1px; bottom: 0; width: 1px;
          background: linear-gradient(to bottom,
            transparent 0%, rgba(84,199,248,0.28) 30%,
            rgba(84,199,248,0.45) 50%, rgba(84,199,248,0.28) 70%, transparent 100%);
        }

        .sidebar-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 10px; font-weight: 600;
          letter-spacing: 2.5px; text-transform: uppercase;
          color: var(--muted); margin-bottom: 12px;
          opacity: 0; transform: translateY(10px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .sidebar-eyebrow.in { opacity: 1; transform: translateY(0); }
        .sidebar-eyebrow::before { content: ''; display: block; width: 18px; height: 1px; background: var(--muted); opacity: 0.5; }

        .sidebar-brand {
          display: flex; align-items: center; gap: 13px;
          margin-bottom: 14px;
          opacity: 0; transform: translateY(14px);
          transition: opacity 0.7s 0.07s cubic-bezier(0.16,1,0.3,1), transform 0.7s 0.07s cubic-bezier(0.16,1,0.3,1);
        }
        .sidebar-brand.in { opacity: 1; transform: translateY(0); }

        .sidebar-logo {
          flex-shrink: 0; width: 46px; height: 46px;
          border-radius: 14px; overflow: hidden;
          border: 1px solid rgba(84,199,248,0.15);
          box-shadow: 0 0 18px rgba(84,199,248,0.12);
          display: flex; align-items: center; justify-content: center;
          background: rgba(84,199,248,0.05);
        }

        .sidebar-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(32px, 2.8vw, 46px);
          font-weight: 900; letter-spacing: -0.045em; line-height: 0.95;
        }
        .title-plain  { color: var(--text); }
        .title-accent {
          background: linear-gradient(115deg, var(--sky) 0%, #b78bff 70%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .sidebar-sub {
          font-size: 13.5px; color: var(--muted); line-height: 1.65;
          margin-bottom: 28px;
          opacity: 0; transform: translateY(10px);
          transition: opacity 0.7s 0.13s cubic-bezier(0.16,1,0.3,1), transform 0.7s 0.13s cubic-bezier(0.16,1,0.3,1);
        }
        .sidebar-sub.in { opacity: 1; transform: translateY(0); }

        /* Stat blocks */
        .stat-blocks {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          margin-bottom: 24px;
          opacity: 0; transform: translateY(8px);
          transition: opacity 0.6s 0.18s cubic-bezier(0.16,1,0.3,1), transform 0.6s 0.18s cubic-bezier(0.16,1,0.3,1);
        }
        .stat-blocks.in { opacity: 1; transform: translateY(0); }

        .stat-block {
          background: rgba(255,255,255,0.038);
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 15px; padding: 14px 15px 12px;
          display: flex; flex-direction: column; gap: 3px;
          transition: background 0.2s, border-color 0.2s;
        }
        .stat-block:hover { background: rgba(255,255,255,0.062); border-color: rgba(84,199,248,0.18); }

        .stat-block.unread-active {
          border-color: rgba(239,68,68,0.35) !important;
          background: rgba(239,68,68,0.06) !important;
          animation: statPulse 2s ease-in-out infinite;
        }
        @keyframes statPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          50%      { box-shadow: 0 0 0 3px rgba(239,68,68,0.2); }
        }

        .stat-number {
          font-family: 'Syne', sans-serif;
          font-size: 28px; font-weight: 900;
          letter-spacing: -0.045em; line-height: 1;
        }
        .stat-number.sky {
          background: linear-gradient(115deg, var(--sky), var(--sky2));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .stat-number.green  { color: var(--green); }
        .stat-number.red    { color: var(--red); }
        .stat-number.purple {
          background: linear-gradient(115deg, #b78bff, #e879f9);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .stat-label { font-size: 10.5px; font-weight: 500; color: var(--muted); letter-spacing: 0.3px; }
        .stat-dot-row { display: flex; align-items: center; gap: 5px; }
        .stat-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 5px rgba(34,197,94,0.65);
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.28} }

        /* ── AD ── */
        .ad-wrap {
          margin-top: auto; flex-shrink: 0;
          border-radius: 13px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.022);
          position: relative;
          opacity: 0; animation: adIn 0.6s 0.45s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        @keyframes adIn { to { opacity: 1; } }
        .ad-wrap::before {
          content: '';
          position: absolute; top: 0; left: 0; bottom: 0; width: 2px;
          background: linear-gradient(to bottom, transparent, rgba(84,199,248,0.4) 40%, rgba(84,199,248,0.4) 60%, transparent);
        }
        .ad-label {
          display: flex; align-items: center; gap: 4px;
          padding: 7px 12px 0;
          font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
          color: var(--muted); opacity: 0.38;
        }
        .ad-dot { width: 3px; height: 3px; border-radius: 50%; background: currentColor; }
        .ad-inner { padding: 4px 10px 10px; min-height: 60px; display: flex; align-items: center; justify-content: center; position: relative; }
        .ad-placeholder { display: flex; flex-direction: column; align-items: center; gap: 4px; position: absolute; inset: 0; justify-content: center; pointer-events: none; }
        .ad-icon { font-size: 11px; color: rgba(255,255,255,0.055); animation: adPulse 2.5s ease-in-out infinite; }
        @keyframes adPulse { 0%,100%{opacity:0.18} 50%{opacity:0.55} }
        .ad-text { font-size: 9px; color: rgba(255,255,255,0.07); letter-spacing: 1.5px; text-transform: uppercase; }

        /* ══ PANEL DERECHO ══ */
        .panel-right {
          flex: 1; display: flex; flex-direction: column;
          height: 100vh; overflow: hidden; min-width: 0;
        }

        .panel-topbar {
          flex-shrink: 0;
          padding: 30px 36px 0;
          opacity: 0; transform: translateY(-8px);
          transition: opacity 0.55s 0.1s cubic-bezier(0.16,1,0.3,1), transform 0.55s 0.1s cubic-bezier(0.16,1,0.3,1);
        }
        .panel-topbar.in { opacity: 1; transform: translateY(0); }

        .search-inner { position: relative; }
        .search-icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
        .search-input {
          width: 100%;
          background: rgba(255,255,255,0.042);
          border: 1px solid rgba(255,255,255,0.075);
          border-radius: 13px;
          padding: 12px 16px 12px 42px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px; color: var(--text);
          outline: none; cursor: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .search-input::placeholder { color: var(--muted); }
        .search-input:focus { border-color: rgba(84,199,248,0.28); background: rgba(84,199,248,0.032); }

        .panel-divider {
          flex-shrink: 0;
          display: flex; align-items: center; gap: 10px;
          padding: 18px 36px 12px;
          opacity: 0; transition: opacity 0.5s 0.2s ease;
        }
        .panel-divider.in { opacity: 1; }
        .divider-line   { flex: 1; height: 1px; background: rgba(255,255,255,0.05); }
        .divider-label  { font-size: 9.5px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); opacity: 0.4; white-space: nowrap; }

        /* ── LISTA ── */
        .matches-scroll {
          flex: 1; overflow-y: auto;
          padding: 0 36px 36px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .matches-scroll::-webkit-scrollbar { width: 3px; }
        .matches-scroll::-webkit-scrollbar-track { background: transparent; }
        .matches-scroll::-webkit-scrollbar-thumb { background: rgba(84,199,248,0.18); border-radius: 3px; }
        .matches-scroll::-webkit-scrollbar-thumb:hover { background: rgba(84,199,248,0.32); }

        /* ── TARJETA ── */
        .match-card {
          display: flex; align-items: center; gap: 13px;
          padding: 13px 17px;
          background: rgba(255,255,255,0.028);
          border: 1px solid rgba(255,255,255,0.055);
          border-radius: 17px;
          cursor: none; text-align: left; width: 100%;
          position: relative; overflow: hidden;
          opacity: 0; transform: translateX(14px);
          transition:
            opacity    0.42s cubic-bezier(0.16,1,0.3,1),
            transform  0.42s cubic-bezier(0.16,1,0.3,1),
            background 0.16s ease,
            border-color 0.16s ease,
            box-shadow 0.16s ease;
        }
        .match-card.in { opacity: 1; transform: translateX(0); }
        .match-card:hover {
          background: rgba(255,255,255,0.052);
          border-color: rgba(84,199,248,0.17);
          box-shadow: 0 5px 20px -8px rgba(0,0,0,0.4), 0 0 0 1px rgba(84,199,248,0.04) inset;
          transform: translateX(4px);
        }
        .match-card:active { transform: translateX(0); }

        .match-card.has-unread {
          background: rgba(84,199,248,0.042);
          border-color: rgba(84,199,248,0.18);
        }
        .match-card.has-unread:hover {
          border-color: rgba(84,199,248,0.34);
          background: rgba(84,199,248,0.07);
        }
        .match-card.has-unread::before {
          content: '';
          position: absolute; left: 0; top: 18%; bottom: 18%; width: 3px;
          background: linear-gradient(to bottom, #ef4444, #dc2626);
          border-radius: 0 3px 3px 0;
          box-shadow: 0 0 10px rgba(239,68,68,0.7);
        }

        .match-card.new-flash {
          animation: newFlash 0.65s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes newFlash {
          0%   { box-shadow: 0 0 0 0   rgba(239,68,68,0);    background: rgba(84,199,248,0.042); }
          25%  { box-shadow: 0 0 0 5px rgba(239,68,68,0.35); background: rgba(239,68,68,0.10); }
          60%  { box-shadow: 0 0 0 2px rgba(239,68,68,0.15); background: rgba(239,68,68,0.06); }
          100% { box-shadow: 0 0 0 0   rgba(239,68,68,0);    background: rgba(84,199,248,0.042); }
        }

        /* ── AVATAR ── */
        .avatar-wrap { position: relative; flex-shrink: 0; }
        .avatar {
          background: linear-gradient(135deg, #0d1e33, #0a2240);
          border: 1.5px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; transition: border-color 0.16s;
        }
        .match-card:hover .avatar { border-color: rgba(84,199,248,0.22); }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-initials {
          font-family: 'Syne', sans-serif; font-weight: 900;
          background: linear-gradient(135deg, var(--sky), #b78bff);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          letter-spacing: -0.5px;
        }
        .status-dot {
          position: absolute; bottom: 1px; right: 1px;
          width: 10px; height: 10px; border-radius: 50%;
          border: 2px solid var(--bg);
        }
        .status-dot.online  { background: var(--green); box-shadow: 0 0 5px rgba(34,197,94,0.65); }
        .status-dot.offline { background: rgba(255,255,255,0.12); }

        /* ── INFO ── */
        .match-info { flex: 1; min-width: 0; }
        .match-top {
          display: flex; align-items: baseline;
          justify-content: space-between; gap: 8px; margin-bottom: 3px;
        }
        .match-name {
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 800;
          letter-spacing: -0.025em; color: #f5f5fa;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .match-card.has-unread .match-name { color: #fff; }
        .match-time { font-size: 10.5px; color: var(--muted); flex-shrink: 0; opacity: 0.6; }
        .match-card.has-unread .match-time { color: var(--sky); opacity: 0.9; font-weight: 600; }

        .match-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .match-preview {
          font-size: 12.5px; color: var(--muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          line-height: 1.4; flex: 1; min-width: 0;
        }
        .match-preview.no-msg       { color: rgba(84,199,248,0.38); font-style: italic; }
        .match-preview.unread-text  { color: rgba(255,255,255,0.82); font-weight: 500; }
        .preview-you { color: rgba(84,199,248,0.52); font-weight: 500; }

        .unread-badge {
          display: flex; align-items: center; justify-content: center;
          background: #ef4444;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 10px; font-weight: 900;
          min-width: 22px; height: 22px;
          padding: 0 6px; border-radius: 11px; flex-shrink: 0;
          box-shadow: 0 2px 12px rgba(239,68,68,0.6), 0 0 0 2px rgba(239,68,68,0.2);
          animation: badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes badgePop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }

        .new-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 8px rgba(239,68,68,0.9);
          flex-shrink: 0;
          animation: dotPulse 1.4s ease-in-out infinite;
        }
        @keyframes dotPulse { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:0.5; transform:scale(0.7)} }

        /* ── SKELETON ── */
        .skel-card {
          display: flex; align-items: center; gap: 13px;
          padding: 13px 17px;
          background: rgba(255,255,255,0.022);
          border: 1px solid rgba(255,255,255,0.045);
          border-radius: 17px;
        }
        .skel-avatar { width: 48px; height: 48px; border-radius: 14px; background: rgba(255,255,255,0.046); flex-shrink: 0; animation: pulse 1.6s ease-in-out infinite; }
        .skel-lines  { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .skel-top-row { display: flex; justify-content: space-between; gap: 10px; }
        .skel-line { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.046); animation: pulse 1.6s ease-in-out infinite; }
        .skel-line.w55 { width: 55%; }
        .skel-line.w18 { width: 18%; animation-delay: 0.2s; }
        .skel-line.w38 { width: 38%; animation-delay: 0.1s; }
        @keyframes pulse { 0%,100%{opacity:0.18} 50%{opacity:0.62} }

        /* ── EMPTY ── */
        .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 10px; text-align: center; }
        .empty-icon-wrap { display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        @keyframes floatIcon { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .empty-title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 900; color: rgba(248,248,252,0.22); letter-spacing: -0.03em; }
        .empty-sub   { font-size: 13.5px; color: var(--muted); line-height: 1.6; max-width: 300px; }
        .empty-btn {
          margin-top: 12px; padding: 12px 30px;
          background: linear-gradient(135deg, var(--sky), var(--sky2) 60%, var(--sky3));
          border: none; border-radius: 100px;
          color: #020d18; font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 800;
          cursor: none; letter-spacing: 0.3px;
          box-shadow: 0 5px 16px rgba(84,199,248,0.28);
          position: relative; overflow: hidden;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .empty-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent 50%); }
        .empty-btn:hover { transform: translateY(-2px); box-shadow: 0 9px 22px rgba(84,199,248,0.4); }
        .no-results { padding: 32px 0; text-align: center; color: var(--muted); font-size: 13.5px; }

        /* ══ MOBILE STATS FOOTER ══ */
        /* Oculto en desktop */
        .mobile-stats-footer { display: none; }

        /* ── MOBILE ── */
        @media (max-width: 800px) {
          html, body { overflow: auto; cursor: auto; }
          .custom-cursor { display: none; }

          .layout {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
          }

          /* SIDEBAR: textos + ad, sin stats */
          .sidebar {
            width: 100%;
            height: auto;
            padding: 32px 20px 0;
            border-right: none;
            border-bottom: none;
            display: flex;
            flex-direction: column;
          }
          .sidebar::after { display: none; }

          /* Ad pierde el margin-top: auto para quedar pegado al texto */
          .ad-wrap {
            margin-top: 20px;
            margin-bottom: 0;
          }

          /* Stats del sidebar se ocultan — van al footer */
          .stat-blocks { display: none !important; }

          /* PANEL DERECHO */
          .panel-right {
            height: auto;
            overflow: visible;
            /* Espacio para el footer fijo */
            padding-bottom: 96px;
          }
          .panel-topbar  { padding: 20px 20px 0; }
          .panel-divider { padding: 14px 20px 8px; }
          .matches-scroll {
            overflow-y: visible;
            flex: none;
            padding: 0 20px 16px;
          }

          /* ── FOOTER FIJO CON STATS ── */
          .mobile-stats-footer {
            display: flex !important;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            z-index: 200;
            padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
            gap: 8px;
            background: rgba(3,10,20,0.86);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-top: 1px solid rgba(84,199,248,0.13);
            box-shadow: 0 -8px 32px rgba(0,0,0,0.35);
          }
          .mobile-stats-footer .stat-block {
            flex: 1;
            padding: 10px 12px 9px;
            border-radius: 14px;
            /* reset hover que no aplica en mobile */
            transition: none;
          }
          .mobile-stats-footer .stat-number {
            font-size: 22px;
          }
          .mobile-stats-footer .stat-block.unread-active {
            flex: 1.3;
          }

          /* En mobile los cards no tienen cursor: none */
          .match-card { cursor: pointer; }
          .search-input { cursor: text; }
          .empty-btn { cursor: pointer; }
        }
      `}</style>

      <div ref={cursorRef} className="custom-cursor" />
      <div className="bg-mesh" />

      <div className="layout">

        {/* ════ SIDEBAR ════ */}
        <aside className="sidebar">
          <div className={`sidebar-eyebrow ${mounted ? "in" : ""}`}>Mensajes</div>

          <div className={`sidebar-brand ${mounted ? "in" : ""}`}>
            <h1 className="sidebar-title">
              <span className="title-plain">Tus </span>
              <span className="title-accent">Chats</span>
            </h1>
          </div>

          <p className={`sidebar-sub ${mounted ? "in" : ""}`}>
            Conectá con quienes ya tienen algo en común con vos.
          </p>

          {/* Stats — solo visibles en desktop (en mobile van al footer) */}
          {!loading && (
            <div className={`stat-blocks ${mounted ? "in" : ""}`}>
              <div className="stat-block">
                <span className="stat-number sky">{matches.length}</span>
                <span className="stat-label">Conexiones</span>
              </div>
              <div className="stat-block">
                <span className="stat-number green">{onlineCount}</span>
                <div className="stat-dot-row">
                  <span className="stat-dot" />
                  <span className="stat-label">Online</span>
                </div>
              </div>
              {totalUnread > 0 && (
                <div
                  className="stat-block unread-active"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <span className="stat-number red">{totalUnread}</span>
                  <span className="stat-label">Sin leer</span>
                </div>
              )}
            </div>
          )}

          <AdSlot />
        </aside>

        {/* ════ PANEL DERECHO ════ */}
        <div className="panel-right">

          {!loading && matches.length > 0 && (
            <div className={`panel-topbar ${mounted ? "in" : ""}`}>
              <div className="search-inner">
                <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input type="text" className="search-input"
                  placeholder="Buscar una conexión..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          )}

          {!loading && matches.length > 0 && (
            <div className={`panel-divider ${mounted ? "in" : ""}`}>
              <div className="divider-line" />
              <span className="divider-label">
                {search
                  ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`
                  : "Conversaciones"}
              </span>
              <div className="divider-line" />
            </div>
          )}

          {loading ? (
            <div className="matches-scroll">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="skel-card" style={{ animationDelay: `${i * 0.065}s` }}>
                  <div className="skel-avatar" />
                  <div className="skel-lines">
                    <div className="skel-top-row">
                      <div className="skel-line w55" />
                      <div className="skel-line w18" />
                    </div>
                    <div className="skel-line w38" />
                  </div>
                </div>
              ))}
            </div>

          ) : matches.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <Image src={imgChat} alt="Sin matches" width={110} height={110} style={{ objectFit: "contain", animation: "floatIcon 3s ease-in-out infinite", filter: "drop-shadow(0 0 22px rgba(84,199,248,0.4))" }} />
              </div>
              <div className="empty-title">Sin matches aún</div>
              <p className="empty-sub">
                Cuando los dos se den like, aparece acá para empezar a charlar.
              </p>
              <button className="empty-btn" onClick={() => router.push("/modalidades/ligues")}>
                Ir a Ligues ✨
              </button>
            </div>

          ) : (
            <div className="matches-scroll">
              {filtered.length === 0 ? (
                <div className="no-results">Nadie por acá con ese filtro 👀</div>
              ) : (
                filtered.map((match, i) => {
                  const hasUnread = match.unread_count > 0;
                  const isFlashing = flashIds.has(match.id);
                  return (
                    <button
                      key={match.id}
                      className={[
                        "match-card",
                        mounted     ? "in"        : "",
                        hasUnread   ? "has-unread": "",
                        isFlashing  ? "new-flash" : "",
                      ].filter(Boolean).join(" ")}
                      style={{ transitionDelay: mounted ? `${0.06 + i * 0.042}s` : "0s" }}
                      onClick={() => {
                        // Marcar como leído optimistamente en el estado local
                        // antes de navegar, sin esperar a la DB ni al realtime.
                        if (match.unread_count > 0) {
                          setMatches(prev =>
                            prev.map(m =>
                              m.id === match.id ? { ...m, unread_count: 0 } : m
                            )
                          );
                        }
                        router.push(`/chat/${match.other_user.id}`);
                      }}
                    >
                      <Avatar match={match} size={48} />

                      <div className="match-info">
                        <div className="match-top">
                          <span className="match-name">
                            {match.other_user.name}, {match.other_user.age}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {hasUnread && <span className="new-dot" />}
                            {match.last_message_time && (
                              <span className="match-time">
                                {formatTime(match.last_message_time)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="match-bottom">
                          <span className={`match-preview ${
                            !match.last_message
                              ? "no-msg"
                              : hasUnread && !match.last_message_from_me
                              ? "unread-text"
                              : ""
                          }`}>
                            {match.last_message ? (
                              <>
                                {match.last_message_from_me && (
                                  <span className="preview-you">Vos: </span>
                                )}
                                {match.last_message}
                              </>
                            ) : (
                              "Escribile algo ✨"
                            )}
                          </span>

                          {hasUnread && (
                            <span className="unread-badge">
                              {match.unread_count > 99 ? "99+" : match.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ════ MOBILE STATS FOOTER (fixed, solo visible en mobile) ════ */}
        {!loading && (
          <div className="mobile-stats-footer">
            <div className="stat-block">
              <span className="stat-number sky">{matches.length}</span>
              <span className="stat-label">Conexiones</span>
            </div>
            <div className="stat-block">
              <span className="stat-number green">{onlineCount}</span>
              <div className="stat-dot-row">
                <span className="stat-dot" />
                <span className="stat-label">Online</span>
              </div>
            </div>
            {totalUnread > 0 && (
              <div className="stat-block unread-active">
                <span className="stat-number red">{totalUnread}</span>
                <span className="stat-label">Sin leer</span>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}