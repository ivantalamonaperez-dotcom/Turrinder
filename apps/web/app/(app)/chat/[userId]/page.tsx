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

type SidebarMatch = {
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

function formatTimeShort(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

// ─── MARK AS READ ─────────────────────────────────────────────────────────────

async function markMessagesAsRead(fromUser: string, toUser: string) {
  try {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("from_user", fromUser)
      .eq("to_user", toUser)
      .eq("read", false);
  } catch (e) {
    console.warn("markMessagesAsRead error:", e);
  }
}

// ─── FETCH SIDEBAR MATCHES ────────────────────────────────────────────────────

async function fetchSidebarMatches(myId: string, currentOtherId: string): Promise<SidebarMatch[]> {
  const { data: matchRows } = await supabase
    .from("matches")
    .select("id, user1, user2")
    .or(`user1.eq.${myId},user2.eq.${myId}`)
    .order("created_at", { ascending: false });

  if (!matchRows?.length) return [];

  const enriched: SidebarMatch[] = await Promise.all(
    matchRows
      .filter(m => {
        const otherId = m.user1 === myId ? m.user2 : m.user1;
        return otherId !== currentOtherId;
      })
      .map(async (m) => {
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
          last_message: lastMsg?.content,
          last_message_time: lastMsg?.created_at,
          unread_count,
        };
      })
  );

  return enriched.sort((a, b) => {
    if (b.unread_count !== a.unread_count) return b.unread_count - a.unread_count;
    return new Date(b.last_message_time ?? 0).getTime() -
           new Date(a.last_message_time ?? 0).getTime();
  });
}

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

// ─── MINI SIDEBAR ─────────────────────────────────────────────────────────────

function MiniSidebar({ matches, currentId, onNavigate }: {
  matches: SidebarMatch[];
  currentId: string;
  onNavigate: (id: string) => void;
}) {
  const totalUnread = matches.reduce((acc, m) => acc + m.unread_count, 0);

  return (
    <aside className="cv-minisidebar">
      <div className="cv-ms-header">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 7h12M7 1l6 6-6 6" stroke="rgba(84,199,248,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Chats</span>
        {totalUnread > 0 && (
          <span className="cv-ms-total-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>
        )}
      </div>

      <div className="cv-ms-list">
        {matches.length === 0 && (
          <div className="cv-ms-empty">Sin otras conexiones</div>
        )}
        {matches.map((m) => {
          const hasUnread = m.unread_count > 0;
          return (
            <button
              key={m.id}
              className={`cv-ms-item ${hasUnread ? "has-unread" : ""}`}
              onClick={() => onNavigate(m.other_user.id)}
              title={`${m.other_user.name}${m.other_user.age ? `, ${m.other_user.age}` : ""}`}
            >
              <div className="cv-ms-avatar-wrap">
                <Avatar
                  url={m.other_user.avatar_url}
                  name={m.other_user.name}
                  size={38}
                  radius={12}
                  online={m.other_user.is_online}
                />
                {hasUnread && (
                  <span className="cv-ms-badge">
                    {m.unread_count > 9 ? "9+" : m.unread_count}
                  </span>
                )}
              </div>
              <div className="cv-ms-info">
                <div className="cv-ms-name">
                  {m.other_user.name}{m.other_user.age ? `, ${m.other_user.age}` : ""}
                </div>
                {m.last_message && (
                  <div className={`cv-ms-preview ${hasUnread ? "unread" : ""}`}>
                    {m.last_message}
                  </div>
                )}
              </div>
              {m.last_message_time && (
                <div className="cv-ms-time">{formatTimeShort(m.last_message_time)}</div>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ─── UNMATCH MODAL ────────────────────────────────────────────────────────────

function UnmatchModal({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="cv-overlay" onClick={onCancel}>
      <div className="cv-modal" onClick={e => e.stopPropagation()}>
        <div className="cv-modal-icon cv-modal-icon--danger">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="12" stroke="#ef4444" strokeWidth="1.6"/>
            <path d="M9 9l10 10M19 9L9 19" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="cv-modal-title">¿Sacar la conexión?</h2>
        <p className="cv-modal-body">
          Si eliminás la conexión con <strong>{name}</strong>, los dos
          dejarán de verse en sus chats y no podrán volver a escribirse.
          Esta acción no se puede deshacer.
        </p>
        <div className="cv-modal-actions">
          <button className="cv-mbtn cv-mbtn--ghost" onClick={onCancel} disabled={loading}>Cancelar</button>
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
    } catch { /* silently succeed */ }
    finally { setSending(false); setSent(true); }
  };

  return (
    <div className="cv-overlay" onClick={!sent ? onClose : undefined}>
      <div className="cv-modal cv-modal--wide" onClick={e => e.stopPropagation()}>
        {sent ? (
          <>
            <div className="cv-modal-icon cv-modal-icon--success">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="12" stroke="#22c55e" strokeWidth="1.6"/>
                <path d="M8 14l4 4L20 10" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="cv-modal-title" style={{ textAlign: "center" }}>Reporte enviado</h2>
            <p className="cv-modal-body" style={{ textAlign: "center" }}>
              Gracias por ayudarnos a mantener la comunidad segura.
            </p>
            <button className="cv-mbtn cv-mbtn--primary" style={{ width: "100%" }} onClick={onClose}>Cerrar</button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="cv-modal-icon cv-modal-icon--warn" style={{ flexShrink: 0 }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 3L25 22H3L14 3z" stroke="#f59e0b" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M14 11v5M14 19v.6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h2 className="cv-modal-title" style={{ marginBottom: 2 }}>Reportar a {name}</h2>
                <p style={{ fontSize: 12, color: "rgba(165,210,240,0.45)" }}>Tu identidad no será revelada</p>
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(84,199,248,0.08)", margin: "4px 0" }} />
            <div>
              <p style={{ fontSize: 12, color: "rgba(165,210,240,0.5)", marginBottom: 10, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                Motivo principal
              </p>
              <div className="cv-report-reasons">
                {REPORT_REASONS.map(r => (
                  <button key={r.id} className={`cv-reason-chip ${reason === r.id ? "active" : ""}`} onClick={() => setReason(r.id)}>
                    <span style={{ fontSize: 16 }}>{r.emoji}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "rgba(165,210,240,0.5)", marginBottom: 8, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                Detalles adicionales
              </p>
              <textarea className="cv-report-ta" placeholder="Describí qué pasó (opcional)…" value={detail} onChange={e => setDetail(e.target.value.slice(0, 300))} rows={3} />
              <div style={{ fontSize: 10, color: "rgba(165,210,240,0.25)", textAlign: "right", marginTop: 4 }}>{detail.length}/300</div>
            </div>
            <div className="cv-modal-actions">
              <button className="cv-mbtn cv-mbtn--ghost" onClick={onClose} disabled={sending}>Cancelar</button>
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

function ProfilePanel({ user, msgCount, matchDate, onUnmatch, onReport, mobVisible }: {
  user: Profile; msgCount: number; matchDate?: string;
  onUnmatch: () => void; onReport: () => void; mobVisible?: boolean;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"about" | "interests" | "fotos">("about");
  const photos = user.photos?.length ? user.photos : user.avatar_url ? [user.avatar_url] : [];

  return (
    <aside className={`cv-profile-panel${mobVisible ? " mob-visible" : ""}`}>
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
                    <button key={i} className={`cv-ph-dot ${i === photoIdx ? "on" : ""}`} onClick={() => setPhotoIdx(i)} />
                  ))}
                </div>
                <button className="cv-phnav cv-phnav--l" onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4.5 7 9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button className="cv-phnav cv-phnav--r" onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2L9.5 7 5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </>
            )}
          </>
        ) : (
          <div className="cv-phplaceholder"><span style={{ fontSize: 56, opacity: 0.1 }}>👤</span></div>
        )}
        <div className="cv-phoverlay">
          <div className="cv-phname">{user.name}{user.age ? `, ${user.age}` : ""}</div>
          <div className="cv-phrow">
            {user.location && (
              <div className="cv-phloc">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1C3.34 1 2 2.34 2 4c0 2.25 3 5 3 5s3-2.75 3-5c0-1.66-1.34-3-3-3z" fill="currentColor" opacity=".7"/>
                  <circle cx="5" cy="4" r="1.2" fill="white"/>
                </svg>
                {user.location}
              </div>
            )}
            <div className="cv-phstatus">
              <span className={`cv-sdot ${user.is_online ? "on" : ""}`} />
              <span>{user.is_online ? "En línea" : "Desconectado"}</span>
            </div>
          </div>
        </div>
        {photos.length > 1 && <div className="cv-photocnt">{photoIdx + 1}/{photos.length}</div>}
      </div>

      {/* Quick stats */}
      <div className="cv-pstats-row">
        <div className="cv-pstat"><span className="cv-pstat-n">{msgCount}</span><span className="cv-pstat-k">mensajes</span></div>
        {photos.length > 0 && <div className="cv-pstat"><span className="cv-pstat-n">{photos.length}</span><span className="cv-pstat-k">fotos</span></div>}
        {user.interests?.length ? <div className="cv-pstat"><span className="cv-pstat-n">{user.interests.length}</span><span className="cv-pstat-k">intereses</span></div> : null}
        {matchDate && <div className="cv-pstat"><span className="cv-pstat-n" style={{ fontSize: 10 }}>{fmtDate(matchDate)}</span><span className="cv-pstat-k">match</span></div>}
      </div>

      {/* Inner tabs */}
      <div className="cv-ptabs">
        {(["about", "fotos", "interests"] as const).map(tab => (
          <button key={tab} className={`cv-ptab ${activeTab === tab ? "on" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab === "about" ? "Sobre mí" : tab === "fotos" ? "Fotos" : "Intereses"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="cv-pbody">
        {activeTab === "about" && (
          <div className="cv-tab-content">
            {user.bio
              ? <div className="cv-psec"><div className="cv-psec-lbl">Sobre mí</div><p className="cv-pbio">"{user.bio}"</p></div>
              : <div className="cv-pempty">Sin bio aún</div>}
            <div className="cv-psec">
              <div className="cv-psec-lbl">Info</div>
              <div className="cv-pmeta">
                {user.gender     && <div className="cv-pmchip"><span>⚧</span><span>{user.gender}</span></div>}
                {user.location   && <div className="cv-pmchip"><span>📍</span><span>{user.location}</span></div>}
                {user.occupation && <div className="cv-pmchip"><span>💼</span><span>{user.occupation}</span></div>}
                {user.languages?.map(l => <div key={l} className="cv-pmchip"><span>🗣</span><span>{l}</span></div>)}
                {!user.gender && !user.location && !user.occupation && !user.languages?.length && <div className="cv-pempty">Sin información adicional</div>}
              </div>
            </div>
            {!!user.looking_for?.length && (
              <div className="cv-psec">
                <div className="cv-psec-lbl">Busca</div>
                <div className="cv-plf">
                  {user.looking_for.map(id => { const lf = LOOKING_FOR_MAP[id]; return lf ? <div key={id} className="cv-plf-chip"><span>{lf.emoji}</span><span>{lf.label}</span></div> : null; })}
                </div>
              </div>
            )}
            <div className="cv-mbadge"><span>💙</span><span>Conexión mutua</span></div>
          </div>
        )}

        {activeTab === "fotos" && (
          <div className="cv-tab-content">
            {photos.length > 0 ? (
              <>
                <div className="cv-psec-lbl" style={{ marginBottom: 10 }}>{photos.length} foto{photos.length !== 1 ? "s" : ""}</div>
                <div className="cv-photos-grid">
                  {photos.map((url, i) => (
                    <div key={i} className={`cv-photo-thumb ${i === photoIdx ? "active" : ""}`} onClick={() => { setPhotoIdx(i); setActiveTab("about"); }}>
                      <img src={url} alt={`Foto ${i + 1}`} />
                      {i === 0 && <div className="cv-photo-main-lbl">Principal</div>}
                    </div>
                  ))}
                </div>
              </>
            ) : <div className="cv-pempty">Sin fotos cargadas</div>}
          </div>
        )}

        {activeTab === "interests" && (
          <div className="cv-tab-content">
            {user.interests?.length
              ? <div className="cv-psec"><div className="cv-psec-lbl">{user.interests.length} intereses</div><div className="cv-pints">{user.interests.map(i => <span key={i} className="cv-pint">{i}</span>)}</div></div>
              : <div className="cv-pempty">Sin intereses cargados</div>}
            {!!user.looking_for?.length && (
              <div className="cv-psec" style={{ marginTop: 16 }}>
                <div className="cv-psec-lbl">Busca</div>
                <div className="cv-plf">
                  {user.looking_for.map(id => { const lf = LOOKING_FOR_MAP[id]; return lf ? <div key={id} className="cv-plf-chip"><span>{lf.emoji}</span><span>{lf.label}</span></div> : null; })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="cv-pbtns">
          <button className="cv-paction cv-paction--unmatch" onClick={onUnmatch}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
            Sacar conexión
          </button>
          <button className="cv-paction cv-paction--report" onClick={onReport}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5L12 11.5H1L6.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M6.5 5.5v3M6.5 10v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Reportar
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
  const [mobileView, setMobileView] = useState<"chat" | "profile">("chat");

  // Mini sidebar
  const [sidebarMatches, setSidebarMatches] = useState<SidebarMatch[]>([]);

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

  const refreshSidebar = useCallback(async () => {
    if (!myIdRef.current) return;
    const data = await fetchSidebarMatches(myIdRef.current, otherId);
    setSidebarMatches(data);
  }, [otherId]);

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

      await markMessagesAsRead(otherId, me.user.id);

      const msgs = await chatService.loadMessages(me.user.id, otherId, 0);
      setMessages(msgs);
      setHasMore(msgs.length === 30);
      scrollToBottom("auto");

      const sidebarData = await fetchSidebarMatches(me.user.id, otherId);
      setSidebarMatches(sidebarData);

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
          markMessagesAsRead(otherId, myIdRef.current);
          setTimeout(() => scrollToBottom(), 30);
          return [...prev, msg];
        });
      });

      const sidebarChannel = supabase
        .channel("conv-sidebar-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload) => {
            const row = (payload.new ?? payload.old) as { from_user?: string; to_user?: string } | null;
            if (
              row?.to_user === myIdRef.current &&
              row?.from_user !== otherId
            ) {
              refreshSidebar();
            }
          }
        )
        .subscribe();

      await supabase.from("profiles").update({ is_online: true }).eq("id", me.user.id);
      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(sidebarChannel);
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

  const navigateToChat = (userId: string) => {
    router.push(`/chat/${userId}`);
  };

  const grouped      = groupByDate(messages);
  const realMsgCount = messages.filter(m => !m.id.startsWith("temp-")).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

        :root{
          --bg:#060f1e; --bg2:#08141f; --bg3:#0c1a2b;
          --sky:#54c7f8; --sky2:#3b9eda; --sky3:#1a6fa8;
          --txt:#e8f4ff; --mut:rgba(165,210,240,.48); --mut2:rgba(120,175,220,.28);
          --bdr:rgba(84,199,248,.08); --bdr2:rgba(84,199,248,.18);
          --grn:#22c55e; --red:#ef4444; --amb:#f59e0b;
          --panel:300px;
          --hdr:64px;
          --ms-w:260px;
        }

        @keyframes typingBounce{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-5px);opacity:1}}
        @keyframes msgIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes overlayIn{from{opacity:0}to{opacity:1}}
        @keyframes modalUp{from{opacity:0;transform:translateY(22px) scale(.95)}to{opacity:1;transform:none}}
        @keyframes tabIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes onlinePulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.55)}50%{box-shadow:0 0 0 5px rgba(34,197,94,0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes msSlideIn{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}}
        @keyframes badgePop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}

        /* ── ROOT ── */
        .cv{position:fixed;inset:0;display:flex;flex-direction:column;
  background:var(--bg);font-family:'DM Sans',sans-serif;color:var(--txt);
  overflow:hidden;-webkit-font-smoothing:antialiased;
  left:64px;}
        .cv-mesh{position:fixed;inset:0;pointer-events:none;z-index:0;
          background:
            radial-gradient(ellipse 65% 40% at 0 0,rgba(84,199,248,.07) 0%,transparent 55%),
            radial-gradient(ellipse 50% 35% at 100% 100%,rgba(59,158,218,.05) 0%,transparent 50%)}

        /* ── HEADER ── */
        .cv-hdr{position:relative;z-index:100;flex-shrink:0;height:var(--hdr);
          background:rgba(6,15,30,.97);backdrop-filter:blur(22px) saturate(1.5);
          border-bottom:1px solid var(--bdr);padding:0 16px;
          display:flex;align-items:center;gap:10px}
        .cv-hdr::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,rgba(84,199,248,.2),transparent)}
        .cv-ibtn{width:38px;height:38px;border-radius:12px;flex-shrink:0;
          background:var(--bdr);border:1px solid var(--bdr2);
          display:flex;align-items:center;justify-content:center;
          color:var(--mut);cursor:pointer;transition:all .18s;position:relative}
        .cv-ibtn:hover{background:rgba(84,199,248,.1);border-color:rgba(84,199,248,.3);color:var(--sky);transform:scale(1.06)}

        .cv-ibtn-badge{
          position:absolute;top:-5px;right:-5px;
          min-width:17px;height:17px;border-radius:9px;padding:0 4px;
          background:#ef4444;border:2px solid var(--bg);
          color:#fff;font-family:'Syne',sans-serif;font-size:9px;font-weight:900;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(239,68,68,.5);
          animation:badgePop .25s cubic-bezier(.34,1.56,.64,1) both;
        }

        .cv-hdr-info{flex:1;display:flex;align-items:center;gap:12px;min-width:0}
        .cv-hdr-name{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;
          letter-spacing:-.3px;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cv-hdr-sub{display:flex;align-items:center;gap:5px;margin-top:2px;flex-wrap:wrap}
        .cv-hpill{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--mut);font-weight:500}
        .cv-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;transition:all .3s}
        .cv-dot.on{background:var(--grn);animation:onlinePulse 2.4s infinite}
        .cv-dot.off{background:rgba(255,255,255,.18)}

        /* Tab switcher — SOLO en mobile */
        .cv-mtabs{display:none;gap:4px;flex-shrink:0;margin-left:auto}
        .cv-mtab{padding:6px 14px;border-radius:100px;border:1px solid var(--bdr);
          font-family:'Syne',sans-serif;font-size:11px;font-weight:700;
          color:var(--mut);background:transparent;cursor:pointer;transition:all .18s}
        .cv-mtab.on{background:rgba(84,199,248,.12);border-color:var(--bdr2);color:var(--sky)}

        /* ── BODY ── */
        .cv-body{flex:1;display:flex;min-height:0;position:relative;z-index:1;overflow:hidden}

        /* ══════════════════════════════════
           MINI SIDEBAR — solo desktop grande
        ══════════════════════════════════ */
        .cv-minisidebar{
          width:var(--ms-w);flex-shrink:0;
          border-right:1px solid var(--bdr);
          display:flex;flex-direction:column;
          overflow:hidden;
          background:linear-gradient(180deg,var(--bg2) 0%,var(--bg) 100%);
          animation:msSlideIn .32s cubic-bezier(.16,1,.3,1) both;
        }

        .cv-ms-header{
          display:flex;align-items:center;gap:7px;
          padding:14px 14px 10px;
          border-bottom:1px solid var(--bdr);
          flex-shrink:0;
        }
        .cv-ms-header span{
          font-family:'Syne',sans-serif;font-size:11px;font-weight:700;
          letter-spacing:.5px;text-transform:uppercase;color:var(--mut);
          flex:1;white-space:nowrap;overflow:hidden;
        }
        .cv-ms-total-badge{
          background:#ef4444;color:#fff;
          font-family:'Syne',sans-serif;font-size:10px;font-weight:900;
          min-width:20px;height:20px;border-radius:10px;padding:0 5px;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
          box-shadow:0 2px 10px rgba(239,68,68,.5);
          animation:badgePop .3s cubic-bezier(.34,1.56,.64,1) both;
        }

        .cv-ms-list{
          flex:1;overflow-y:auto;padding:6px;
          display:flex;flex-direction:column;gap:2px;
        }
        .cv-ms-list::-webkit-scrollbar{width:2px}
        .cv-ms-list::-webkit-scrollbar-thumb{background:var(--bdr2);border-radius:2px}

        .cv-ms-empty{
          padding:24px 10px;text-align:center;
          font-size:11px;color:var(--mut2);font-style:italic;
        }

        .cv-ms-item{
          display:flex;align-items:center;gap:9px;
          padding:9px 10px;border-radius:12px;
          background:transparent;border:1px solid transparent;
          cursor:pointer;text-align:left;width:100%;
          transition:all .16s;position:relative;
        }
        .cv-ms-item:hover{
          background:rgba(84,199,248,.06);
          border-color:var(--bdr);
        }
        .cv-ms-item.has-unread{
          background:rgba(239,68,68,.06);
          border-color:rgba(239,68,68,.18);
        }
        .cv-ms-item.has-unread:hover{
          background:rgba(239,68,68,.1);
          border-color:rgba(239,68,68,.3);
        }
        .cv-ms-item.has-unread::before{
          content:'';position:absolute;left:0;top:20%;bottom:20%;width:2.5px;
          background:linear-gradient(to bottom,#ef4444,#dc2626);
          border-radius:0 2px 2px 0;
          box-shadow:0 0 8px rgba(239,68,68,.6);
        }

        .cv-ms-avatar-wrap{position:relative;flex-shrink:0}
        .cv-ms-badge{
          position:absolute;top:-4px;right:-4px;
          min-width:16px;height:16px;border-radius:8px;padding:0 3px;
          background:#ef4444;border:1.5px solid var(--bg);
          color:#fff;font-family:'Syne',sans-serif;font-size:9px;font-weight:900;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 6px rgba(239,68,68,.5);
          animation:badgePop .25s cubic-bezier(.34,1.56,.64,1) both;
        }

        .cv-ms-info{flex:1;min-width:0}
        .cv-ms-name{
          font-family:'Syne',sans-serif;font-size:12px;font-weight:800;
          color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          letter-spacing:-.2px;
        }
        .cv-ms-preview{
          font-size:11px;color:var(--mut2);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          margin-top:1px;
        }
        .cv-ms-preview.unread{color:rgba(255,255,255,.7);font-weight:500}
        .cv-ms-time{
          font-size:9.5px;color:var(--mut2);flex-shrink:0;white-space:nowrap;
        }

        /* ══════════════════════════════════
           PANEL DE PERFIL
        ══════════════════════════════════ */
        .cv-profile-panel{
          width:var(--panel);flex-shrink:0;
          border-left:1px solid var(--bdr);
          display:flex;flex-direction:column;
          overflow:hidden;
          background:linear-gradient(180deg,var(--bg2) 0%,var(--bg) 100%);
          animation:slideIn .38s cubic-bezier(.16,1,.3,1) both;
        }

        .cv-profile-photo{position:relative;flex-shrink:0;height:240px;overflow:hidden;background:var(--bg3)}
        .cv-phimg{width:100%;height:100%;object-fit:cover;transition:transform .55s}
        .cv-profile-photo:hover .cv-phimg{transform:scale(1.04)}
        .cv-phplaceholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
        .cv-phgrad{position:absolute;bottom:0;left:0;right:0;height:65%;
          background:linear-gradient(to bottom,transparent,rgba(6,15,30,.97));pointer-events:none}
        .cv-phnav{position:absolute;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;
          background:rgba(6,15,30,.65);border:1px solid rgba(255,255,255,.12);
          color:rgba(255,255,255,.85);cursor:pointer;display:flex;align-items:center;justify-content:center;
          transition:all .18s;backdrop-filter:blur(8px);z-index:3}
        .cv-phnav:hover{background:rgba(84,199,248,.28);border-color:var(--sky);color:var(--sky)}
        .cv-phnav--l{left:9px}.cv-phnav--r{right:9px}
        .cv-ph-dots{position:absolute;bottom:52px;left:0;right:0;display:flex;justify-content:center;gap:5px;z-index:2}
        .cv-ph-dot{width:5px;height:5px;border-radius:50%;border:none;background:rgba(255,255,255,.3);cursor:pointer;transition:all .22s;padding:0}
        .cv-ph-dot.on{background:var(--sky);width:16px;border-radius:3px}
        .cv-photocnt{position:absolute;top:10px;right:10px;background:rgba(6,15,30,.7);backdrop-filter:blur(8px);
          border:1px solid rgba(84,199,248,.15);border-radius:100px;font-size:10px;font-weight:700;color:var(--mut);padding:3px 8px;font-family:'Syne',sans-serif;z-index:3}
        .cv-phoverlay{position:absolute;bottom:0;left:0;right:0;padding:12px 14px 11px;z-index:2}
        .cv-phname{font-family:'Syne',sans-serif;font-size:18px;font-weight:900;letter-spacing:-.4px;color:#fff;line-height:1.1;text-shadow:0 2px 14px rgba(0,0,0,.7)}
        .cv-phrow{display:flex;align-items:center;gap:10px;margin-top:4px;flex-wrap:wrap}
        .cv-phloc{display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,.55);font-weight:500}
        .cv-phstatus{display:flex;align-items:center;gap:5px}
        .cv-sdot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.15);transition:all .3s;flex-shrink:0}
        .cv-sdot.on{background:var(--grn);box-shadow:0 0 8px rgba(34,197,94,.7);border-color:var(--grn)}
        .cv-phstatus span:last-child{font-size:11px;color:rgba(255,255,255,.55);font-weight:500}

        .cv-pstats-row{display:flex;gap:0;flex-shrink:0;border-bottom:1px solid var(--bdr)}
        .cv-pstat{flex:1;padding:11px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;border-right:1px solid var(--bdr);transition:background .2s;cursor:default}
        .cv-pstat:last-child{border-right:none}
        .cv-pstat:hover{background:rgba(84,199,248,.04)}
        .cv-pstat-n{font-family:sans-serif;font-size:15px;font-weight:900;color:var(--sky);letter-spacing:-.35px}
        .cv-pstat-k{font-size:9px;color:var(--mut2);letter-spacing:.8px;text-transform:uppercase;font-weight:600}

        .cv-ptabs{display:flex;border-bottom:1px solid var(--bdr);flex-shrink:0}
        .cv-ptab{flex:1;padding:10px 6px;background:transparent;border:none;border-bottom:2px solid transparent;
          font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:.4px;
          color:var(--mut);cursor:pointer;transition:all .18s;text-transform:uppercase;margin-bottom:-1px}
        .cv-ptab.on{color:var(--sky);border-bottom-color:var(--sky)}
        .cv-ptab:hover:not(.on){color:var(--txt);background:rgba(84,199,248,.03)}

        .cv-pbody{flex:1;overflow-y:auto;padding:14px 14px 16px;display:flex;flex-direction:column;gap:0}
        .cv-pbody::-webkit-scrollbar{width:2px}
        .cv-pbody::-webkit-scrollbar-thumb{background:var(--bdr2);border-radius:2px}
        .cv-tab-content{display:flex;flex-direction:column;gap:14px;animation:tabIn .22s ease both;flex:1}
        .cv-psec{display:flex;flex-direction:column;gap:8px}
        .cv-psec-lbl{font-size:9px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:var(--sky);opacity:.55}
        .cv-pbio{font-size:12.5px;line-height:1.8;color:rgba(165,210,240,.65);font-style:italic;border-left:2px solid rgba(84,199,248,.2);padding-left:10px}
        .cv-pempty{font-size:12px;color:var(--mut2);font-style:italic;padding:6px 0}
        .cv-pmeta{display:flex;flex-wrap:wrap;gap:5px}
        .cv-pmchip{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:100px;background:var(--bdr);border:1px solid var(--bdr2);font-size:11.5px;color:var(--mut);transition:all .18s}
        .cv-pmchip:hover{border-color:rgba(84,199,248,.28);color:var(--txt)}
        .cv-plf{display:flex;flex-wrap:wrap;gap:5px}
        .cv-plf-chip{display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:9px;background:rgba(84,199,248,.06);border:1px solid rgba(84,199,248,.2);font-size:11.5px;color:var(--sky);font-weight:600}
        .cv-pints{display:flex;flex-wrap:wrap;gap:5px}
        .cv-pint{padding:4px 10px;border-radius:7px;background:var(--bdr);border:1px solid var(--bdr2);font-size:11.5px;color:var(--mut);transition:all .18s;cursor:default}
        .cv-pint:hover{border-color:rgba(84,199,248,.25);color:var(--txt)}
        .cv-photos-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
        .cv-photo-thumb{aspect-ratio:3/4;border-radius:9px;overflow:hidden;position:relative;cursor:pointer;border:1.5px solid var(--bdr);transition:all .2s}
        .cv-photo-thumb:hover{border-color:rgba(84,199,248,.35);transform:scale(1.03)}
        .cv-photo-thumb.active{border-color:var(--sky);box-shadow:0 0 0 2px rgba(84,199,248,.2)}
        .cv-photo-thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .cv-photo-main-lbl{position:absolute;bottom:4px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--sky),var(--sky3));color:#04111f;font-size:8px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;padding:2px 6px;border-radius:4px;white-space:nowrap}
        .cv-mbadge{display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;background:rgba(84,199,248,.05);border:1px solid rgba(84,199,248,.12);border-radius:11px;font-size:11.5px;color:var(--mut);font-weight:500}
        .cv-pbtns{display:flex;gap:6px;margin-top:auto;padding-top:14px;flex-shrink:0}
        .cv-paction{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 10px;border-radius:11px;border:1px solid;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;letter-spacing:.2px}
        .cv-paction--unmatch{background:rgba(239,68,68,.05);border-color:rgba(239,68,68,.18);color:rgba(239,100,100,.75)}
        .cv-paction--unmatch:hover{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.38);color:var(--red);transform:translateY(-1px)}
        .cv-paction--report{background:rgba(245,158,11,.04);border-color:rgba(245,158,11,.14);color:rgba(245,158,11,.6)}
        .cv-paction--report:hover{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.34);color:var(--amb);transform:translateY(-1px)}

        /* ══════════════════════════════════
           CHAT
        ══════════════════════════════════ */
        .cv-chat{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden}
        .cv-msgs{flex:1;overflow-y:auto;padding:18px 20px 10px;display:flex;flex-direction:column;gap:1px;min-height:0}
        .cv-msgs::-webkit-scrollbar{width:3px}
        .cv-msgs::-webkit-scrollbar-thumb{background:var(--bdr2);border-radius:3px}
        .cv-date{align-self:center;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--mut2);background:var(--bdr);border:1px solid var(--bdr2);border-radius:100px;padding:4px 13px;margin:14px 0 7px;user-select:none}
        .cv-load{align-self:center;font-size:11px;font-weight:500;color:var(--mut);background:var(--bdr);border:1px solid var(--bdr2);border-radius:100px;padding:5px 18px;cursor:pointer;margin-bottom:10px;transition:all .2s;display:flex;align-items:center;gap:7px}
        .cv-load:hover:not(:disabled){background:rgba(84,199,248,.08);border-color:var(--sky);color:var(--sky)}
        .cv-load:disabled{opacity:.35;cursor:default}
        .cv-spinner{width:10px;height:10px;border-radius:50%;border:1.5px solid rgba(84,199,248,.22);border-top-color:var(--sky);animation:spin .7s linear infinite}
        .cv-row{display:flex;align-items:flex-end;gap:7px;animation:msgIn .2s ease}
        .cv-row.mine{flex-direction:row-reverse}
        .cv-av{flex-shrink:0;margin-bottom:1px}
        .cv-av.ghost{opacity:0;pointer-events:none}
        .cv-bwrap{display:flex;flex-direction:column;max-width:min(72%,460px)}
        .cv-row.mine .cv-bwrap{align-items:flex-end}
        .cv-b{padding:10px 15px;font-size:14px;line-height:1.58;word-break:break-word}
        .cv-b.mine{background:linear-gradient(135deg,var(--sky) 0%,var(--sky2) 55%,var(--sky3) 100%);color:#04111f;font-weight:600;border-radius:20px 20px 5px 20px;box-shadow:0 4px 18px rgba(84,199,248,.2),0 1px 4px rgba(0,0,0,.25)}
        .cv-b.theirs{background:var(--bg3);border:1px solid var(--bdr2);color:var(--txt);border-radius:20px 20px 20px 5px;box-shadow:0 2px 8px rgba(0,0,0,.2)}
        .cv-b.mine.gm{border-top-right-radius:6px}
        .cv-b.theirs.gt{border-top-left-radius:6px}
        .cv-time{font-size:10px;color:var(--mut2);margin-top:4px;padding:0 3px;user-select:none}
        .cv-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:36px;text-align:center}
        .cv-empty-av{width:82px;height:82px;border-radius:26px;background:var(--bg3);border:1.5px solid var(--bdr2);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:36px;box-shadow:0 8px 28px rgba(84,199,248,.1)}
        .cv-empty-av img{width:100%;height:100%;object-fit:cover}
        .cv-empty-h{font-family:'Syne',sans-serif;font-size:18px;font-weight:900;letter-spacing:-.4px}
        .cv-empty-p{font-size:12.5px;color:var(--mut);max-width:200px;line-height:1.65}
        .cv-typing{display:flex;align-items:flex-end;gap:7px;animation:msgIn .2s ease;margin-top:8px}
        .cv-typing-b{background:var(--bg3);border:1px solid var(--bdr);border-radius:20px 20px 20px 5px}

        .cv-bar{flex-shrink:0;padding:10px 18px 15px;background:rgba(6,15,30,.97);border-top:1px solid var(--bdr);display:flex;align-items:flex-end;gap:10px;position:relative;z-index:2}
        .cv-bar::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(84,199,248,.16),transparent)}
        .cv-field{flex:1;display:flex;align-items:flex-end;background:var(--bg3);border:1.5px solid var(--bdr);border-radius:22px;overflow:hidden;transition:border-color .2s,box-shadow .2s}
        .cv-field:focus-within{border-color:rgba(84,199,248,.28);box-shadow:0 0 0 3px rgba(84,199,248,.05)}
        .cv-ta{flex:1;background:transparent;border:none;outline:none;resize:none;padding:12px 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--txt);line-height:1.5;max-height:120px;min-height:44px}
        .cv-ta::placeholder{color:var(--mut2)}
        .cv-send{width:42px;height:42px;border-radius:50%;border:none;background:linear-gradient(135deg,var(--sky) 0%,var(--sky2) 55%,var(--sky3) 100%);color:#04111f;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:transform .18s,box-shadow .18s,opacity .15s;box-shadow:0 4px 18px rgba(84,199,248,.3);margin-bottom:1px}
        .cv-send:hover:not(:disabled){transform:scale(1.1);box-shadow:0 6px 24px rgba(84,199,248,.55)}
        .cv-send:active:not(:disabled){transform:scale(.9)}
        .cv-send:disabled{opacity:.22;cursor:not-allowed;box-shadow:none;background:var(--bdr)}

        /* ══════════════════════════════════
           MODALS
        ══════════════════════════════════ */
        .cv-overlay{position:fixed;inset:0;z-index:1000;background:rgba(3,8,18,.82);backdrop-filter:blur(16px) saturate(1.4);display:flex;align-items:center;justify-content:center;padding:20px;animation:overlayIn .22s ease}
        .cv-modal{background:linear-gradient(160deg,var(--bg2) 0%,var(--bg3) 100%);border:1px solid var(--bdr2);border-radius:24px;padding:28px 26px 24px;width:100%;max-width:400px;display:flex;flex-direction:column;gap:14px;box-shadow:0 32px 80px rgba(0,0,0,.65);animation:modalUp .28s cubic-bezier(.16,1,.3,1) both}
        .cv-modal--wide{max-width:440px}
        .cv-modal-icon{width:56px;height:56px;border-radius:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
        .cv-modal-icon--danger{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25)}
        .cv-modal-icon--warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25)}
        .cv-modal-icon--success{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25)}
        .cv-modal-title{font-family:'Syne',sans-serif;font-size:19px;font-weight:900;letter-spacing:-.4px;color:var(--txt)}
        .cv-modal-body{font-size:13px;color:var(--mut);line-height:1.75}
        .cv-modal-body strong{color:var(--txt);font-weight:600}
        .cv-modal-actions{display:flex;gap:8px;width:100%;margin-top:2px}
        .cv-mbtn{flex:1;padding:12px 14px;border-radius:13px;font-family:'Syne',sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;transition:all .18s;letter-spacing:.2px;border:1px solid}
        .cv-mbtn:disabled{opacity:.4;cursor:not-allowed}
        .cv-mbtn--ghost{background:var(--bdr);border-color:var(--bdr2);color:var(--mut)}
        .cv-mbtn--ghost:hover:not(:disabled){background:rgba(84,199,248,.08);color:var(--txt)}
        .cv-mbtn--danger{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.35);color:var(--red)}
        .cv-mbtn--danger:hover:not(:disabled){background:rgba(239,68,68,.2)}
        .cv-mbtn--warn{background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.3);color:var(--amb)}
        .cv-mbtn--warn:hover:not(:disabled){background:rgba(245,158,11,.18)}
        .cv-mbtn--primary{background:linear-gradient(135deg,var(--sky),var(--sky2));border-color:transparent;color:#04111f;font-weight:800}
        .cv-mbtn--primary:hover{box-shadow:0 4px 16px rgba(84,199,248,.38)}
        .cv-report-reasons{display:flex;flex-wrap:wrap;gap:6px}
        .cv-reason-chip{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;background:var(--bdr);border:1.5px solid var(--bdr2);font-size:12px;color:var(--mut);cursor:pointer;transition:all .18s}
        .cv-reason-chip:hover{border-color:rgba(245,158,11,.3);color:var(--txt)}
        .cv-reason-chip.active{background:rgba(245,158,11,.09);border-color:rgba(245,158,11,.42);color:var(--amb)}
        .cv-report-ta{width:100%;background:rgba(84,199,248,.04);border:1.5px solid var(--bdr2);border-radius:13px;padding:11px 13px;font-family:'DM Sans',sans-serif;font-size:13.5px;color:var(--txt);outline:none;resize:none;line-height:1.55;transition:all .2s}
        .cv-report-ta::placeholder{color:var(--mut2)}
        .cv-report-ta:focus{border-color:rgba(245,158,11,.32);box-shadow:0 0 0 3px rgba(245,158,11,.06)}

        /* ══════════════════════════════════
           RESPONSIVE — ≤ 1024px: ocultar mini sidebar
           El sidebar de chats solo se ve en desktop grande
        ══════════════════════════════════ */
        @media (max-width: 1024px) {
          .cv-minisidebar { display: none !important; }
          .cv-mtabs { display: flex; }

          .cv-profile-panel {
            position: absolute;
            inset: 0;
            width: 100%;
            z-index: 10;
            border-right: none;
            display: none;
            animation: slideUp .25s ease both;
          }
          .cv-profile-panel.mob-visible { display: flex; }

          .cv-chat {
            position: absolute;
            inset: 0;
            width: 100%;
          }
          .cv-chat.mob-hidden { display: none; }
          .cv-body { position: relative; }
        }

        /* Desktop mediano: sidebar más angosto */
        @media (max-width: 1300px) and (min-width: 1025px) {
          :root { --ms-w: 200px; }
        }

        /* ── MÓVIL MUY CHICO ≤ 430px ── */
        @media (max-width: 430px) {
          .cv-hdr { padding: 0 10px; gap: 8px; }
          .cv-hdr-name { font-size: 14px; }
          .cv-msgs { padding: 10px 10px 6px; }
          .cv-bar { padding: 8px 10px 12px; gap: 8px; }
          .cv-ta { font-size: 16px; }
          .cv-b { font-size: 13.5px; padding: 9px 13px; }
          .cv-bwrap { max-width: min(85%, 320px); }
          .cv-profile-photo { height: 200px; }
          .cv-modal { padding: 20px 16px 18px; border-radius: 18px; }
          .cv-ptab { font-size: 10px; padding: 9px 4px; }
        }
      `}</style>

      <div className="cv">
        <div className="cv-mesh" />

        {/* HEADER */}
        <header className="cv-hdr">
          <button
            className="cv-ibtn"
            onClick={() => router.push("/chat")}
            style={{ flexShrink: 0 }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M10 2.5L5 7.5l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="cv-hdr-info">
            <Avatar
              url={otherUser?.avatar_url ?? null}
              name={otherUser?.name ?? ""}
              size={42} radius={14}
              online={otherUser?.is_online}
            />
            <div style={{ minWidth: 0 }}>
              <div className="cv-hdr-name">
                {otherUser ? `${otherUser.name}${otherUser.age ? `, ${otherUser.age}` : ""}` : "···"}
              </div>
              <div className="cv-hdr-sub">
                <div className="cv-hpill">
                  <span className={`cv-dot ${otherUser?.is_online ? "on" : "off"}`} />
                  <span>{otherUser?.is_online ? "En línea ahora" : "Desconectado"}</span>
                </div>
                {otherUser?.occupation && (
                  <>
                    <span style={{ color: "rgba(84,199,248,0.2)", fontSize: 10 }}>·</span>
                    <span style={{ fontSize: 11, color: "rgba(165,210,240,0.35)" }}>{otherUser.occupation}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile tab switcher */}
          <div className="cv-mtabs">
            <button
              className={`cv-mtab ${mobileView === "chat" ? "on" : ""}`}
              onClick={() => setMobileView("chat")}
            >Chat</button>
            <button
              className={`cv-mtab ${mobileView === "profile" ? "on" : ""}`}
              onClick={() => setMobileView("profile")}
            >Perfil</button>
          </div>
        </header>

        {/* BODY */}
        <div className="cv-body">

          {/* MINI SIDEBAR — otras conexiones (solo desktop ≥ 1025px) */}
          <MiniSidebar
            matches={sidebarMatches}
            currentId={otherId}
            onNavigate={navigateToChat}
          />

          {/* CHAT */}
          <div className={`cv-chat ${mobileView === "profile" ? "mob-hidden" : ""}`}>
            <div className="cv-msgs" ref={scrollRef} onScroll={handleScroll}>
              {hasMore && (
                <button className="cv-load" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <><span className="cv-spinner"/>Cargando…</> : "Ver mensajes anteriores"}
                </button>
              )}

              {messages.length === 0 ? (
                <div className="cv-empty">
                  <div className="cv-empty-av">
                    {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" /> : "👋"}
                  </div>
                  <div className="cv-empty-h">{otherUser ? `¡Hola, ${otherUser.name}!` : "···"}</div>
                  <div className="cv-empty-p">Son una conexión. ¡Rompé el hielo y escribí algo!</div>
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
                            style={{ opacity: isTemp ? 0.62 : 1, transition: "opacity .2s" }}>
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
                    <Avatar url={otherUser?.avatar_url ?? null} name={otherUser?.name ?? ""} size={28} radius={9}/>
                  </div>
                  <div className="cv-typing-b"><TypingDots /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

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
              <button className="cv-send" onClick={sendMessage} disabled={!text.trim() || sending} aria-label="Enviar">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1.5 8h13M8.5 2l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* PANEL DE PERFIL — derecha */}
          {otherUser && (
            <ProfilePanel
              user={otherUser}
              msgCount={realMsgCount}
              matchDate={matchDate}
              onUnmatch={() => setModal("unmatch")}
              onReport={() => setModal("report")}
              mobVisible={mobileView === "profile"}
            />
          )}
        </div>
      </div>

      {/* MODALS */}
      {modal === "unmatch" && otherUser && (
        <UnmatchModal name={otherUser.name} onConfirm={handleUnmatch} onCancel={() => setModal(null)} loading={unmatchLoading}/>
      )}
      {modal === "report" && otherUser && (
        <ReportModal name={otherUser.name} otherId={otherId} myId={myId} onClose={() => setModal(null)}/>
      )}
    </>
  );
}