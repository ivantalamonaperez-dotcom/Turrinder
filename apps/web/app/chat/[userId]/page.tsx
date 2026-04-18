"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/services/supabase.client";
import { chatService } from "@/features/chat/chat.service";
import { useRouter, useParams } from "next/navigation";

type Message = {
  id: string;
  from_user: string;
  to_user: string;
  content: string;
  created_at: string;
};

type Profile = {
  name: string;
  age: number;
  avatar_url: string | null;
  is_online: boolean;
  bio?: string;
};

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const otherId = params.userId as string;

  const [myId, setMyId] = useState("");
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showProfile, setShowProfile] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const myIdRef = useRef("");

  useEffect(() => {
    const load = async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) { router.push("/"); return; }
      setMyId(me.user.id);
      myIdRef.current = me.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, age, avatar_url, is_online, bio")
        .eq("id", otherId)
        .single();
      setOtherUser(profile);

      const msgs = await chatService.loadMessages(me.user.id, otherId, 0);
      setMessages(msgs);
      setHasMore(msgs.length === 30);

      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 50);

      const channel = chatService.listenMessages(me.user.id, otherId, (msg) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      });

      return () => supabase.removeChannel(channel);
    };

    let cleanup: (() => void) | undefined;
    load().then((fn) => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [otherId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !myIdRef.current) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const older = await chatService.loadMessages(myIdRef.current, otherId, nextPage);
    if (older.length < 30) setHasMore(false);
    if (older.length > 0) {
      setMessages((prev) => [...older, ...prev]);
      setPage(nextPage);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, otherId]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop < 80) loadMore();
  }, [loadMore]);

  const sendMessage = async () => {
    if (!text.trim() || sending || !myId) return;
    const content = text.trim();
    setText("");
    setSending(true);

    const optimistic: Message = {
      id: "temp-" + Date.now(),
      from_user: myId,
      to_user: otherId,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30);

    try {
      await chatService.sendMessage(myId, otherId, content);
    } catch {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── TOKENS (espejados desde ChatPage) ── */
        .cv-root {
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

        .cv-root {
          height: calc(100vh - 64px);
          display: flex;
          flex-direction: column;
          background: var(--bg);
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
          position: relative;
        }

        /* Aurora ambiental */
        .cv-root::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse 70% 35% at 15% 0%,  rgba(84,199,248,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 50% 30% at 85% 100%, rgba(59,158,218,0.06) 0%, transparent 58%);
        }

        /* Flag stripe */
        .cv-flag {
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

        /* Top bar */
        .cv-topbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 52px 20px 14px;
          border-bottom: 1px solid var(--glass-b);
          background: rgba(3,10,20,0.97);
          backdrop-filter: blur(20px);
          flex-shrink: 0;
          z-index: 10;
          position: relative;
        }

        .cv-back {
          background: var(--glass);
          border: 1px solid var(--glass-b);
          border-radius: 50%;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          color: var(--muted);
          font-size: 20px;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s;
          line-height: 1;
        }
        .cv-back:hover {
          background: rgba(84,199,248,0.10);
          border-color: rgba(84,199,248,0.3);
          color: var(--sky);
        }

        .cv-topbar-avatar {
          width: 36px; height: 36px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(84,199,248,0.2), rgba(59,158,218,0.1));
          border: 1.5px solid var(--glass-b);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .cv-topbar-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .cv-topbar-info { flex: 1; min-width: 0; }

        .cv-topbar-name {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--w);
        }

        .cv-topbar-status {
          display: flex; align-items: center; gap: 5px;
          margin-top: 1px;
        }

        .cv-status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
        }
        .cv-status-dot.online { background: #22c55e; box-shadow: 0 0 5px #22c55e; }
        .cv-status-dot.offline { background: rgba(84,199,248,0.18); }
        .cv-status-text { font-size: 11px; color: var(--muted); }

        .cv-toggle-btn {
          background: var(--glass);
          border: 1px solid var(--glass-b);
          border-radius: 10px;
          padding: 6px 12px;
          color: var(--muted);
          font-size: 12px;
          cursor: pointer;
          flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .cv-toggle-btn:hover {
          color: var(--sky);
          border-color: rgba(84,199,248,0.3);
          background: rgba(84,199,248,0.08);
        }

        /* Main body */
        .cv-body {
          flex: 1;
          display: flex;
          min-height: 0;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }

        /* Profile panel — 38% */
        .cv-profile {
          width: 38%;
          flex-shrink: 0;
          border-right: 1px solid var(--glass-b);
          overflow-y: auto;
          background: rgba(84,199,248,0.02);
          display: flex;
          flex-direction: column;
          transition: width 0.3s ease;
        }

        .cv-profile.hidden {
          width: 0;
          overflow: hidden;
          border: none;
        }

        .cv-profile::-webkit-scrollbar { width: 0; }

        .cv-profile-hero {
          padding: 28px 20px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          border-bottom: 1px solid var(--glass-b);
        }

        .cv-big-avatar {
          width: 90px; height: 90px;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(84,199,248,0.2), rgba(59,158,218,0.1));
          border: 2px solid rgba(84,199,248,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 40px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 8px 24px rgba(84,199,248,0.12);
        }

        .cv-big-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .cv-online-badge {
          position: absolute;
          bottom: 4px; right: 4px;
          width: 14px; height: 14px;
          border-radius: 50%;
          border: 2.5px solid var(--bg);
        }
        .cv-online-badge.online { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
        .cv-online-badge.offline { background: rgba(84,199,248,0.2); }

        .cv-profile-name {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: var(--w);
          text-align: center;
          letter-spacing: -0.5px;
        }

        .cv-profile-status {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px;
          color: var(--muted);
        }

        .cv-profile-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .cv-section-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: var(--sky);
          opacity: 0.7;
          margin-bottom: 4px;
        }

        .cv-bio {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.7;
          font-style: italic;
        }

        .cv-bio.empty { color: rgba(84,199,248,0.25); }

        .cv-stat-row {
          display: flex;
          gap: 8px;
        }

        .cv-stat {
          flex: 1;
          background: var(--glass);
          border: 1px solid var(--glass-b);
          border-radius: 14px;
          padding: 12px;
          text-align: center;
          transition: all 0.2s;
        }
        .cv-stat:hover {
          background: rgba(84,199,248,0.08);
          border-color: rgba(84,199,248,0.25);
        }

        .cv-stat-val {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: var(--sky);
        }

        .cv-stat-key {
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        .cv-match-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(84,199,248,0.06);
          border: 1px solid rgba(84,199,248,0.18);
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 13px;
          color: var(--muted);
        }

        /* Chat panel — 62% */
        .cv-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
        }

        .cv-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-height: 0;
        }
        .cv-messages::-webkit-scrollbar { width: 0; }

        .cv-load-more {
          align-self: center;
          background: var(--glass);
          border: 1px solid var(--glass-b);
          border-radius: 100px;
          color: var(--muted);
          font-size: 11px;
          padding: 5px 14px;
          cursor: pointer;
          margin-bottom: 10px;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .cv-load-more:hover {
          background: rgba(84,199,248,0.08);
          color: var(--sky);
          border-color: rgba(84,199,248,0.28);
        }

        .cv-empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0.35;
        }
        .cv-empty-chat-icon { font-size: 36px; }
        .cv-empty-chat-text { font-size: 13px; color: var(--muted); }

        .cv-msg-row {
          display: flex;
          align-items: flex-end;
          gap: 6px;
        }
        .cv-msg-row.mine { flex-direction: row-reverse; }

        .cv-bubble {
          max-width: 78%;
          padding: 9px 13px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.5;
          word-break: break-word;
        }

        .cv-bubble.mine {
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 50%, var(--sky3) 100%);
          color: #020d18;
          border-bottom-right-radius: 4px;
          font-weight: 500;
          box-shadow: 0 4px 14px rgba(84,199,248,0.25);
        }

        .cv-bubble.theirs {
          background: var(--glass);
          border: 1px solid var(--glass-b);
          color: var(--w);
          border-bottom-left-radius: 4px;
        }

        .cv-bubble.grouped-mine { border-top-right-radius: 4px; }
        .cv-bubble.grouped-theirs { border-top-left-radius: 4px; }
        .cv-bubble.sending { opacity: 0.55; }

        .cv-msg-time {
          font-size: 10px;
          color: rgba(84,199,248,0.25);
          white-space: nowrap;
          margin-bottom: 2px;
          flex-shrink: 0;
        }

        /* Input */
        .cv-input-area {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          padding: 10px 12px 16px;
          border-top: 1px solid var(--glass-b);
          background: rgba(3,10,20,0.98);
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        .cv-input {
          flex: 1;
          background: var(--glass);
          border: 1px solid var(--glass-b);
          border-radius: 20px;
          padding: 10px 15px;
          font-size: 14px;
          color: var(--w);
          font-family: 'DM Sans', sans-serif;
          outline: none;
          resize: none;
          max-height: 100px;
          line-height: 1.5;
          transition: border-color 0.2s;
        }
        .cv-input::placeholder { color: rgba(84,199,248,0.25); }
        .cv-input:focus { border-color: rgba(84,199,248,0.4); box-shadow: 0 0 0 3px rgba(84,199,248,0.06); }

        .cv-send {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--sky) 0%, var(--sky2) 50%, var(--sky3) 100%);
          border: none;
          color: #020d18;
          font-size: 14px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(84,199,248,0.35);
        }
        .cv-send:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 6px 20px rgba(84,199,248,0.5); }
        .cv-send:active:not(:disabled) { transform: scale(0.94); }
        .cv-send:disabled { opacity: 0.3; cursor: not-allowed; box-shadow: none; }

        /* Responsive — ocultar panel en pantallas chicas */
        @media (max-width: 600px) {
          .cv-profile { display: none; }
          .cv-toggle-btn { display: none; }
        }
      `}</style>

      {/* Flag stripe */}
      <div className="cv-flag" />

      <div className="cv-root">
        {/* Top bar */}
        <div className="cv-topbar">
          <button className="cv-back" onClick={() => router.push("/chat")}>‹</button>

          <div className="cv-topbar-avatar">
            {otherUser?.avatar_url
              ? <img src={otherUser.avatar_url} alt="" />
              : "👤"}
          </div>

          <div className="cv-topbar-info">
            <div className="cv-topbar-name">
              {otherUser ? `${otherUser.name}, ${otherUser.age}` : "..."}
            </div>
            <div className="cv-topbar-status">
              <div className={`cv-status-dot ${otherUser?.is_online ? "online" : "offline"}`} />
              <span className="cv-status-text">
                {otherUser?.is_online ? "En línea" : "Desconectado"}
              </span>
            </div>
          </div>

          <button
            className="cv-toggle-btn"
            onClick={() => setShowProfile((p) => !p)}
          >
            {showProfile ? "Ocultar perfil" : "Ver perfil"}
          </button>
        </div>

        {/* Body */}
        <div className="cv-body">

          {/* Panel de perfil */}
          <div className={`cv-profile ${showProfile ? "" : "hidden"}`}>
            <div className="cv-profile-hero">
              <div className="cv-big-avatar">
                {otherUser?.avatar_url
                  ? <img src={otherUser.avatar_url} alt="" />
                  : "👤"}
                <div className={`cv-online-badge ${otherUser?.is_online ? "online" : "offline"}`} />
              </div>

              <div className="cv-profile-name">
                {otherUser ? `${otherUser.name}` : "..."}
              </div>

              <div className="cv-profile-status">
                <span>{otherUser?.is_online ? "🟢 En línea ahora" : "⚫ Desconectado"}</span>
              </div>
            </div>

            <div className="cv-profile-body">
              <div className="cv-stat-row">
                <div className="cv-stat">
                  <div className="cv-stat-val">{otherUser?.age ?? "—"}</div>
                  <div className="cv-stat-key">años</div>
                </div>
                <div className="cv-stat">
                  <div className="cv-stat-val">{messages.length}</div>
                  <div className="cv-stat-key">mensajes</div>
                </div>
              </div>

              <div>
                <div className="cv-section-label">Bio</div>
                <p className={`cv-bio ${!otherUser?.bio ? "empty" : ""}`}>
                  {otherUser?.bio || "Sin descripción aún..."}
                </p>
              </div>

              <div className="cv-match-badge">
                💙 Se dieron like mutuamente
              </div>
            </div>
          </div>

          {/* Panel de chat */}
          <div className="cv-chat">
            <div className="cv-messages" onScroll={handleScroll}>
              {hasMore && (
                <button className="cv-load-more" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Cargando..." : "Ver anteriores"}
                </button>
              )}

              {messages.length === 0 ? (
                <div className="cv-empty-chat">
                  <div className="cv-empty-chat-icon">👋</div>
                  <div className="cv-empty-chat-text">Sé el primero en escribir</div>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.from_user === myId;
                  const prev = messages[i - 1];
                  const isGrouped = prev && prev.from_user === msg.from_user;
                  const isTemp = msg.id.startsWith("temp-");

                  return (
                    <div
                      key={msg.id}
                      className={`cv-msg-row ${isMine ? "mine" : ""}`}
                      style={{ marginTop: isGrouped ? 2 : 10 }}
                    >
                      <div className={`cv-bubble ${isMine ? "mine" : "theirs"} ${isGrouped ? (isMine ? "grouped-mine" : "grouped-theirs") : ""} ${isTemp ? "sending" : ""}`}>
                        {msg.content}
                      </div>
                      {!isGrouped && (
                        <span className="cv-msg-time">{formatTime(msg.created_at)}</span>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="cv-input-area">
              <textarea
                className="cv-input"
                placeholder="Escribí algo..."
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKey}
              />
              <button
                className="cv-send"
                onClick={sendMessage}
                disabled={!text.trim() || sending}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}