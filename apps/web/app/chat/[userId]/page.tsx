"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/services/supabase.client";
import { chatService } from "@/features/chat/chat.service";
import { useRouter, useParams } from "next/navigation";

// ─── TYPES ────────────────────────────────────────────────────────────────────

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
  gender?: string;
  location?: string;
  occupation?: string;
  languages?: string[];
  interests?: string[];
  looking_for?: string[];
  photos?: string[];
};

type ModalKind = "unmatch" | "report" | null;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const REPORT_REASONS = [
  { id: "spam",       label: "Spam o bot",        emoji: "🤖" },
  { id: "harassment", label: "Acoso",              emoji: "🚫" },
  { id: "fake",       label: "Perfil falso",       emoji: "🎭" },
  { id: "offensive",  label: "Contenido ofensivo", emoji: "⚠️" },
  { id: "underage",   label: "Menor de edad",      emoji: "🔞" },
  { id: "other",      label: "Otro motivo",        emoji: "📋" },
];

const LOOKING_FOR_MAP: Record<string, { label: string; emoji: string }> = {
  friends:  { label: "Amigos",    emoji: "👥" },
  dates:    { label: "Citas",     emoji: "💫" },
  chat:     { label: "Charlar",   emoji: "💬" },
  network:  { label: "Streamer",  emoji: "🎙️" },
  collab:   { label: "Colabs",    emoji: "🤝" },
  creative: { label: "Creativos", emoji: "🎨" },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isToday) return "Hoy";
  if (isYesterday) return "Ayer";
  return d.toLocaleDateString("es", { day: "numeric", month: "long" });
};

const groupByDate = (msgs: Message[]) => {
  const groups: { label: string; msgs: Message[] }[] = [];
  let cur = "";
  msgs.forEach((m) => {
    const label = fmtDate(m.created_at);
    if (label !== cur) { groups.push({ label, msgs: [] }); cur = label; }
    groups[groups.length - 1].msgs.push(m);
  });
  return groups;
};

// ─── AVATAR ──────────────────────────────────────────────────────────────────

const Avatar = ({
  url, name, size = 36, radius = 12, online,
}: {
  url: string | null; name: string;
  size?: number; radius?: number; online?: boolean;
}) => (
  <div style={{
    width: size, height: size, borderRadius: radius, flexShrink: 0,
    background: "linear-gradient(135deg,#0d1f38,#081628)",
    border: "1.5px solid rgba(84,199,248,0.12)",
    overflow: "hidden", display: "flex", alignItems: "center",
    justifyContent: "center", position: "relative",
    boxShadow: "0 2px 12px rgba(0,0,0,.45)",
  }}>
    {url
      ? <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : <span style={{ color: "rgba(84,199,248,0.7)", fontWeight: 900, fontFamily: "Syne,sans-serif", fontSize: size * 0.38 }}>{name?.[0]?.toUpperCase() ?? "?"}</span>}
    {online !== undefined && (
      <span style={{
        position: "absolute",
        bottom: size > 30 ? 2 : 1,
        right:  size > 30 ? 2 : 1,
        width:  Math.max(size * 0.22, 8),
        height: Math.max(size * 0.22, 8),
        borderRadius: "50%",
        background: online ? "#22c55e" : "rgba(255,255,255,0.15)",
        border: `${size > 30 ? 2 : 1.5}px solid #060f1e`,
        boxShadow: online ? "0 0 8px rgba(34,197,94,.7)" : "none",
        transition: "all .3s",
      }} />
    )}
  </div>
);

const TypingDots = () => (
  <div style={{ display: "flex", gap: 5, padding: "10px 14px", alignItems: "center" }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{
        width: 6, height: 6, borderRadius: "50%",
        background: "rgba(84,199,248,0.5)", display: "inline-block",
        animation: `typingBounce 1.3s ${i * 0.18}s ease-in-out infinite`,
      }} />
    ))}
  </div>
);

// ─── UNMATCH MODAL ────────────────────────────────────────────────────────────

function UnmatchModal({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="cv-overlay" onClick={onCancel}>
      <div className="cv-modal" onClick={e => e.stopPropagation()}>
        <div className="cv-modal-icon cv-modal-icon--danger">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="11" stroke="#ef4444" strokeWidth="1.6"/>
            <path d="M13 7v7M13 17.5v.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="cv-modal-title">¿Deshacer match?</h2>
        <p className="cv-modal-body">
          Si eliminás el match con <strong>{name}</strong>, los dos
          dejarán de verse en sus chats y no podrán volver a escribirse.
          Esta acción no se puede deshacer.
        </p>
        <div className="cv-modal-actions">
          <button className="cv-mbtn cv-mbtn--ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button className="cv-mbtn cv-mbtn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Eliminando…" : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── REPORT MODAL ─────────────────────────────────────────────────────────────

function ReportModal({ name, otherId, myId, onClose }: {
  name: string; otherId: string; myId: string; onClose: () => void;
}) {
  const [reason,  setReason]  = useState("");
  const [detail,  setDetail]  = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await supabase.from("reports").insert({
        reporter_id: myId,
        reported_id: otherId,
        reason,
        detail:      detail.trim() || null,
        created_at:  new Date().toISOString(),
      });
    } catch {
      // silently succeed — don't tip off bad actors
    } finally {
      setSending(false);
      setSent(true);
    }
  };

  return (
    <div className="cv-overlay" onClick={!sent ? onClose : undefined}>
      <div className="cv-modal cv-modal--wide" onClick={e => e.stopPropagation()}>
        {sent ? (
          <>
            <div className="cv-modal-icon cv-modal-icon--success">
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <circle cx="13" cy="13" r="11" stroke="#22c55e" strokeWidth="1.6"/>
                <path d="M8 13l3.5 3.5L18 9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="cv-modal-title">Reporte enviado</h2>
            <p className="cv-modal-body">
              Gracias por ayudarnos a mantener la comunidad segura.
              Revisaremos el reporte con atención.
            </p>
            <button className="cv-mbtn cv-mbtn--primary" style={{ width: "100%" }} onClick={onClose}>
              Cerrar
            </button>
          </>
        ) : (
          <>
            <div className="cv-modal-icon cv-modal-icon--warn" style={{ alignSelf: "center" }}>
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M13 3L23.5 21H2.5L13 3z" stroke="#f59e0b" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M13 10v5M13 18v.5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="cv-modal-title">Reportar a {name}</h2>
            <p className="cv-modal-body">
              Tu identidad no será revelada. Elegí el motivo principal.
            </p>

            <div className="cv-report-reasons">
              {REPORT_REASONS.map(r => (
                <button
                  key={r.id}
                  className={`cv-reason-chip ${reason === r.id ? "active" : ""}`}
                  onClick={() => setReason(r.id)}
                >
                  <span>{r.emoji}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>

            <textarea
              className="cv-report-ta"
              placeholder="Detalles adicionales (opcional)…"
              value={detail}
              onChange={e => setDetail(e.target.value.slice(0, 300))}
              rows={3}
            />
            <div style={{ fontSize: 10, color: "rgba(165,210,240,0.3)", textAlign: "right", marginTop: -8 }}>
              {detail.length}/300
            </div>

            <div className="cv-modal-actions">
              <button className="cv-mbtn cv-mbtn--ghost" onClick={onClose} disabled={sending}>
                Cancelar
              </button>
              <button className="cv-mbtn cv-mbtn--warn" onClick={submit} disabled={!reason || sending}>
                {sending ? "Enviando…" : "Enviar reporte"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PROFILE PANEL ────────────────────────────────────────────────────────────

function ProfilePanel({ user, msgCount, matchDate, onUnmatch, onReport }: {
  user: Profile; msgCount: number; matchDate?: string;
  onUnmatch: () => void; onReport: () => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = user.photos?.length ? user.photos : user.avatar_url ? [user.avatar_url] : [];

  return (
    <aside className="cv-profile">
      {/* Photo hero */}
      <div className="cv-profile-photo">
        {photos.length > 0 ? (
          <>
            <img src={photos[photoIdx]} alt={user.name} className="cv-phimg" />
            <div className="cv-phgrad" />
            {photos.length > 1 && (
              <>
                <div className="cv-ph-dots">
                  {photos.map((_, i) => (
                    <button key={i} className={`cv-ph-dot ${i === photoIdx ? "on" : ""}`}
                      onClick={() => setPhotoIdx(i)} />
                  ))}
                </div>
                <button className="cv-phnav cv-phnav--l"
                  onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M8.5 2L4 6.5l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button className="cv-phnav cv-phnav--r"
                  onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M4.5 2L9 6.5 4.5 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}
          </>
        ) : (
          <div className="cv-phplaceholder">
            <span style={{ fontSize: 48, opacity: 0.12 }}>👤</span>
          </div>
        )}
        <div className="cv-phoverlay">
          <div className="cv-phname">{user.name}{user.age ? `, ${user.age}` : ""}</div>
          <div className="cv-phstatus">
            <span className={`cv-sdot ${user.is_online ? "on" : ""}`} />
            <span>{user.is_online ? "En línea" : "Desconectado"}</span>
          </div>
        </div>
      </div>

      {/* Scrollable info */}
      <div className="cv-pbody">

        {/* Quick stats */}
        <div className="cv-pstats-row">
          <div className="cv-pstat">
            <span className="cv-pstat-n">{msgCount}</span>
            <span className="cv-pstat-k">mensajes</span>
          </div>
          {photos.length > 1 && (
            <div className="cv-pstat">
              <span className="cv-pstat-n">{photos.length}</span>
              <span className="cv-pstat-k">fotos</span>
            </div>
          )}
          {matchDate && (
            <div className="cv-pstat">
              <span className="cv-pstat-n" style={{ fontSize: 11 }}>{fmtDate(matchDate)}</span>
              <span className="cv-pstat-k">match</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="cv-psec">
            <div className="cv-psec-lbl">Sobre mí</div>
            <p className="cv-pbio">&ldquo;{user.bio}&rdquo;</p>
          </div>
        )}

        {/* Meta info */}
        <div className="cv-pmeta">
          {user.gender     && <div className="cv-pmchip"><span>⚧</span><span>{user.gender}</span></div>}
          {user.location   && <div className="cv-pmchip"><span>📍</span><span>{user.location}</span></div>}
          {user.occupation && <div className="cv-pmchip"><span>💼</span><span>{user.occupation}</span></div>}
          {user.languages?.map(l => (
            <div key={l} className="cv-pmchip"><span>🗣</span><span>{l}</span></div>
          ))}
        </div>

        {/* Qué busca */}
        {!!user.looking_for?.length && (
          <div className="cv-psec">
            <div className="cv-psec-lbl">Busca</div>
            <div className="cv-plf">
              {user.looking_for.map(id => {
                const lf = LOOKING_FOR_MAP[id];
                return lf ? (
                  <div key={id} className="cv-plf-chip">
                    <span>{lf.emoji}</span>
                    <span>{lf.label}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Intereses */}
        {!!user.interests?.length && (
          <div className="cv-psec">
            <div className="cv-psec-lbl">Intereses</div>
            <div className="cv-pints">
              {user.interests.map(i => <span key={i} className="cv-pint">{i}</span>)}
            </div>
          </div>
        )}

        {/* Match badge */}
        <div className="cv-mbadge">
          <span>💙</span>
          <span>Match mutuo</span>
        </div>

        {/* Actions */}
        <div className="cv-pbtns">
          <button className="cv-paction cv-paction--unmatch" onClick={onUnmatch}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
            Deshacer match
          </button>
          <button className="cv-paction cv-paction--report" onClick={onReport}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5L12 11.5H1L6.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M6.5 5.5v3M6.5 10v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Reportar perfil
          </button>
        </div>

      </div>
    </aside>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function ConversationPage() {
  const router  = useRouter();
  const params  = useParams();
  const otherId = params.userId as string;

  const [myId,      setMyId]      = useState("");
  const [myProfile, setMyProfile] = useState<{ avatar_url: string | null; name: string } | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [text,      setText]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [hasMore,   setHasMore]   = useState(true);
  const [page,      setPage]      = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isTyping]  = useState(false);
  const [modal,     setModal]     = useState<ModalKind>(null);
  const [unmatchLoading, setUnmatchLoading] = useState(false);
  const [matchId,   setMatchId]   = useState<string | null>(null);
  const [matchDate, setMatchDate] = useState<string | undefined>();
  // mobile: "chat" | "profile"
  const [mobileView, setMobileView] = useState<"chat" | "profile">("chat");

  const bottomRef   = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const myIdRef     = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingContents = useRef<Set<string>>(new Set());

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior }), 30);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) { router.push("/"); return; }
      setMyId(me.user.id);
      myIdRef.current = me.user.id;

      const { data: mePro } = await supabase
        .from("profiles").select("name, avatar_url").eq("id", me.user.id).single();
      setMyProfile(mePro);

      const { data: profile } = await supabase
        .from("profiles")
        .select("name,age,avatar_url,is_online,bio,gender,location,occupation,languages,interests,looking_for,photos")
        .eq("id", otherId).single();
      setOtherUser(profile);

      const { data: matchRow } = await supabase
        .from("matches")
        .select("id,created_at")
        .or(`and(user1.eq.${me.user.id},user2.eq.${otherId}),and(user1.eq.${otherId},user2.eq.${me.user.id})`)
        .maybeSingle();
      if (matchRow) { setMatchId(matchRow.id); setMatchDate(matchRow.created_at); }

      const msgs = await chatService.loadMessages(me.user.id, otherId, 0);
      setMessages(msgs);
      setHasMore(msgs.length === 30);
      scrollToBottom("auto");

      const channel = chatService.listenMessages(me.user.id, otherId, (msg) => {
        setMessages((prev) => {
          if (prev.find(m => m.id === msg.id)) return prev;
          if (msg.from_user === myIdRef.current) {
            if (pendingContents.current.has(msg.content)) {
              pendingContents.current.delete(msg.content);
              const idx = prev.findIndex(m => m.id.startsWith("temp-") && m.content === msg.content);
              if (idx !== -1) { const n = [...prev]; n[idx] = msg; return n; }
            }
            return [...prev, msg];
          }
          setTimeout(() => scrollToBottom(), 30);
          return [...prev, msg];
        });
      });

      await supabase.from("profiles").update({ is_online: true }).eq("id", me.user.id);
      return () => {
        supabase.removeChannel(channel);
        supabase.from("profiles").update({ is_online: false }).eq("id", me.user.id);
      };
    };
    let cleanup: (() => void) | undefined;
    load().then(fn => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [otherId]);

  useEffect(() => {
    if (!otherId) return;
    const iv = setInterval(async () => {
      const { data } = await supabase.from("profiles").select("is_online").eq("id", otherId).single();
      if (data) setOtherUser(p => p ? { ...p, is_online: data.is_online } : p);
    }, 30_000);
    return () => clearInterval(iv);
  }, [otherId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !myIdRef.current) return;
    setLoadingMore(true);
    const el = scrollRef.current;
    const prevH = el?.scrollHeight ?? 0;
    const np = page + 1;
    const older = await chatService.loadMessages(myIdRef.current, otherId, np);
    if (older.length < 30) setHasMore(false);
    if (older.length > 0) {
      setMessages(prev => [...older, ...prev]);
      setPage(np);
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevH; });
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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);
    pendingContents.current.add(content);
    const tempId = "temp-" + Date.now();
    setMessages(prev => [...prev, { id: tempId, from_user: myId, to_user: otherId, content, created_at: new Date().toISOString() }]);
    scrollToBottom();
    try {
      await chatService.sendMessage(myId, otherId, content);
    } catch {
      pendingContents.current.delete(content);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleUnmatch = async () => {
    if (!matchId) return;
    setUnmatchLoading(true);
    try {
      await supabase.from("matches").delete().eq("id", matchId);
      await supabase.from("messages").delete()
        .or(`and(from_user.eq.${myId},to_user.eq.${otherId}),and(from_user.eq.${otherId},to_user.eq.${myId})`);
      router.push("/chat");
    } catch { setUnmatchLoading(false); }
  };

  const grouped      = groupByDate(messages);
  const realMsgCount = messages.filter(m => !m.id.startsWith("temp-")).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

        :root{
          --bg:#060f1e; --bg2:#08141f; --bg3:#0c1a2b;
          --sky:#54c7f8; --sky2:#3b9eda; --sky3:#1a6fa8;
          --txt:#e8f4ff; --mut:rgba(165,210,240,.48); --mut2:rgba(120,175,220,.28);
          --bdr:rgba(84,199,248,.08); --bdr2:rgba(84,199,248,.2);
          --grn:#22c55e; --red:#ef4444; --amb:#f59e0b;
        }

        @keyframes typingBounce{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-5px);opacity:1}}
        @keyframes msgIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes overlayIn{from{opacity:0}to{opacity:1}}
        @keyframes modalUp{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:none}}
        @keyframes profileIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
        @keyframes onlinePulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.55)}50%{box-shadow:0 0 0 5px rgba(34,197,94,0)}}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* ROOT */
        .cv{position:fixed;inset:0;display:flex;flex-direction:column;background:var(--bg);
          font-family:'DM Sans',sans-serif;color:var(--txt);overflow:hidden;-webkit-font-smoothing:antialiased}
        .cv-mesh{position:fixed;inset:0;pointer-events:none;z-index:0;
          background:radial-gradient(ellipse 70% 45% at 0 0,rgba(84,199,248,.07) 0%,transparent 55%),
                    radial-gradient(ellipse 55% 40% at 100% 100%,rgba(59,158,218,.06) 0%,transparent 50%)}

        /* HEADER */
        .cv-hdr{position:relative;z-index:100;flex-shrink:0;background:rgba(6,15,30,.97);
          backdrop-filter:blur(22px) saturate(1.5);border-bottom:1px solid var(--bdr);
          padding:10px 14px;display:flex;align-items:center;gap:10px;min-height:62px}
        .cv-hdr::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,rgba(84,199,248,.22),transparent)}

        .cv-ibtn{width:36px;height:36px;border-radius:11px;flex-shrink:0;
          background:var(--bdr);border:1px solid var(--bdr2);
          display:flex;align-items:center;justify-content:center;
          color:var(--mut);cursor:pointer;
          transition:background .18s,border-color .18s,color .18s,transform .14s}
        .cv-ibtn:hover{background:rgba(84,199,248,.1);border-color:rgba(84,199,248,.32);color:var(--sky);transform:scale(1.07)}

        .cv-hdr-info{flex:1;display:flex;align-items:center;gap:11px;min-width:0}
        .cv-hdr-name{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;
          letter-spacing:-.3px;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cv-hdr-sub{display:flex;align-items:center;gap:5px;margin-top:2px}
        .cv-hpill{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--mut);font-weight:500}
        .cv-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;transition:all .3s}
        .cv-dot.on{background:var(--grn);animation:onlinePulse 2.4s infinite}
        .cv-dot.off{background:rgba(255,255,255,.18)}

        /* mobile toggle */
        .cv-mtabs{display:none;gap:4px;flex-shrink:0;margin-left:auto}
        .cv-mtab{padding:5px 11px;border-radius:100px;border:1px solid var(--bdr);
          font-family:'Syne',sans-serif;font-size:11px;font-weight:700;
          color:var(--mut);background:transparent;cursor:pointer;transition:all .18s}
        .cv-mtab.on{background:rgba(84,199,248,.12);border-color:var(--bdr2);color:var(--sky)}

        /* BODY */
        .cv-body{flex:1;display:flex;min-height:0;position:relative;z-index:1;overflow:hidden}

        /* ═══ LEFT PROFILE PANEL ═══ */
        .cv-profile{width:285px;flex-shrink:0;border-right:1px solid var(--bdr);
          display:flex;flex-direction:column;overflow:hidden;
          animation:profileIn .4s cubic-bezier(.16,1,.3,1) both}

        .cv-profile-photo{position:relative;flex-shrink:0;height:255px;
          overflow:hidden;background:var(--bg3)}
        .cv-phimg{width:100%;height:100%;object-fit:cover;
          transition:transform .5s cubic-bezier(.16,1,.3,1)}
        .cv-profile-photo:hover .cv-phimg{transform:scale(1.04)}
        .cv-phplaceholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
        .cv-phgrad{position:absolute;bottom:0;left:0;right:0;height:60%;
          background:linear-gradient(to bottom,transparent,rgba(6,15,30,.96));pointer-events:none}

        .cv-phnav{position:absolute;top:50%;transform:translateY(-50%);
          width:26px;height:26px;border-radius:50%;
          background:rgba(6,15,30,.6);border:1px solid rgba(255,255,255,.12);
          color:rgba(255,255,255,.8);cursor:pointer;display:flex;align-items:center;justify-content:center;
          transition:all .18s;backdrop-filter:blur(6px)}
        .cv-phnav:hover{background:rgba(84,199,248,.25);border-color:var(--sky);color:var(--sky)}
        .cv-phnav--l{left:8px}.cv-phnav--r{right:8px}

        .cv-ph-dots{position:absolute;bottom:50px;left:0;right:0;
          display:flex;justify-content:center;gap:4px;z-index:2}
        .cv-ph-dot{width:5px;height:5px;border-radius:50%;border:none;
          background:rgba(255,255,255,.3);cursor:pointer;transition:all .22s}
        .cv-ph-dot.on{background:var(--sky);width:14px;border-radius:3px}

        .cv-phoverlay{position:absolute;bottom:0;left:0;right:0;padding:12px 14px 11px}
        .cv-phname{font-family:'Syne',sans-serif;font-size:17px;font-weight:900;
          letter-spacing:-.4px;color:#fff;line-height:1.1;text-shadow:0 2px 10px rgba(0,0,0,.6)}
        .cv-phstatus{display:flex;align-items:center;gap:5px;margin-top:3px}
        .cv-sdot{width:7px;height:7px;border-radius:50%;
          background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.15);
          transition:all .3s;flex-shrink:0}
        .cv-sdot.on{background:var(--grn);box-shadow:0 0 8px rgba(34,197,94,.7);border-color:var(--grn)}
        .cv-phstatus span:last-child{font-size:11px;color:rgba(255,255,255,.65);font-weight:500}

        .cv-pbody{flex:1;overflow-y:auto;padding:13px 13px 20px;
          display:flex;flex-direction:column;gap:13px}
        .cv-pbody::-webkit-scrollbar{width:2px}
        .cv-pbody::-webkit-scrollbar-thumb{background:var(--bdr2);border-radius:2px}

        .cv-pstats-row{display:flex;gap:6px}
        .cv-pstat{flex:1;background:var(--bdr);border:1px solid var(--bdr2);
          border-radius:11px;padding:9px 8px;
          display:flex;flex-direction:column;align-items:center;gap:2px;transition:background .2s}
        .cv-pstat:hover{background:rgba(84,199,248,.07)}
        .cv-pstat-n{font-family:'Syne',sans-serif;font-size:15px;font-weight:900;
          color:var(--sky);letter-spacing:-.35px}
        .cv-pstat-k{font-size:9px;color:var(--mut2);letter-spacing:.8px;text-transform:uppercase;font-weight:600}

        .cv-psec{display:flex;flex-direction:column;gap:7px}
        .cv-psec-lbl{font-size:9px;font-weight:700;letter-spacing:2.2px;
          text-transform:uppercase;color:var(--sky);opacity:.55}
        .cv-pbio{font-size:12px;line-height:1.75;color:var(--mut);font-style:italic}

        .cv-pmeta{display:flex;flex-wrap:wrap;gap:5px}
        .cv-pmchip{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:100px;
          background:var(--bdr);border:1px solid var(--bdr2);font-size:11.5px;color:var(--mut);
          transition:border-color .18s,color .18s}
        .cv-pmchip:hover{border-color:rgba(84,199,248,.28);color:var(--txt)}

        .cv-plf{display:flex;flex-wrap:wrap;gap:5px}
        .cv-plf-chip{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:9px;
          background:rgba(84,199,248,.06);border:1px solid rgba(84,199,248,.2);
          font-size:11.5px;color:var(--sky);font-weight:600}

        .cv-pints{display:flex;flex-wrap:wrap;gap:5px}
        .cv-pint{padding:4px 9px;border-radius:7px;background:var(--bdr);
          border:1px solid var(--bdr2);font-size:11px;color:var(--mut);
          transition:all .18s;cursor:default}
        .cv-pint:hover{border-color:rgba(84,199,248,.25);color:var(--txt);background:rgba(84,199,248,.05)}

        .cv-mbadge{display:flex;align-items:center;justify-content:center;gap:7px;
          padding:9px 12px;background:rgba(84,199,248,.05);border:1px solid rgba(84,199,248,.14);
          border-radius:11px;font-size:11.5px;color:var(--mut);font-weight:500}

        .cv-pbtns{display:flex;flex-direction:column;gap:6px;margin-top:2px}
        .cv-paction{display:flex;align-items:center;justify-content:center;gap:7px;
          padding:9px 14px;border-radius:11px;border:1px solid;
          font-family:'Syne',sans-serif;font-size:11.5px;font-weight:700;
          cursor:pointer;transition:all .2s;letter-spacing:.3px}
        .cv-paction--unmatch{background:rgba(239,68,68,.05);border-color:rgba(239,68,68,.2);color:rgba(239,100,100,.8)}
        .cv-paction--unmatch:hover{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.38);color:var(--red)}
        .cv-paction--report{background:rgba(245,158,11,.04);border-color:rgba(245,158,11,.16);color:rgba(245,158,11,.65)}
        .cv-paction--report:hover{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.36);color:var(--amb)}

        /* ═══ CENTER CHAT ═══ */
        .cv-chat{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}

        .cv-msgs{flex:1;overflow-y:auto;padding:16px 18px 10px;
          display:flex;flex-direction:column;gap:1px;min-height:0}
        .cv-msgs::-webkit-scrollbar{width:3px}
        .cv-msgs::-webkit-scrollbar-thumb{background:var(--bdr2);border-radius:3px}

        .cv-date{align-self:center;font-size:10px;font-weight:600;letter-spacing:1px;
          text-transform:uppercase;color:var(--mut2);background:var(--bdr);
          border:1px solid var(--bdr2);border-radius:100px;padding:4px 12px;
          margin:14px 0 7px;user-select:none}

        .cv-load{align-self:center;font-size:11px;font-weight:500;color:var(--mut);
          background:var(--bdr);border:1px solid var(--bdr2);border-radius:100px;
          padding:5px 16px;cursor:pointer;margin-bottom:10px;transition:all .2s;
          display:flex;align-items:center;gap:7px}
        .cv-load:hover:not(:disabled){background:rgba(84,199,248,.08);border-color:var(--sky);color:var(--sky)}
        .cv-load:disabled{opacity:.35;cursor:default}
        .cv-spinner{width:10px;height:10px;border-radius:50%;border:1.5px solid rgba(84,199,248,.22);
          border-top-color:var(--sky);animation:spin .7s linear infinite}

        .cv-row{display:flex;align-items:flex-end;gap:7px;animation:msgIn .2s ease}
        .cv-row.mine{flex-direction:row-reverse}
        .cv-av{flex-shrink:0;margin-bottom:1px}
        .cv-av.ghost{opacity:0;pointer-events:none}

        .cv-bwrap{display:flex;flex-direction:column;max-width:min(74%,460px)}
        .cv-row.mine .cv-bwrap{align-items:flex-end}

        .cv-b{padding:10px 14px;font-size:14px;line-height:1.58;word-break:break-word}
        .cv-b.mine{background:linear-gradient(135deg,var(--sky) 0%,var(--sky2) 55%,var(--sky3) 100%);
          color:#04111f;font-weight:600;border-radius:20px 20px 5px 20px;
          box-shadow:0 4px 18px rgba(84,199,248,.2),0 1px 4px rgba(0,0,0,.25)}
        .cv-b.theirs{background:var(--bg3);border:1px solid var(--bdr2);color:var(--txt);
          border-radius:20px 20px 20px 5px;box-shadow:0 2px 8px rgba(0,0,0,.2)}
        .cv-b.mine.gm{border-top-right-radius:6px}
        .cv-b.theirs.gt{border-top-left-radius:6px}
        .cv-time{font-size:10px;color:var(--mut2);margin-top:4px;padding:0 3px;user-select:none}

        .cv-empty{flex:1;display:flex;flex-direction:column;align-items:center;
          justify-content:center;gap:12px;padding:36px;text-align:center}
        .cv-empty-av{width:78px;height:78px;border-radius:24px;background:var(--bg3);
          border:1.5px solid var(--bdr2);overflow:hidden;display:flex;align-items:center;
          justify-content:center;font-size:34px;box-shadow:0 8px 28px rgba(84,199,248,.1)}
        .cv-empty-av img{width:100%;height:100%;object-fit:cover}
        .cv-empty-h{font-family:'Syne',sans-serif;font-size:18px;font-weight:900;letter-spacing:-.4px}
        .cv-empty-p{font-size:12.5px;color:var(--mut);max-width:200px;line-height:1.65}

        .cv-typing{display:flex;align-items:flex-end;gap:7px;animation:msgIn .2s ease;margin-top:8px}
        .cv-typing-b{background:var(--bg3);border:1px solid var(--bdr);border-radius:20px 20px 20px 5px}

        /* INPUT BAR */
        .cv-bar{flex-shrink:0;padding:10px 16px 14px;background:rgba(6,15,30,.97);
          border-top:1px solid var(--bdr);display:flex;align-items:flex-end;gap:9px;
          position:relative;z-index:2}
        .cv-bar::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,rgba(84,199,248,.16),transparent)}
        .cv-field{flex:1;display:flex;align-items:flex-end;background:var(--bg3);
          border:1.5px solid var(--bdr);border-radius:20px;overflow:hidden;
          transition:border-color .2s,box-shadow .2s}
        .cv-field:focus-within{border-color:rgba(84,199,248,.28);box-shadow:0 0 0 3px rgba(84,199,248,.05)}
        .cv-ta{flex:1;background:transparent;border:none;outline:none;resize:none;
          padding:11px 14px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--txt);
          line-height:1.5;max-height:120px;min-height:44px}
        .cv-ta::placeholder{color:var(--mut2)}
        .cv-send{width:40px;height:40px;border-radius:50%;border:none;
          background:linear-gradient(135deg,var(--sky) 0%,var(--sky2) 55%,var(--sky3) 100%);
          color:#04111f;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;
          transition:transform .18s,box-shadow .18s,opacity .15s;
          box-shadow:0 4px 16px rgba(84,199,248,.28);margin-bottom:1px}
        .cv-send:hover:not(:disabled){transform:scale(1.1);box-shadow:0 6px 22px rgba(84,199,248,.5)}
        .cv-send:active:not(:disabled){transform:scale(.91)}
        .cv-send:disabled{opacity:.22;cursor:not-allowed;box-shadow:none;background:var(--bdr)}

        /* MODALS */
        .cv-overlay{position:fixed;inset:0;z-index:1000;
          background:rgba(3,8,18,.78);backdrop-filter:blur(14px) saturate(1.4);
          display:flex;align-items:center;justify-content:center;padding:20px;
          animation:overlayIn .22s ease}
        .cv-modal{background:linear-gradient(155deg,var(--bg2) 0%,var(--bg3) 100%);
          border:1px solid var(--bdr2);border-radius:22px;
          padding:26px 24px 22px;width:100%;max-width:390px;
          display:flex;flex-direction:column;align-items:center;gap:13px;text-align:center;
          box-shadow:0 28px 70px rgba(0,0,0,.6),0 0 0 1px rgba(84,199,248,.05) inset;
          animation:modalUp .28s cubic-bezier(.16,1,.3,1) both}
        .cv-modal--wide{max-width:430px;align-items:stretch;text-align:left}

        .cv-modal-icon{width:54px;height:54px;border-radius:17px;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:center}
        .cv-modal-icon--danger{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25)}
        .cv-modal-icon--warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25)}
        .cv-modal-icon--success{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25)}

        .cv-modal-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:900;
          letter-spacing:-.4px;color:var(--txt);align-self:center}
        .cv-modal-body{font-size:13px;color:var(--mut);line-height:1.72;
          max-width:300px;align-self:center}
        .cv-modal-body strong{color:var(--txt);font-weight:600}

        .cv-modal-actions{display:flex;gap:8px;width:100%;margin-top:2px}
        .cv-mbtn{flex:1;padding:11px 14px;border-radius:12px;
          font-family:'Syne',sans-serif;font-size:12.5px;font-weight:700;
          cursor:pointer;transition:all .18s;letter-spacing:.2px;border:1px solid}
        .cv-mbtn:disabled{opacity:.4;cursor:not-allowed}
        .cv-mbtn--ghost{background:var(--bdr);border-color:var(--bdr2);color:var(--mut)}
        .cv-mbtn--ghost:hover:not(:disabled){background:rgba(84,199,248,.08);color:var(--txt)}
        .cv-mbtn--danger{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.35);color:var(--red)}
        .cv-mbtn--danger:hover:not(:disabled){background:rgba(239,68,68,.2)}
        .cv-mbtn--warn{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.32);color:var(--amb)}
        .cv-mbtn--warn:hover:not(:disabled){background:rgba(245,158,11,.18)}
        .cv-mbtn--primary{background:linear-gradient(135deg,var(--sky),var(--sky2));
          border-color:transparent;color:#04111f;font-weight:800}
        .cv-mbtn--primary:hover{box-shadow:0 4px 14px rgba(84,199,248,.35)}

        .cv-report-reasons{display:flex;flex-wrap:wrap;gap:6px}
        .cv-reason-chip{display:flex;align-items:center;gap:6px;padding:7px 11px;
          border-radius:10px;background:var(--bdr);border:1.5px solid var(--bdr2);
          font-size:12px;color:var(--mut);cursor:pointer;transition:all .18s}
        .cv-reason-chip:hover{border-color:rgba(245,158,11,.3);color:var(--txt)}
        .cv-reason-chip.active{background:rgba(245,158,11,.09);border-color:rgba(245,158,11,.42);color:var(--amb)}

        .cv-report-ta{width:100%;background:var(--bdr);border:1.5px solid var(--bdr2);
          border-radius:12px;padding:10px 12px;
          font-family:'DM Sans',sans-serif;font-size:13.5px;color:var(--txt);
          outline:none;resize:none;line-height:1.55;transition:border-color .2s,box-shadow .2s}
        .cv-report-ta::placeholder{color:var(--mut2)}
        .cv-report-ta:focus{border-color:rgba(245,158,11,.32);box-shadow:0 0 0 3px rgba(245,158,11,.06)}

        /* MOBILE */
        @media(max-width:860px){
          .cv-profile{display:none}
          .cv-mtabs{display:flex}
          .cv-profile.mob-show{
            display:flex;position:fixed;inset:62px 0 0 0;z-index:50;
            width:100%;border-right:none;
            animation:profileIn .3s ease
          }
        }
        @media(max-width:560px){
          .cv-msgs{padding:12px 10px 8px}
          .cv-bar{padding:8px 10px 12px}
        }
      `}</style>

      <div className="cv">
        <div className="cv-mesh" />

        {/* HEADER */}
        <header className="cv-hdr">
          <button className="cv-ibtn" onClick={() => router.push("/chat")}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M10 2.5L5 7.5l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="cv-hdr-info">
            <Avatar url={otherUser?.avatar_url ?? null} name={otherUser?.name ?? ""} size={40} radius={13} online={otherUser?.is_online} />
            <div>
              <div className="cv-hdr-name">{otherUser ? `${otherUser.name}, ${otherUser.age}` : "···"}</div>
              <div className="cv-hdr-sub">
                <div className="cv-hpill">
                  <span className={`cv-dot ${otherUser?.is_online ? "on" : "off"}`} />
                  <span>{otherUser?.is_online ? "En línea ahora" : "Desconectado"}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Mobile tabs */}
          <div className="cv-mtabs">
            <button className={`cv-mtab ${mobileView === "chat" ? "on" : ""}`} onClick={() => setMobileView("chat")}>Chat</button>
            <button className={`cv-mtab ${mobileView === "profile" ? "on" : ""}`} onClick={() => setMobileView("profile")}>Perfil</button>
          </div>
        </header>

        {/* BODY */}
        <div className="cv-body">

          {/* LEFT: PROFILE */}
          {otherUser && (
            <div className={`cv-profile ${mobileView === "profile" ? "mob-show" : ""}`}>
              <ProfilePanel
                user={otherUser}
                msgCount={realMsgCount}
                matchDate={matchDate}
                onUnmatch={() => setModal("unmatch")}
                onReport={() => setModal("report")}
              />
            </div>
          )}

          {/* CENTER: CHAT */}
          <div className="cv-chat" style={{ display: mobileView === "profile" ? "none" : "flex" }}>
            <div className="cv-msgs" ref={scrollRef} onScroll={handleScroll}>
              {hasMore && (
                <button className="cv-load" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <><span className="cv-spinner" />Cargando…</> : "Ver anteriores"}
                </button>
              )}

              {messages.length === 0 ? (
                <div className="cv-empty">
                  <div className="cv-empty-av">
                    {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" /> : "👋"}
                  </div>
                  <div className="cv-empty-h">{otherUser ? `¡Hola, ${otherUser.name}!` : "···"}</div>
                  <div className="cv-empty-p">Son un match. ¡Rompé el hielo y escribí algo!</div>
                </div>
              ) : grouped.map(({ label, msgs }) => (
                <div key={label}>
                  <div className="cv-date">{label}</div>
                  {msgs.map((msg, i) => {
                    const isMine    = msg.from_user === myId;
                    const prev      = msgs[i - 1];
                    const next      = msgs[i + 1];
                    const isGrouped = prev && prev.from_user === msg.from_user;
                    const isLast    = !next || next.from_user !== msg.from_user;
                    const isTemp    = msg.id.startsWith("temp-");
                    return (
                      <div key={msg.id} className={`cv-row ${isMine ? "mine" : ""}`} style={{ marginTop: isGrouped ? 2 : 10 }}>
                        <div className={`cv-av ${!isLast ? "ghost" : ""}`}>
                          <Avatar
                            url={isMine ? (myProfile?.avatar_url ?? null) : (otherUser?.avatar_url ?? null)}
                            name={isMine ? (myProfile?.name ?? "Yo") : (otherUser?.name ?? "")}
                            size={28} radius={9}
                          />
                        </div>
                        <div className="cv-bwrap">
                          <div className={`cv-b ${isMine ? "mine" : "theirs"} ${isGrouped ? (isMine ? "gm" : "gt") : ""}`}
                            style={{ opacity: isTemp ? 0.6 : 1, transition: "opacity .2s" }}>
                            {msg.content}
                          </div>
                          {isLast && <div className="cv-time">{fmt(msg.created_at)}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {isTyping && (
                <div className="cv-typing">
                  <div className="cv-av">
                    <Avatar url={otherUser?.avatar_url ?? null} name={otherUser?.name ?? ""} size={28} radius={9} />
                  </div>
                  <div className="cv-typing-b"><TypingDots /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="cv-bar">
              <div className="cv-field">
                <textarea
                  ref={textareaRef}
                  className="cv-ta"
                  placeholder={`Escribile a ${otherUser?.name ?? ""}…`}
                  rows={1}
                  value={text}
                  onChange={e => { setText(e.target.value); autoResize(); }}
                  onKeyDown={handleKey}
                />
              </div>
              <button className="cv-send" onClick={sendMessage} disabled={!text.trim() || sending}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M1.5 7.5h12M8 2l6 5.5L8 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* MODALS */}
      {modal === "unmatch" && otherUser && (
        <UnmatchModal
          name={otherUser.name}
          onConfirm={handleUnmatch}
          onCancel={() => setModal(null)}
          loading={unmatchLoading}
        />
      )}
      {modal === "report" && otherUser && (
        <ReportModal
          name={otherUser.name}
          otherId={otherId}
          myId={myId}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}