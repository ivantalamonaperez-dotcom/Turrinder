"use client";


import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import { useSocket } from "@/hooks/useSocket";
import {
  useDebateMedia,
  type Participant,
  type ChatMessage,
  type SpeakRequest,
} from "@/hooks/useDebateMedia";
import logoImg from "../../../../Images/logo.png";
import debatesImg from "../../../../Images/debates.png";

type Tag =
  | "Política" | "Tecnología" | "Ciencia" | "Deportes" | "Cultura"
  | "Economía" | "Filosofía" | "Gaming" | "Arte" | "Actualidad";

const ALL_TAGS: Tag[] = [
  "Política","Tecnología","Ciencia","Deportes","Cultura",
  "Economía","Filosofía","Gaming","Arte","Actualidad",
];

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const CAN_CREATE_ROLES = ["streamer", "vip"];
const MAX_ROOM_CAPACITY = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  id: string; title: string; description: string; tags: Tag[];
  max_people: number; participant_count: number;
  host_id: string; host_name: string; host_role?: string;
  created_at: string; is_live: boolean;
}

interface RoomSettings {
  allMutedOnEntry: boolean;
  cameraAllowed:   boolean;
  chatEnabled:     boolean;
  speakTimeLimit:  number; // segundos, 0 = sin límite
  strictMode:      boolean;
  freeMode:        boolean;
}

interface ModLog {
  id: string; action: string; targetName: string;
  actorName: string; timestamp: number; details?: string;
}

interface ActiveVote {
  id: string; type: "yes_no" | "kick_vote";
  question: string; votes: Record<string, string>;
  endsAt: number; targetId?: string; targetName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gridLayout(n: number): { cols: number } {
  if (n <= 1) return { cols: 1 };
  if (n <= 2) return { cols: 2 };
  if (n <= 4) return { cols: 2 };
  if (n <= 6) return { cols: 3 };
  if (n <= 9) return { cols: 3 };
  if (n <= 12) return { cols: 4 };
  return { cols: 4 };
}

async function fetchProfile(uid: string): Promise<{ name: string; avatarUrl: string | null }> {
  const { data } = await supabase
    .from("profiles").select("name, avatar_url").eq("id", uid).single();
  return { name: data?.name || "Usuario", avatarUrl: data?.avatar_url || null };
}

// ─── useRooms ─────────────────────────────────────────────────────────────────

function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("rooms").select("*").eq("is_live", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setRooms(data as Room[]); setLoading(false); });

    const ch = supabase.channel("rooms-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, p => {
        if (p.eventType === "INSERT") setRooms(prev => [p.new as Room, ...prev]);
        else if (p.eventType === "UPDATE") setRooms(prev => prev.map(r => r.id === p.new.id ? p.new as Room : r));
        else if (p.eventType === "DELETE") setRooms(prev => prev.filter(r => r.id !== p.old.id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const createRoom = useCallback(async (data: Omit<Room, "id"|"participant_count"|"created_at"|"is_live">) => {
    const { data: room, error } = await supabase.from("rooms")
      .insert({ ...data, participant_count: 1, is_live: true }).select().single();
    if (error) throw error;
    return room as Room;
  }, []);

  const closeRoom  = useCallback(async (roomId: string) => {
    await supabase.from("rooms").update({ is_live: false }).eq("id", roomId);
  }, []);

  const setCount = useCallback(async (roomId: string, count: number) => {
    await supabase.from("rooms").update({ participant_count: count }).eq("id", roomId);
  }, []);

  return { rooms, loading, createRoom, closeRoom, setCount };
}

// ─── Ban helpers ──────────────────────────────────────────────────────────────

async function checkBan(roomId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("room_bans").select("id").eq("room_id", roomId).eq("user_id", userId).maybeSingle();
    if (error) return false;  // tabla inexistente u otro error → no bloquear
    return !!data;
  } catch {
    return false;
  }
}

async function insertBan(roomId: string, userId: string): Promise<void> {
  await supabase.from("room_bans").upsert({ room_id: roomId, user_id: userId });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type = "info", onDone }: {
  message: string; type?: "info"|"warn"|"error"; onDone: () => void;
}) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return <div className={`dr-toast dr-toast-${type}`}>{message}</div>;
}

function TagBadge({ tag, selected, onClick }: { tag: Tag; selected?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`dr-tag ${selected ? "selected" : ""}`}
      style={{ cursor: onClick ? "pointer" : "default" }}>{tag}</button>
  );
}

// ─── SpeakTimer ───────────────────────────────────────────────────────────────

function SpeakTimer({ endsAt }: { endsAt: number }) {
  const [secs, setSecs] = useState(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))), 500);
    return () => clearInterval(t);
  }, [endsAt]);
  const color = secs <= 10 ? "#f87171" : secs <= 20 ? "#fbbf24" : "#4ade80";
  const total = Math.max(secs, 1);
  return (
    <div className="speak-timer" title={`${secs}s restantes`}>
      <svg width="34" height="34" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5"/>
        <circle cx="17" cy="17" r="14" fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={`${2*Math.PI*14}`}
          strokeDashoffset={`${2*Math.PI*14*(1 - Math.min(secs/total,1))}`}
          strokeLinecap="round" transform="rotate(-90 17 17)"
          style={{ transition:"stroke-dashoffset 0.5s, stroke 0.5s" }}/>
        <text x="17" y="21" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{secs}</text>
      </svg>
    </div>
  );
}

// ─── VotePanel ────────────────────────────────────────────────────────────────

function VotePanel({ vote, userId, onCast }: {
  vote: ActiveVote; userId: string; onCast: (id: string, choice: string) => void;
}) {
  const myVote   = vote.votes[userId];
  const yes      = Object.values(vote.votes).filter(v => v === "yes").length;
  const no       = Object.values(vote.votes).filter(v => v === "no").length;
  const total    = Object.keys(vote.votes).length || 1;
  const [secs, setSecs] = useState(Math.max(0, Math.ceil((vote.endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setSecs(Math.max(0, Math.ceil((vote.endsAt - Date.now()) / 1000))), 500);
    return () => clearInterval(t);
  }, [vote.endsAt]);
  return (
    <div className="vote-panel">
      <div className="vote-header">
        <span className="vote-icon">🗳️</span>
        <span className="vote-question">{vote.question}</span>
        <span className="vote-timer">{secs}s</span>
      </div>
      <div className="vote-options">
        <button className={`vote-opt yes ${myVote === "yes" ? "voted" : ""}`}
          onClick={() => onCast(vote.id, "yes")} disabled={!!myVote}>
          <span>✅ Sí</span>
          <span className="vote-count">{yes} ({Math.round(yes/total*100)}%)</span>
        </button>
        <button className={`vote-opt no ${myVote === "no" ? "voted" : ""}`}
          onClick={() => onCast(vote.id, "no")} disabled={!!myVote}>
          <span>❌ No</span>
          <span className="vote-count">{no} ({Math.round(no/total*100)}%)</span>
        </button>
      </div>
    </div>
  );
}

// ─── HostPanel ────────────────────────────────────────────────────────────────

type HostTab = "participants" | "queue" | "settings" | "logs";

function HostPanel({
  allParticipants, speakQueue, raisedHands, currentSpeaker, speakEndsAt,
  cohosts, roomSettings, modLogs, tempMutes, activeVote, hostId, userId,
  onMute, onUnmute, onCamOff, onCamOn, onKick, onBan, onTempMute, onShadowMute,
  onApprove, onReject, onCut, onExtend, onMuteAll, onSetMode, onUpdateSettings,
  onAssignCohost, onTransferHost, onStartVote, onCastVote,
}: {
  allParticipants: Participant[];
  speakQueue: SpeakRequest[]; raisedHands: Set<string>;
  currentSpeaker: string | null; speakEndsAt: number | null;
  cohosts: Set<string>; roomSettings: RoomSettings; modLogs: ModLog[];
  tempMutes: Record<string, number>; activeVote: ActiveVote | null;
  hostId: string; userId: string;
  onMute: (id: string, name: string) => void; onUnmute: (id: string, name: string) => void;
  onCamOff: (id: string) => void; onCamOn: (id: string) => void;
  onKick: (id: string, name: string) => void; onBan: (id: string, name: string) => void;
  onTempMute: (id: string, name: string, ms: number) => void;
  onShadowMute: (id: string, name: string) => void;
  onApprove: (id: string, name: string) => void; onReject: (id: string) => void;
  onCut: () => void; onExtend: (s: number) => void;
  onMuteAll: (m: boolean) => void; onSetMode: (m: "strict"|"free"|"normal") => void;
  onUpdateSettings: (s: Partial<RoomSettings>) => void;
  onAssignCohost: (id: string, name: string, assign: boolean) => void;
  onTransferHost: (id: string, name: string) => void;
  onStartVote: (type: "yes_no"|"kick_vote", q: string, ms: number, tid?: string, tn?: string) => void;
  onCastVote: (id: string, choice: string) => void;
}) {
  const [tab,          setTab]        = useState<HostTab>("participants");
  const [expandedId,   setExpanded]   = useState<string | null>(null);
  const [tempMuteMenu, setTempMuteM]  = useState<string | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<string | null>(null);

  const isMod = (uid: string) => uid === hostId || cohosts.has(uid);
  const currentMode = roomSettings.strictMode ? "strict" : roomSettings.freeMode ? "free" : "normal";

  const TEMP_OPTS = [
    { label: "30s", ms: 30_000 }, { label: "2min", ms: 120_000 },
    { label: "5min", ms: 300_000 }, { label: "10min", ms: 600_000 },
  ];

  return (
    <div className="host-panel">
      <div className="host-panel-header">
        <span className="host-panel-title">👑 Moderación</span>
        <div className="host-panel-tabs">
          {(["participants","queue","settings","logs"] as HostTab[]).map(t => (
            <button key={t} className={`host-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {{ participants:"👥", queue:"✋", settings:"⚙️", logs:"📋" }[t]}
              {t === "queue" && speakQueue.length > 0 && <span className="host-tab-badge">{speakQueue.length}</span>}
              {t === "queue" && raisedHands.size > 0 && <span className="host-tab-badge" style={{ background: "#fbbf24", right: speakQueue.length > 0 ? 18 : 4 }}>{raisedHands.size}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="host-panel-body">

        {/* Hablante actual */}
        {currentSpeaker && (
          <div className="current-speaker-bar">
            <div className="current-speaker-info">
              <span className="speaking-dot" />
              <span className="speaking-label">Hablando:</span>
              <span className="speaking-name">
                {allParticipants.find(p => p.id === currentSpeaker)?.name ?? currentSpeaker.slice(0,8)}
              </span>
              {speakEndsAt && <SpeakTimer endsAt={speakEndsAt} />}
            </div>
            <div className="current-speaker-actions">
              <button className="spk-btn extend" onClick={() => onExtend(30)}>+30s</button>
              <button className="spk-btn cut"    onClick={onCut}>✂️</button>
            </div>
          </div>
        )}

        {/* Votación activa */}
        {activeVote && <VotePanel vote={activeVote} userId={userId} onCast={onCastVote} />}

        {/* ── Tab: Participantes ─────────────────────────────────────────── */}
        {tab === "participants" && (
          <div className="hp-section">
            <div className="hp-quick-actions">
              <button className="hq-btn" onClick={() => onMuteAll(true)}>🔇 Silenciar todos</button>
              <button className="hq-btn" onClick={() => onMuteAll(false)}>🔊 Activar todos</button>
            </div>
            <div className="hp-list">
              {allParticipants.map(p => {
                const isExpanded  = expandedId === p.id;
                const isTempMuted = !!tempMutes[p.id] && tempMutes[p.id] > Date.now();
                const isSpeaking  = currentSpeaker === p.id;
                const handUp      = raisedHands.has(p.id);
                const isSelf      = p.id === userId;
                return (
                  <div key={p.id} className={`hp-user ${isSpeaking ? "speaking" : ""} ${handUp ? "hand-up" : ""}`}>
                    <div className="hp-user-row" onClick={() => !isSelf && !p.isHost && setExpanded(isExpanded ? null : p.id)}>
                      <div className="hp-user-left">
                        {p.avatarUrl
                          ? <img src={p.avatarUrl} alt={p.name} className="hp-avatar" />
                          : <div className="hp-avatar-placeholder">{p.name[0]}</div>
                        }
                        <div className="hp-user-meta">
                          <span className="hp-user-name">{p.name}{isSelf ? " (tú)" : ""}</span>
                          <div className="hp-badges">
                            {p.isHost    && <span className="hbadge host">HOST</span>}
                            {p.isCohost  && <span className="hbadge cohost">MOD</span>}
                            {isSpeaking  && <span className="hbadge speaking">🎙️ Hablando</span>}
                            {handUp      && <span className="hbadge hand">✋ Mano</span>}
                            {isTempMuted && <span className="hbadge tmute">⏱️ Temp.</span>}
                            {p.shadowMuted && <span className="hbadge shadow">👻 Shadow</span>}
                          </div>
                        </div>
                      </div>
                      <div className="hp-user-icons">
                        <span className={p.mutedByHost || !p.hasAudio ? "icon-off" : "icon-on"}>🎙️</span>
                        <span className={p.camOffByHost || !p.hasVideo ? "icon-off" : "icon-on"}>📹</span>
                        {!isSelf && !p.isHost && <span className="hp-chevron">{isExpanded ? "▲" : "▼"}</span>}
                      </div>
                    </div>

                    {isExpanded && !isSelf && !p.isHost && (
                      <div className="hp-actions">
                        <div className="hp-actions-row">
                          {p.mutedByHost
                            ? <button className="ha-btn green" onClick={() => { onUnmute(p.id, p.name); setExpanded(null); }}>🔊 Activar mic</button>
                            : <button className="ha-btn" onClick={() => { onMute(p.id, p.name); setExpanded(null); }}>🔇 Silenciar</button>
                          }
                          {p.camOffByHost
                            ? <button className="ha-btn" onClick={() => { onCamOn(p.id); setExpanded(null); }}>📹 Act. cam.</button>
                            : <button className="ha-btn" onClick={() => { onCamOff(p.id); setExpanded(null); }}>📵 Apagar cam.</button>
                          }
                        </div>
                        <div className="hp-actions-row">
                          {currentSpeaker !== p.id
                            ? <button className="ha-btn green" onClick={() => { onApprove(p.id, p.name); setExpanded(null); }}>🎙️ Dar palabra</button>
                            : <button className="ha-btn warn"  onClick={() => { onCut(); setExpanded(null); }}>✂️ Cortar</button>
                          }
                          <div className="ha-tmute-wrap">
                            <button className="ha-btn warn" onClick={() => setTempMuteM(tempMuteMenu === p.id ? null : p.id)}>⏱️ Silencio temp. ▾</button>
                            {tempMuteMenu === p.id && (
                              <div className="ha-tmute-menu">
                                {TEMP_OPTS.map(o => (
                                  <button key={o.label} onClick={() => { onTempMute(p.id, p.name, o.ms); setTempMuteM(null); setExpanded(null); }}>{o.label}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="hp-actions-row">
                          <button className="ha-btn" onClick={() => { onShadowMute(p.id, p.name); setExpanded(null); }}>👻 Shadow mute</button>
                          {!isMod(p.id)
                            ? <button className="ha-btn" onClick={() => { onAssignCohost(p.id, p.name, true); setExpanded(null); }}>👑 Hacer mod.</button>
                            : <button className="ha-btn" onClick={() => { onAssignCohost(p.id, p.name, false); setExpanded(null); }}>🔄 Quitar mod.</button>
                          }
                        </div>
                        <div className="hp-actions-row">
                          {confirmTransfer !== p.id
                            ? <button className="ha-btn" onClick={() => setConfirmTransfer(p.id)}>🏆 Transferir host</button>
                            : <button className="ha-btn warn" onClick={() => { onTransferHost(p.id, p.name); setConfirmTransfer(null); setExpanded(null); }}>⚠️ Confirmar</button>
                          }
                          <button className="ha-btn" onClick={() => { onStartVote("kick_vote", `¿Expulsar a ${p.name}?`, 20_000, p.id, p.name); setExpanded(null); }}>🗳️ Votar expulsión</button>
                        </div>
                        <div className="hp-actions-row">
                          <button className="ha-btn danger" onClick={() => { onKick(p.id, p.name); setExpanded(null); }}>🚪 Expulsar</button>
                          <button className="ha-btn danger" onClick={() => { onBan(p.id, p.name);  setExpanded(null); }}>🚫 Banear</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tab: Cola ─────────────────────────────────────────────────────── */}
        {tab === "queue" && (
          <div className="hp-section">
            {raisedHands.size > 0 && (
              <div className="hp-subsection">
                <div className="hp-subsection-title">✋ Manos levantadas ({raisedHands.size})</div>
                {[...raisedHands].map(uid => {
                  const p = allParticipants.find(x => x.id === uid);
                  if (!p) return null;
                  return (
                    <div key={uid} className="queue-item hand">
                      {p.avatarUrl ? <img src={p.avatarUrl} alt={p.name} className="hp-avatar sm"/> : <div className="hp-avatar-placeholder sm">{p.name[0]}</div>}
                      <span className="queue-name">{p.name}</span>
                      <button className="qa-btn approve" onClick={() => onApprove(uid, p.name)}>✅</button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="hp-subsection">
              <div className="hp-subsection-title">📋 Solicitudes ({speakQueue.length})</div>
              {speakQueue.length === 0
                ? <div className="hp-empty">Sin solicitudes pendientes</div>
                : speakQueue.map((req, i) => (
                  <div key={req.userId} className="queue-item">
                    <span className="queue-pos">#{i+1}</span>
                    {req.avatarUrl ? <img src={req.avatarUrl} alt={req.userName} className="hp-avatar sm"/> : <div className="hp-avatar-placeholder sm">{req.userName[0]}</div>}
                    <span className="queue-name">{req.userName}</span>
                    <div className="queue-actions">
                      <button className="qa-btn approve" onClick={() => onApprove(req.userId, req.userName)}>✅</button>
                      <button className="qa-btn reject"  onClick={() => onReject(req.userId)}>❌</button>
                    </div>
                  </div>
                ))
              }
            </div>
            <div className="hp-subsection">
              <div className="hp-subsection-title">🗳️ Votación rápida</div>
              <div className="hp-quick-actions">
                <button className="hq-btn" onClick={() => onStartVote("yes_no", "¿Continuamos con este tema?", 30_000)}>¿Seguimos con el tema?</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Configuración ────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="hp-section">
            <div className="hp-subsection">
              <div className="hp-subsection-title">🎚️ Modo de sala</div>
              <div className="mode-buttons">
                {(["normal","strict","free"] as const).map(m => (
                  <button key={m} className={`mode-btn ${currentMode === m ? "active" : ""}`} onClick={() => onSetMode(m)}>
                    {{ normal:"🔄 Normal", strict:"🔒 Estricto", free:"🎙️ Libre" }[m]}
                  </button>
                ))}
              </div>
              <div className="mode-desc">
                {{ normal:"Solicitud de palabra manual.", strict:"Todos muteados + chat limitado.", free:"Micrófonos abiertos." }[currentMode]}
              </div>
            </div>
            <div className="hp-subsection">
              <div className="hp-subsection-title">⏱️ Tiempo por intervención</div>
              <div className="settings-row">
                <span className="settings-label">Segundos (0 = sin límite)</span>
                <div className="settings-stepper">
                  <button onClick={() => onUpdateSettings({ speakTimeLimit: Math.max(0, roomSettings.speakTimeLimit - 15) })}>−</button>
                  <span>{roomSettings.speakTimeLimit === 0 ? "∞" : `${roomSettings.speakTimeLimit}s`}</span>
                  <button onClick={() => onUpdateSettings({ speakTimeLimit: roomSettings.speakTimeLimit + 15 })}>+</button>
                </div>
              </div>
              <div className="settings-presets">
                {[0,30,60,120,180].map(s => (
                  <button key={s} className={`settings-preset ${roomSettings.speakTimeLimit === s ? "active" : ""}`}
                    onClick={() => onUpdateSettings({ speakTimeLimit: s })}>
                    {s === 0 ? "∞" : `${s}s`}
                  </button>
                ))}
              </div>
            </div>
            <div className="hp-subsection">
              <div className="hp-subsection-title">🛠️ Opciones</div>
              {[
                { key: "allMutedOnEntry", label: "Entrar muteado", icon: "🔇" },
                { key: "cameraAllowed",   label: "Cámara permitida", icon: "📹" },
                { key: "chatEnabled",     label: "Chat activo", icon: "💬" },
              ].map(({ key, label, icon }) => (
                <div key={key} className="settings-toggle-row">
                  <span className="settings-toggle-label">{icon} {label}</span>
                  <button className={`toggle-btn ${roomSettings[key as keyof RoomSettings] ? "on" : "off"}`}
                    onClick={() => onUpdateSettings({ [key]: !roomSettings[key as keyof RoomSettings] })}>
                    {roomSettings[key as keyof RoomSettings] ? "ON" : "OFF"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Historial ────────────────────────────────────────────────── */}
        {tab === "logs" && (
          <div className="hp-section">
            <div className="hp-subsection">
              <div className="hp-subsection-title">📋 Historial ({modLogs.length})</div>
              {modLogs.length === 0
                ? <div className="hp-empty">Sin acciones aún</div>
                : modLogs.map(log => (
                  <div key={log.id} className="log-item">
                    <span className="log-action">{log.action.replace(/_/g," ")}</span>
                    <span className="log-target">{log.targetName}</span>
                    {log.details && <span className="log-detail">{log.details}</span>}
                    <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VideoTile ────────────────────────────────────────────────────────────────

function VideoTile({
  participant, isLocalSelf, isPinned, canModerate, isSpeakerHighlight, onPin,
  onMute, onUnmute, onCamOff, onCamOn, onKick, onBan,
}: {
  participant: Participant; isLocalSelf?: boolean; isPinned?: boolean;
  canModerate?: boolean; isSpeakerHighlight?: boolean; onPin?: () => void;
  onMute?: () => void; onUnmute?: () => void;
  onCamOff?: () => void; onCamOn?: () => void;
  onKick?: () => void; onBan?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    (videoRef as any).current = el;
    if (el && participant.stream) {
      el.srcObject = participant.stream;
      el.muted = true;
      el.play().catch(() => {});
    }
  }, [participant.stream]);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [participant.stream]);

  const initials = participant.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const micOff   = participant.mutedByHost || !participant.hasAudio;
  const camOff   = participant.camOffByHost || !participant.hasVideo;

  return (
    <div className={`dr-tile ${isPinned ? "dr-tile-pinned" : ""} ${isLocalSelf ? "dr-tile-self" : ""} ${isSpeakerHighlight ? "dr-tile-speaking" : ""} ${participant.handRaised ? "dr-tile-hand" : ""}`}>
      <video ref={setVideoRef} autoPlay playsInline muted className="dr-tile-video"
        data-self={isLocalSelf ? "true" : undefined}
        style={{ display: camOff ? "none" : "block" }} />

      {camOff && (
        <div className="dr-tile-avatar">
          {participant.avatarUrl
            ? <img src={participant.avatarUrl} alt={participant.name} className="dr-tile-avatar-img" />
            : <><div className="dr-tile-avatar-ring" /><span className="dr-tile-initials">{initials}</span></>
          }
          {participant.mutedByHost  && <span className="dr-tile-blocked-badge">🔇</span>}
          {participant.camOffByHost && <span className="dr-tile-blocked-badge" style={{ right: 22 }}>📵</span>}
        </div>
      )}

      {isSpeakerHighlight && <div className="tile-speaking-badge">🎙️ Hablando</div>}
      {participant.handRaised && !isSpeakerHighlight && <div className="tile-hand-badge">✋</div>}
      {participant.shadowMuted && <div className="tile-shadow-badge">👻</div>}

      <div className="dr-tile-info">
        <div className="dr-tile-info-left">
          {participant.isHost   && <span className="dr-host-badge">HOST</span>}
          {participant.isCohost && <span className="dr-cohost-badge">MOD</span>}
          {participant.role === "streamer" && !participant.isHost && !participant.isCohost && <span className="dr-streamer-badge">STR</span>}
          {isLocalSelf && <span className="dr-you-badge">TÚ</span>}
          {participant.avatarUrl && <img src={participant.avatarUrl} alt="" className="dr-tile-name-avatar" />}
          <span className="dr-tile-name">{participant.name}</span>
        </div>
        <div className="dr-tile-icons">
          <span className={micOff ? "dr-icon-off" : "dr-icon-on"}>🎙️</span>
          <span className={camOff ? "dr-icon-off" : "dr-icon-on"}>📹</span>
        </div>
      </div>

      <button className={`dr-pin-btn ${isPinned ? "active" : ""}`} onClick={onPin}
        title={isPinned ? "Desfijar" : "Fijar"}>{isPinned ? "📌" : "📍"}</button>

      {canModerate && !participant.isHost && !isLocalSelf && (
        <div className="dr-menu-wrap">
          <button className="dr-menu-btn" onClick={() => setMenuOpen(o => !o)}>⋯</button>
          {menuOpen && (
            <div className="dr-menu-dropdown" onMouseLeave={() => setMenuOpen(false)}>
              {participant.mutedByHost
                ? <button onClick={() => { onUnmute?.(); setMenuOpen(false); }}>🔊 Activar mic</button>
                : <button onClick={() => { onMute?.();   setMenuOpen(false); }}>🔇 Silenciar</button>
              }
              {participant.camOffByHost
                ? <button onClick={() => { onCamOn?.();  setMenuOpen(false); }}>📹 Act. cámara</button>
                : <button onClick={() => { onCamOff?.(); setMenuOpen(false); }}>📵 Apagar cámara</button>
              }
              <div className="dr-menu-divider" />
              <button onClick={() => { onKick?.(); setMenuOpen(false); }}>🚪 Expulsar</button>
              <button className="dr-menu-ban" onClick={() => { onBan?.(); setMenuOpen(false); }}>🚫 Banear permanente</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

function ChatPanel({ messages, onSend, onClose, userId, enabled }: {
  messages: ChatMessage[]; onSend: (t: string) => void;
  onClose: () => void; userId: string; enabled: boolean;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const handleSend = () => { const t = input.trim(); if (!t) return; onSend(t); setInput(""); };

  return (
    <div className="dr-chat">
      <div className="dr-chat-header">
        <div className="dr-chat-header-left"><div className="dr-chat-dot" /><span>Chat en vivo</span></div>
        <button onClick={onClose} className="dr-chat-close">✕</button>
      </div>
      <div className="dr-chat-messages">
        {messages.length === 0 && <div className="dr-chat-empty">Todavía no hay mensajes</div>}
        {messages.map(m => (
          <div key={m.id} className={`dr-chat-msg ${m.userId === userId ? "own" : ""}`}>
            <span className="dr-chat-author">{m.userId === userId ? "Tú" : m.userName}</span>
            <span className="dr-chat-text">{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {enabled ? (
        <div className="dr-chat-input-row">
          <input className="dr-chat-input" placeholder="Escribir..." value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} maxLength={300} />
          <button className="dr-chat-send" onClick={handleSend}>→</button>
        </div>
      ) : (
        <div className="dr-chat-disabled">💬 Chat desactivado por el host</div>
      )}
    </div>
  );
}

// ─── CreateRoomModal ──────────────────────────────────────────────────────────

function CreateRoomModal({ hostId, hostName, hostRole, onClose, onCreated }: {
  hostId: string; hostName: string; hostRole: string;
  onClose: () => void; onCreated: (r: Room) => void;
}) {
  const { createRoom } = useRooms();
  const [title, setTitle]      = useState("");
  const [description, setDesc] = useState("");
  const [tags, setTags]        = useState<Tag[]>([]);
  const [maxPeople, setMax]    = useState<number | "">(10);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState("");

  const toggleTag = (tag: Tag) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 4));

  const handleCreate = async () => {
    if (!title.trim()) { setError("El título es obligatorio"); return; }
    if (tags.length === 0) { setError("Elegí al menos un tema"); return; }
    const cap = (maxPeople as number) || 2;
    if (cap < 2) { setError("La capacidad mínima es 2"); return; }
    setError(""); setLoading(true);
    try {
      const room = await createRoom({
        title: title.trim(), description: description.trim(), tags,
        max_people: Math.min(cap, MAX_ROOM_CAPACITY),
        host_id: hostId, host_name: hostName, host_role: hostRole,
      });
      onCreated(room);
    } catch (e: any) { setError(e.message ?? "Error al crear la sala"); }
    finally { setLoading(false); }
  };

  return (
    <div className="crm-overlay" onClick={onClose}>
      <div className="crm-sheet" onClick={e => e.stopPropagation()}>
        <div className="crm-beam" /><div className="crm-beam-glow" />
        <div className="crm-header">
          <div className="crm-header-left">
            <div className="crm-crown-wrap">
              <div className="crm-crown-ring" />
              <span className="crm-crown-icon">{hostRole === "vip" ? "💎" : "👑"}</span>
            </div>
            <div>
              <p className="crm-eyebrow">{hostRole === "vip" ? "Exclusivo para VIP" : "Exclusivo para Streamer"}</p>
              <h2 className="crm-title">Crear debate</h2>
            </div>
          </div>
          <button className="crm-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="crm-body">
          <div className="crm-field">
            <label className="crm-label">Título <span className="crm-required">*</span></label>
            <div className="crm-input-wrap">
              <input className="crm-input" placeholder="¿De qué van a debatir?" value={title}
                onChange={e => setTitle(e.target.value)} maxLength={80} autoFocus />
              <span className="crm-char-count">{title.length}/80</span>
            </div>
          </div>
          <div className="crm-field">
            <label className="crm-label">Descripción <span className="crm-hint">opcional</span></label>
            <div className="crm-input-wrap">
              <textarea className="crm-input crm-textarea" placeholder="Contexto, reglas del debate..."
                value={description} onChange={e => setDesc(e.target.value)} maxLength={280} rows={3} />
              <span className="crm-char-count crm-char-count-ta">{description.length}/280</span>
            </div>
          </div>
          <div className="crm-field">
            <label className="crm-label">Tema <span className="crm-required">*</span><span className="crm-hint"> hasta 4</span></label>
            <div className="crm-tags-grid">
              {ALL_TAGS.map(tag => (
                <button key={tag} type="button" className={`crm-tag ${tags.includes(tag) ? "crm-tag-on" : ""}`}
                  onClick={() => toggleTag(tag)}>
                  {tags.includes(tag) && <span className="crm-tag-check">✓</span>}{tag}
                </button>
              ))}
            </div>
          </div>
          <div className="crm-field">
            <label className="crm-label">Capacidad <span className="crm-hint">2–{MAX_ROOM_CAPACITY} personas</span></label>
            <div className="crm-capacity-row">
              <div className="crm-number-wrap">
                <button className="crm-num-btn" type="button" onClick={() => setMax(p => Math.max(2, (p || 2) - 1))}>−</button>
                <input className="crm-number-input" type="number" min={2} max={MAX_ROOM_CAPACITY} value={maxPeople}
                  onChange={e => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) setMax(Math.min(MAX_ROOM_CAPACITY, Math.max(2, n))); }} />
                <button className="crm-num-btn" type="button" onClick={() => setMax(p => Math.min(MAX_ROOM_CAPACITY, (p || 2) + 1))}>+</button>
              </div>
              <div className="crm-capacity-presets">
                {[2,5,10,20].map(n => (
                  <button key={n} type="button" className={`crm-preset ${maxPeople === n ? "crm-preset-on" : ""}`}
                    onClick={() => setMax(n)}>{n}</button>
                ))}
              </div>
            </div>
            <p className="crm-capacity-note">Máximo {MAX_ROOM_CAPACITY} participantes con video.</p>
          </div>
          {error && (
            <div className="crm-error">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#f87171" strokeWidth="1.4"/>
                <path d="M7 4v3.5M7 9.5v.5" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}
        </div>
        <div className="crm-footer">
          <button className="crm-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="crm-btn-create" onClick={handleCreate} disabled={loading}>
            {loading
              ? <span className="crm-loading-dots"><span /><span /><span /></span>
              : <><span>Iniciar sala</span><span className="crm-arrow">→</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LockedModal ──────────────────────────────────────────────────────────────

function LockedModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="crm-overlay" onClick={onClose}>
      <div className="crm-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="crm-beam" style={{ background: "linear-gradient(90deg,rgba(251,191,36,0.6),transparent)" }} />
        <div className="crm-header">
          <div className="crm-header-left">
            <div className="crm-crown-wrap" style={{ background: "rgba(251,191,36,0.08)" }}>
              <div className="crm-crown-ring" /><span className="crm-crown-icon">🔒</span>
            </div>
            <div>
              <p className="crm-eyebrow">Función premium</p>
              <h2 className="crm-title">Solo VIP / Streamer</h2>
            </div>
          </div>
          <button className="crm-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="crm-body" style={{ gap: 14 }}>
          <p style={{ color: "rgba(180,215,240,0.65)", fontSize: 14, lineHeight: 1.6 }}>
            Crear salas de debate es exclusivo para usuarios con rango <strong style={{ color: "#fbbf24" }}>VIP</strong> o <strong style={{ color: "#54c7f8" }}>Streamer</strong>.
          </p>
          <p style={{ color: "rgba(180,215,240,0.4)", fontSize: 13 }}>Los viewers pueden unirse a cualquier sala activa de forma gratuita.</p>
          <div className="crm-locked-badges">
            <div className="crm-locked-badge crm-locked-vip">💎 VIP</div>
            <div className="crm-locked-badge crm-locked-streamer">👑 Streamer</div>
          </div>
        </div>
        <div className="crm-footer" style={{ justifyContent: "center" }}>
          <button className="crm-btn-cancel" style={{ minWidth: 120 }} onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  );
}

// ─── RoomCard ─────────────────────────────────────────────────────────────────

function RoomCard({ room, userId, onJoin }: { room: Room; userId: string; onJoin: (r: Room) => void }) {
  const pct  = Math.round((room.participant_count / room.max_people) * 100);
  const full = room.participant_count >= room.max_people;
  const [banned, setBanned]        = useState(false);
  const [checkingBan, setChecking] = useState(false);

  const handleJoin = useCallback(async () => {
    if (full || checkingBan) return;
    setChecking(true);
    const isBanned = await checkBan(room.id, userId);
    setChecking(false);
    if (isBanned) { setBanned(true); return; }
    onJoin(room);
  }, [full, checkingBan, room, userId, onJoin]);

  return (
    <div className="dr-card" onClick={handleJoin}>
      <div className="dr-card-orb" /><div className="dr-card-shimmer" />
      <div className="dr-card-body">
        <div className="dr-card-top">
          <div className="dr-live-pill"><span className="dr-live-dot" /><span className="dr-live-label">EN VIVO</span></div>
          <div className="dr-card-host-info">
            <span className="dr-card-role-badge">
              <span className="dr-role-crown">{room.host_role === "vip" ? "💎" : "👑"}</span>
              {room.host_role === "vip" ? "VIP" : "STREAMER"}
            </span>
            <span className="dr-card-host-name">{room.host_name}</span>
          </div>
        </div>
        <h3 className="dr-card-title">{room.title}</h3>
        {room.description && <p className="dr-card-desc">{room.description}</p>}
        <div className="dr-card-tags">{room.tags.map(t => <TagBadge key={t} tag={t} />)}</div>
      </div>
      <div className="dr-card-footer">
        <div className="dr-capacity">
          <div className="dr-capacity-header">
            <span className="dr-capacity-icon">👥</span>
            <span className="dr-capacity-label">{room.participant_count} / {room.max_people}{full ? " · LLENA" : ""}</span>
          </div>
          <div className="dr-capacity-bar">
            <div className="dr-capacity-fill" style={{ width:`${pct}%`, background: full ? "linear-gradient(90deg,#f87171,#fb923c)" : "linear-gradient(90deg,#54c7f8,#3b9eda)" }} />
            <div className="dr-capacity-glow" style={{ width:`${pct}%`, opacity: full ? 0 : 1 }} />
          </div>
        </div>
        {banned ? (
          <div className="dr-banned-msg">🚫 Estás baneado de esta sala</div>
        ) : !full ? (
          <button className="dr-join-btn" disabled={checkingBan}>
            <span>{checkingBan ? "Verificando..." : "Unirse"}</span>
            {!checkingBan && <span className="dr-join-arrow">→</span>}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── RoomView ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// RoomView (CORREGIDO para debates + useDebateMedia final)
// Reemplazá tu función RoomView por esta completa
// ─────────────────────────────────────────────────────────────────────────────

function RoomView({
  room, currentUserId, currentUserName, currentUserAvatarUrl,
  currentUserRole, onLeave, closeRoom, setCount,
  // socket eliminado
}: {
   room: Room;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl: string | null;
  currentUserRole: "streamer" | "viewer";
  onLeave: () => void;
  closeRoom: (id: string) => Promise<void>;
  setCount: (id: string, n: number) => Promise<void>;
}) {
  const { socket } = useSocket(); 
  const isHost = room.host_id === currentUserId;

  const [toasts, setToasts] = useState<
    { id: string; msg: string; type: "info" | "warn" | "error" }[]
  >([]);

  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [hostPanelOpen, setHostPanelOpen] = useState(isHost);
  const [handRaised, setHandRaised] = useState(false);

  const selfVideoRef = useRef<HTMLVideoElement>(null);

  const toast = useCallback(
    (
      msg: string,
      type: "info" | "warn" | "error" = "info"
    ) => {
      const id = Date.now().toString();
      setToasts((p) => [...p, { id, msg, type }]);
    },
    []
  );

  const {
    participants,
    localStream,

    videoOn,
    audioOn,

    blockedByHost,

    presenceCount,
    chatMessages,

    stopMedia,
    toggleVideo,
    toggleAudio,
    sendChat,
    notifyRoomClosed,

    muteParticipant,
    unmuteParticipant,
    camOffParticipant,
    camOnParticipant,
    kickParticipant,
    banParticipant,
    muteAll,

    tempMuteParticipant,
    shadowMuteParticipant,

    cohosts,
    hostId,
    assignCohost,
    transferHost,

    roomSettings,
    updateSettings,
    setRoomMode,

    speakQueue,
    currentSpeaker,
    speakEndsAt,

    requestSpeak,
    approveSpeak,
    rejectSpeak,
    cutSpeaker,
    extendSpeakTime,

    raisedHands,
    raiseHand,

    activeVote,
    startVote,
    castVote,

    modLogs,
    tempMutes,
  } = useDebateMedia(
    room.id,
    isHost,
    currentUserId,
    currentUserName,
    currentUserAvatarUrl,
    currentUserRole,
    toast
  );

  const canModerate =
    isHost || cohosts.has(currentUserId);

  // ─────────────────────────
  // sync count
  // ─────────────────────────
  useEffect(() => {
    setCount(room.id, presenceCount);
  }, [presenceCount, room.id, setCount]);

  // ─────────────────────────
  // create backend debate room
  // ─────────────────────────
  useEffect(() => {
    if (!isHost || !socket?.connected) return;

    socket.emit("debate-create-room", {
      roomId:    room.id,
      hostName:  currentUserName,
      avatarUrl: currentUserAvatarUrl,
      maxPeople: room.max_people,
    });
  }, [
    isHost,
    socket,
    room.id,
    room.max_people,
    currentUserId,
    currentUserName,      // ← faltaba
    currentUserAvatarUrl, // ← faltaba
  ]);

  // ─────────────────────────
  // host unload cleanup
  // ─────────────────────────
  useEffect(() => {
    if (!isHost) return;

    const unload = () => {
      socket?.emit("debate-close-room", {
        roomId: room.id,
      });
    };

    window.addEventListener(
      "beforeunload",
      unload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        unload
      );
    };
  }, [isHost, room.id, socket]);

  // ─────────────────────────
  // local stream preview
  // ─────────────────────────
  useEffect(() => {
    if (
      selfVideoRef.current &&
      localStream
    ) {
      selfVideoRef.current.srcObject =
        localStream;
    }
  }, [localStream]);

  // ─────────────────────────
  // shortcuts
  // ─────────────────────────
  useEffect(() => {
    if (!canModerate) return;

    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof
          HTMLTextAreaElement
      )
        return;

      if (e.ctrlKey && e.key === "m") {
        muteAll(true);
        e.preventDefault();
      }

      if (e.ctrlKey && e.key === "u") {
        muteAll(false);
        e.preventDefault();
      }

      if (e.ctrlKey && e.key === "p") {
        setHostPanelOpen((p) => !p);
        e.preventDefault();
      }
    };

    window.addEventListener(
      "keydown",
      key
    );

    return () =>
      window.removeEventListener(
        "keydown",
        key
      );
  }, [canModerate, muteAll]);

  // ─────────────────────────
  // leave
  // ─────────────────────────
  const handleLeave =
    useCallback(async () => {
      if (isHost) {
        notifyRoomClosed();
        await closeRoom(room.id);

        socket?.emit(
          "debate-close-room",
          {
            roomId: room.id,
          }
        );
      }

      stopMedia();
      onLeave();
    }, [
      isHost,
      room.id,
      closeRoom,
      socket,
      stopMedia,
      onLeave,
      notifyRoomClosed,
    ]);

  const togglePin =
    useCallback((id: string) => {
      setPinnedId((p) =>
        p === id ? null : id
      );
    }, []);

  const handleRaiseHand =
    useCallback(() => {
      const next = !handRaised;

      setHandRaised(next);
      raiseHand(next);

      if (next && !canModerate) {
        requestSpeak();
      }
    }, [
      handRaised,
      raiseHand,
      canModerate,
      requestSpeak,
    ]);

  // ─────────────────────────
  // self participant
  // ─────────────────────────
  const selfParticipant =
    useMemo(
      (): Participant => ({
        id: currentUserId,
        name: currentUserName,
        avatarUrl:
          currentUserAvatarUrl,
        role: currentUserRole,

        hasVideo: videoOn,
        hasAudio: audioOn,

        mutedByHost:
          blockedByHost.mic,
        camOffByHost:
          blockedByHost.cam,

        isHost,
        isCohost:
          cohosts.has(
            currentUserId
          ),

        isSpeaking:
          currentSpeaker ===
          currentUserId,

        handRaised,

        shadowMuted: false,
        tempMutedUntil: null,

        stream:
          localStream ??
          undefined,
      }),
      [
        currentUserId,
        currentUserName,
        currentUserAvatarUrl,
        currentUserRole,
        videoOn,
        audioOn,
        blockedByHost,
        isHost,
        cohosts,
        currentSpeaker,
        handRaised,
        localStream,
      ]
    );

  const allParticipants =
    useMemo(
      () => [
        selfParticipant,
        ...participants,
      ],
      [
        selfParticipant,
        participants,
      ]
    );

  const pinned =
    pinnedId
      ? allParticipants.find(
          (p) =>
            p.id === pinnedId
        )
      : null;

  const visible =
    pinned
      ? allParticipants.filter(
          (p) =>
            p.id !== pinned.id
        )
      : allParticipants;

  const { cols } =
    gridLayout(visible.length);

  // ─────────────────────────
  // render
  // ─────────────────────────
  return (
    <div className="dr-room-view">
      {/* TOASTS */}
      <div className="dr-toasts-stack">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.msg}
            type={t.type}
            onDone={() =>
              setToasts((p) =>
                p.filter(
                  (x) =>
                    x.id !== t.id
                )
              )
            }
          />
        ))}
      </div>

      {/* HEADER */}
      <div className="dr-room-header">
        <div className="dr-room-meta">
          <span className="dr-live-dot" />
          <span>
            {room.title}
          </span>
        </div>

        <div className="dr-room-header-right">
          <span>
            {presenceCount}/
            {room.max_people}
          </span>

          <button
            onClick={() =>
              setChatOpen(
                (p) => !p
              )
            }
          >
            💬
          </button>

          <button
            onClick={
              handleLeave
            }
          >
            {isHost
              ? "Cerrar sala"
              : "Salir"}
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="dr-room-body">
        <div
          className={`dr-room-content ${
            hostPanelOpen &&
            canModerate
              ? "with-panel"
              : ""
          }`}
        >
          {/* VIDEO AREA */}
          <div className="dr-video-area">
            {pinned && (
              <div className="dr-pinned-stage">
                <VideoTile
                  participant={
                    pinned
                  }
                  isPinned
                  isLocalSelf={
                    pinned.id ===
                    currentUserId
                  }
                  canModerate={
                    canModerate
                  }
                  isSpeakerHighlight={
                    currentSpeaker ===
                    pinned.id
                  }
                  onPin={() =>
                    togglePin(
                      pinned.id
                    )
                  }
                  onMute={() =>
                    muteParticipant(
                      pinned.id
                    )
                  }
                  onUnmute={() =>
                    unmuteParticipant(
                      pinned.id
                    )
                  }
                  onCamOff={() =>
                    camOffParticipant(
                      pinned.id
                    )
                  }
                  onCamOn={() =>
                    camOnParticipant(
                      pinned.id
                    )
                  }
                  onKick={() =>
                    kickParticipant(
                      pinned.id
                    )
                  }
                  onBan={() =>
                    banParticipant(
                      pinned.id
                    )
                  }
                />
              </div>
            )}

            <div
              className="dr-meet-grid"
              style={
                {
                  "--grid-cols":
                    cols,
                } as React.CSSProperties
              }
            >
              {visible.map((p) => (
                <VideoTile
                  key={p.id}
                  participant={
                    p
                  }
                  isLocalSelf={
                    p.id ===
                    currentUserId
                  }
                  canModerate={
                    canModerate
                  }
                  isSpeakerHighlight={
                    currentSpeaker ===
                    p.id
                  }
                  onPin={() =>
                    togglePin(
                      p.id
                    )
                  }
                  onMute={() =>
                    muteParticipant(
                      p.id
                    )
                  }
                  onUnmute={() =>
                    unmuteParticipant(
                      p.id
                    )
                  }
                  onCamOff={() =>
                    camOffParticipant(
                      p.id
                    )
                  }
                  onCamOn={() =>
                    camOnParticipant(
                      p.id
                    )
                  }
                  onKick={() =>
                    kickParticipant(
                      p.id
                    )
                  }
                  onBan={() =>
                    banParticipant(
                      p.id
                    )
                  }
                />
              ))}
            </div>
          </div>

          {/* HOST PANEL */}
          {hostPanelOpen &&
            canModerate && (
              <HostPanel
                allParticipants={
                  allParticipants
                }
                speakQueue={
                  speakQueue
                }
                raisedHands={
                  raisedHands
                }
                currentSpeaker={
                  currentSpeaker
                }
                speakEndsAt={
                  speakEndsAt
                }
                cohosts={
                  cohosts
                }
                roomSettings={
                  roomSettings
                }
                modLogs={
                  modLogs
                }
                tempMutes={
                  tempMutes
                }
                activeVote={
                  activeVote
                }
                hostId={hostId}
                userId={
                  currentUserId
                }
                onMute={
                  muteParticipant
                }
                onUnmute={
                  unmuteParticipant
                }
                onCamOff={
                  camOffParticipant
                }
                onCamOn={
                  camOnParticipant
                }
                onKick={
                  kickParticipant
                }
                onBan={
                  banParticipant
                }
                onTempMute={
                  tempMuteParticipant
                }
                onShadowMute={
                  shadowMuteParticipant
                }
                onApprove={
                  approveSpeak
                }
                onReject={
                  rejectSpeak
                }
                onCut={
                  cutSpeaker
                }
                onExtend={
                  extendSpeakTime
                }
                onMuteAll={
                  muteAll
                }
                onSetMode={
                  setRoomMode
                }
                onUpdateSettings={
                  updateSettings
                }
                onAssignCohost={
                  assignCohost
                }
                onTransferHost={
                  transferHost
                }
                onStartVote={
                  startVote
                }
                onCastVote={
                  castVote
                }
              />
            )}
        </div>

        {/* CHAT */}
        {chatOpen && (
          <ChatPanel
            messages={
              chatMessages
            }
            onSend={
              sendChat
            }
            onClose={() =>
              setChatOpen(
                false
              )
            }
            userId={
              currentUserId
            }
            enabled={
              roomSettings.chatEnabled
            }
          />
        )}
      </div>

      {/* SELF PIP */}
      <div className="dr-self-pip">
        <video
          ref={selfVideoRef}
          autoPlay
          playsInline
          muted
        />

        <span>
          {currentUserName}
        </span>
      </div>

      {/* CONTROLS */}
      <div className="dr-controls">
        <button
          onClick={
            toggleAudio
          }
        >
          {audioOn
            ? "🎙️"
            : "🔇"}
        </button>

        <button
          onClick={
            toggleVideo
          }
        >
          {videoOn
            ? "📹"
            : "📵"}
        </button>

        {!canModerate && (
          <button
            onClick={
              handleRaiseHand
            }
          >
            {handRaised
              ? "✋"
              : "🙋"}
          </button>
        )}

        {currentSpeaker ===
          currentUserId &&
          speakEndsAt && (
            <SpeakTimer
              endsAt={
                speakEndsAt
              }
            />
          )}

        <button
          onClick={() =>
            setChatOpen(
              (p) => !p
            )
          }
        >
          💬
        </button>

        {canModerate && (
          <button
            onClick={() =>
              setHostPanelOpen(
                (p) => !p
              )
            }
          >
            👑
          </button>
        )}
      </div>
    </div>
  );
}
// ─── Página principal ─────────────────────────────────────────────────────────

export default function DebateRoomsPage() {
  const router  = useRouter();

  const { profile, profileReady } = useProfile();
  const { socket } = useSocket();

  const userId:   string = profile?.id   ?? "";

  const userRole: "viewer" | "vip" | "streamer" =
    (profile?.role as "viewer" | "vip" | "streamer") ?? "viewer";
  const canCreate = CAN_CREATE_ROLES.includes(userRole);
  const mediaRole: "streamer"|"viewer" = userRole === "streamer" ? "streamer" : "viewer";

  const [profileData, setProfileData] = useState<{ name: string; avatarUrl: string | null }>({ name: "Usuario", avatarUrl: null });
  useEffect(() => { if (!userId) return; fetchProfile(userId).then(setProfileData); }, [userId]);

  const userName      = profileData.name;
  const userAvatarUrl = profileData.avatarUrl;

  const { rooms, loading, closeRoom, setCount } = useRooms();
  const [activeRoom,  setActiveRoom]  = useState<Room | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [showLocked,  setShowLocked]  = useState(false);
  const [filterTag,   setFilterTag]   = useState<Tag | null>(null);
  const [search,      setSearch]      = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (!data.user) router.push("/"); });
  }, [router]);

  const filteredRooms = useMemo(() => rooms.filter(r => {
    const matchTag    = !filterTag || r.tags.includes(filterTag);
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  }), [rooms, filterTag, search]);

  const handleCreateClick = useCallback(() => {
    if (canCreate) setShowCreate(true); else setShowLocked(true);
  }, [canCreate]);

  if (!profileReady) return null;

  if (activeRoom) {
    return (
      <><GlobalStyles />
        <div className="dr-root">
          <div className="dr-aurora" /><div className="dr-flag" />
          <RoomView
            room={activeRoom}
            currentUserId={userId}
            currentUserName={userName}
            currentUserAvatarUrl={userAvatarUrl}
            currentUserRole={mediaRole}
            onLeave={() => setActiveRoom(null)}
            closeRoom={closeRoom}
            setCount={setCount}
          />
        </div>
      </>
    );
  }

  return (
    <><GlobalStyles />
      {showCreate && canCreate && (
        <CreateRoomModal hostId={userId} hostName={userName} hostRole={userRole}
          onClose={() => setShowCreate(false)}
          onCreated={room => { setShowCreate(false); setActiveRoom(room); }} />
      )}
      {showLocked && <LockedModal onClose={() => setShowLocked(false)} />}
      <div className="dr-root">
        <div className="dr-aurora" /><div className="dr-flag" />
        <header className="dr-header">
          <div className="dr-logo-full">
            <div className="dr-logo-icon-wrap">
              <div className="dr-logo-icon-halo" />
              <img src={logoImg.src} alt="Turrinder logo" className="dr-logo-img-clean" />
            </div>
            <div className="dr-logo-text-group">
              <div className="dr-logo-wordmark">Turr<em>inder</em></div>
              <div className="dr-logo-section-tag"><span className="dr-section-dot" />Debates</div>
            </div>
          </div>
          <div className="dr-header-right">
            {userAvatarUrl && <img src={userAvatarUrl} alt={userName} className="dr-header-avatar" />}
            <div className="dr-role-badge" data-role={userRole}>
              {userRole === "streamer" ? "👑 Streamer" : userRole === "vip" ? "💎 VIP" : "👁 Viewer"}
            </div>
            <button className={`dr-create-btn ${!canCreate ? "dr-create-btn-locked" : ""}`}
              onClick={handleCreateClick}
              title={canCreate ? "Crear una sala de debate" : "Función exclusiva para VIP y Streamer"}>
              <span className="dr-create-btn-plus">{canCreate ? "+" : "🔒"}</span>
              <span>Crear sala</span>
            </button>
          </div>
        </header>

        <div className="dr-filters">
          <div className="dr-search-wrap">
            <svg className="dr-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input className="dr-search" placeholder="Buscar debate..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="dr-filter-tags">
            <button className={`dr-filter-tag ${!filterTag ? "active" : ""}`} onClick={() => setFilterTag(null)}>Todos</button>
            {ALL_TAGS.map(tag => (
              <button key={tag} className={`dr-filter-tag ${filterTag === tag ? "active" : ""}`}
                onClick={() => setFilterTag(prev => prev === tag ? null : tag)}>{tag}</button>
            ))}
          </div>
        </div>

        <main className="dr-main">
          {loading ? (
            <div className="dr-loading">
              <div className="dr-spinner-wrap"><div className="dr-spinner" /><div className="dr-spinner-inner" /></div>
              <span>Cargando salas...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="dr-empty">
              <div className="dr-empty-orb" />
              <div className="dr-empty-icon"><img src={debatesImg.src} alt="Sin debates" className="dr-empty-debates-img" /></div>
              <h3>No hay debates activos</h3>
              <p>{canCreate ? "¡Creá la primera sala y empezá el debate!" : "Esperá a que un VIP o Streamer cree una sala."}</p>
              {canCreate && <button className="dr-empty-create-btn" onClick={handleCreateClick}>+ Crear primera sala</button>}
            </div>
          ) : (
            <div className="dr-rooms-grid">
              {filteredRooms.map(room => (
                <RoomCard key={room.id} room={room} userId={userId} onJoin={setActiveRoom} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ─── GlobalStyles ─────────────────────────────────────────────────────────────

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      .dr-root {
        --sky: #54c7f8; --sky2: #3b9eda; --sky3: #1a6fa8;
        --sky-glow: rgba(84,199,248,0.38); --white: #f5f8ff;
        --bg: #030a14; --bg2: #050f1e;
        --glass: rgba(84,199,248,0.04); --glass-b: rgba(84,199,248,0.11);
        --muted: rgba(180,215,240,0.45); --danger: #f87171;
        --warn: #fbbf24; --violet: #a78bfa; --green: #4ade80;
        min-height: 100dvh; height: 100dvh; max-height: 100dvh; display: flex; flex-direction: column; overflow: hidden;
        background: var(--bg); font-family: 'DM Sans', sans-serif;
        -webkit-font-smoothing: antialiased; color: var(--white); position: relative;
      }
      .dr-root::before {
        content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
        opacity: 0.25;
      }
      .dr-aurora { position:fixed; inset:0; pointer-events:none; z-index:0;
        background: radial-gradient(ellipse 80% 50% at 20% -10%, rgba(84,199,248,0.12) 0%, transparent 60%),
                    radial-gradient(ellipse 60% 40% at 80% 110%, rgba(59,158,218,0.09) 0%, transparent 60%); }
      .dr-flag { position:fixed; top:0; left:0; right:0; height:2px; z-index:1;
        background:linear-gradient(90deg,transparent,rgba(84,199,248,0.6),rgba(59,158,218,0.4),transparent); }

      /* ── HEADER ── */
      .dr-header { display:flex; align-items:center; justify-content:space-between; padding:14px 28px;
        border-bottom:1px solid rgba(84,199,248,0.07); position:relative; z-index:10;
        background:rgba(3,10,20,0.8); backdrop-filter:blur(12px); flex-shrink:0; }
      .dr-logo-full { display:flex; align-items:center; gap:14px; }
      .dr-logo-icon-wrap { position:relative; width:38px; height:38px; display:flex; align-items:center; justify-content:center; }
      .dr-logo-icon-halo { position:absolute; inset:-4px; border-radius:50%; background:radial-gradient(circle,rgba(84,199,248,0.18),transparent 70%); }
      .dr-logo-img-clean { width:34px; height:34px; border-radius:50%; object-fit:cover; position:relative; z-index:1; }
      .dr-logo-text-group { display:flex; flex-direction:column; gap:2px; }
      .dr-logo-wordmark { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; letter-spacing:-0.5px; color:#f0f6ff; line-height:1; }
      .dr-logo-wordmark em { font-style:italic; color:var(--sky); }
      .dr-logo-section-tag { display:flex; align-items:center; gap:5px; font-size:10px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:rgba(180,215,240,0.35); }
      .dr-section-dot { width:5px; height:5px; border-radius:50%; background:var(--sky); opacity:0.5; }
      .dr-header-right { display:flex; align-items:center; gap:10px; }
      .dr-header-avatar { width:32px; height:32px; border-radius:50%; object-fit:cover; border:1.5px solid rgba(84,199,248,0.25); }
      .dr-role-badge { font-size:11px; font-weight:600; padding:5px 12px; border-radius:100px; background:rgba(84,199,248,0.07); border:1px solid rgba(84,199,248,0.15); color:rgba(180,215,240,0.6); }
      .dr-role-badge[data-role="streamer"] { border-color:rgba(251,191,36,0.3); color:#fbbf24; background:rgba(251,191,36,0.07); }
      .dr-role-badge[data-role="vip"]      { border-color:rgba(167,139,250,0.3); color:#a78bfa; background:rgba(167,139,250,0.07); }
      .dr-create-btn { display:flex; align-items:center; gap:6px; padding:9px 18px; border-radius:12px; border:1px solid rgba(84,199,248,0.3); background:rgba(84,199,248,0.08); color:var(--sky); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif; }
      .dr-create-btn:hover { background:rgba(84,199,248,0.15); border-color:rgba(84,199,248,0.55); box-shadow:0 0 20px rgba(84,199,248,0.18); }
      .dr-create-btn-locked { border-color:rgba(251,191,36,0.2); background:rgba(251,191,36,0.04); color:#fbbf24; }
      .dr-create-btn-plus { font-size:16px; font-weight:700; }

      /* ── FILTERS ── */
      .dr-filters { display:flex; flex-direction:column; gap:10px; padding:14px 28px 8px; border-bottom:1px solid rgba(84,199,248,0.05); position:relative; z-index:5; flex-shrink:0; }
      .dr-search-wrap { display:flex; align-items:center; gap:8px; background:rgba(84,199,248,0.03); border:1px solid rgba(84,199,248,0.08); border-radius:12px; padding:8px 14px; max-width:360px; }
      .dr-search-icon { color:rgba(180,215,240,0.3); flex-shrink:0; }
      .dr-search { background:none; border:none; outline:none; color:#e8f2ff; font-size:13px; font-family:'DM Sans',sans-serif; width:100%; }
      .dr-search::placeholder { color:rgba(180,215,240,0.22); }
      .dr-filter-tags { display:flex; gap:6px; flex-wrap:wrap; }
      .dr-filter-tag { font-size:11px; font-weight:500; padding:5px 13px; border-radius:100px; border:1px solid rgba(84,199,248,0.08); background:rgba(84,199,248,0.02); color:rgba(180,215,240,0.4); cursor:pointer; transition:all 0.15s; white-space:nowrap; }
      .dr-filter-tag:hover { border-color:rgba(84,199,248,0.2); color:rgba(180,215,240,0.75); }
      .dr-filter-tag.active { border-color:rgba(84,199,248,0.45); background:rgba(84,199,248,0.1); color:var(--sky); }

      /* ── MAIN ── */
      .dr-main { flex:1; overflow-y:auto; padding:20px 28px 40px; position:relative; z-index:2; }
      .dr-rooms-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(310px,1fr)); gap:16px; }

      /* ── ROOM CARD ── */
      .dr-card { border-radius:20px; background:rgba(4,12,26,0.92); border:1px solid rgba(84,199,248,0.09); cursor:pointer; display:flex; flex-direction:column; overflow:hidden; position:relative; transition:all 0.25s; box-shadow:0 4px 24px rgba(0,0,0,0.3); }
      .dr-card:hover { border-color:rgba(84,199,248,0.28); box-shadow:0 8px 40px rgba(84,199,248,0.1); transform:translateY(-2px); }
      .dr-card-orb { position:absolute; top:-30px; right:-30px; width:120px; height:120px; border-radius:50%; background:radial-gradient(circle,rgba(84,199,248,0.08),transparent 70%); pointer-events:none; }
      .dr-card-shimmer { position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(84,199,248,0.25),transparent); }
      .dr-card-body { padding:18px 18px 0; flex:1; }
      .dr-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
      .dr-live-pill { display:flex; align-items:center; gap:5px; background:rgba(74,222,128,0.08); border:1px solid rgba(74,222,128,0.2); border-radius:100px; padding:3px 9px; }
      .dr-live-dot { width:6px; height:6px; border-radius:50%; background:#4ade80; animation:dr-pulse 2s infinite; }
      .dr-live-label { font-size:9px; font-weight:700; letter-spacing:1.5px; color:#4ade80; }
      @keyframes dr-pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      .dr-card-host-info { display:flex; align-items:center; gap:6px; }
      .dr-card-role-badge { display:flex; align-items:center; gap:4px; font-size:9px; font-weight:700; letter-spacing:1.2px; padding:3px 8px; border-radius:6px; background:rgba(251,191,36,0.07); border:1px solid rgba(251,191,36,0.18); color:rgba(251,191,36,0.75); }
      .dr-role-crown { font-size:10px; }
      .dr-card-host-name { font-size:12px; color:rgba(180,215,240,0.4); font-weight:500; }
      .dr-card-title { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; letter-spacing:-0.3px; color:#f0f6ff; margin-bottom:8px; line-height:1.3; }
      .dr-card-desc { font-size:12px; color:rgba(180,215,240,0.4); margin-bottom:10px; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      .dr-card-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:14px; }
      .dr-tag { font-size:10px; font-weight:500; padding:3px 9px; border-radius:6px; border:1px solid rgba(84,199,248,0.12); background:rgba(84,199,248,0.04); color:rgba(180,215,240,0.5); cursor:default; }
      .dr-tag.selected { border-color:rgba(84,199,248,0.4); background:rgba(84,199,248,0.1); color:var(--sky); }
      .dr-card-footer { padding:14px 18px 18px; border-top:1px solid rgba(84,199,248,0.05); display:flex; flex-direction:column; gap:12px; }
      .dr-capacity { display:flex; flex-direction:column; gap:6px; }
      .dr-capacity-header { display:flex; align-items:center; gap:6px; }
      .dr-capacity-icon { font-size:12px; }
      .dr-capacity-label { font-size:11px; color:rgba(180,215,240,0.35); font-weight:500; }
      .dr-capacity-bar { position:relative; height:3px; background:rgba(84,199,248,0.06); border-radius:2px; overflow:hidden; }
      .dr-capacity-fill { height:100%; border-radius:2px; transition:width 0.5s; }
      .dr-capacity-glow { position:absolute; top:0; left:0; height:100%; border-radius:2px; background:linear-gradient(90deg,rgba(84,199,248,0.4),transparent); filter:blur(3px); }
      .dr-join-btn { display:flex; align-items:center; justify-content:center; gap:6px; width:100%; padding:10px; border-radius:12px; border:1px solid rgba(84,199,248,0.28); background:rgba(84,199,248,0.08); color:var(--sky); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif; }
      .dr-join-btn:hover { background:rgba(84,199,248,0.16); border-color:rgba(84,199,248,0.5); }
      .dr-join-arrow { font-size:16px; transition:transform 0.2s; }
      .dr-join-btn:hover .dr-join-arrow { transform:translateX(3px); }
      .dr-banned-msg { text-align:center; font-size:12px; color:var(--danger); padding:6px; }

      /* ── LOADING / EMPTY ── */
      .dr-loading { display:flex; flex-direction:column; align-items:center; gap:16px; padding:80px 20px; color:rgba(180,215,240,0.4); font-size:13px; }
      .dr-spinner-wrap { position:relative; width:44px; height:44px; }
      .dr-spinner { position:absolute; inset:0; border-radius:50%; border:2px solid rgba(84,199,248,0.1); border-top-color:var(--sky); animation:dr-spin 1s linear infinite; }
      .dr-spinner-inner { position:absolute; inset:8px; border-radius:50%; border:1.5px solid rgba(84,199,248,0.06); border-top-color:rgba(84,199,248,0.4); animation:dr-spin 0.7s linear infinite reverse; }
      @keyframes dr-spin { to{transform:rotate(360deg);} }
      .dr-empty { display:flex; flex-direction:column; align-items:center; gap:14px; padding:80px 20px; text-align:center; position:relative; }
      .dr-empty-orb { position:absolute; top:20px; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle,rgba(84,199,248,0.05),transparent 70%); }
      .dr-empty-icon { font-size:48px; position:relative; z-index:1; }
      .dr-empty-debates-img { width:80px; height:80px; object-fit:contain; opacity:0.7; }
      .dr-empty h3 { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#f0f6ff; }
      .dr-empty p { font-size:13px; color:rgba(180,215,240,0.4); max-width:320px; line-height:1.6; }
      .dr-empty-create-btn { padding:11px 26px; border-radius:14px; border:1px solid rgba(84,199,248,0.3); background:rgba(84,199,248,0.1); color:var(--sky); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif; }
      .dr-empty-create-btn:hover { background:rgba(84,199,248,0.18); box-shadow:0 0 20px rgba(84,199,248,0.15); }

      /* ── TOAST ── */
      .dr-toasts-stack { position:fixed; top:14px; right:14px; z-index:9999; display:flex; flex-direction:column; gap:8px; pointer-events:none; }
      .dr-toast { padding:10px 16px; border-radius:12px; font-size:13px; font-weight:500; line-height:1.4; backdrop-filter:blur(16px); animation:dr-fadein 0.25s ease; }
      .dr-toast-info  { background:rgba(84,199,248,0.18); border:1px solid rgba(84,199,248,0.3); color:#e8f6ff; }
      .dr-toast-warn  { background:rgba(251,191,36,0.15); border:1px solid rgba(251,191,36,0.35); color:#fef3c7; }
      .dr-toast-error { background:rgba(248,113,113,0.15); border:1px solid rgba(248,113,113,0.35); color:#fee2e2; }

      /* ── ROOM VIEW ── */
      .dr-room-view { display:flex; flex-direction:column; height:100dvh; overflow:hidden; position:relative; z-index:2; }
      .dr-room-header { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid rgba(84,199,248,0.07); background:rgba(3,10,20,0.9); backdrop-filter:blur(12px); flex-shrink:0; gap:10px; flex-wrap:wrap; }
      .dr-room-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0; }
      .dr-room-logo-mini { width:26px; height:26px; border-radius:8px; background:rgba(84,199,248,0.1); border:1px solid rgba(84,199,248,0.2); display:flex; align-items:center; justify-content:center; }
      .dr-room-logo-t { font-family:'Syne',sans-serif; font-size:14px; font-weight:800; color:var(--sky); }
      .dr-room-title-text { font-family:'Syne',sans-serif; font-size:15px; font-weight:800; letter-spacing:-0.3px; color:#f0f6ff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:260px; }
      .dr-room-tags { display:flex; gap:4px; flex-wrap:nowrap; overflow:hidden; }
      .dr-room-header-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
      .dr-room-count-pill { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:600; color:rgba(180,215,240,0.55); background:rgba(84,199,248,0.05); border:1px solid rgba(84,199,248,0.1); border-radius:100px; padding:4px 10px; }
      .dr-room-count-dot { width:5px; height:5px; border-radius:50%; background:#4ade80; animation:dr-pulse 2s infinite; }
      .dr-chat-toggle-btn { position:relative; width:36px; height:36px; border-radius:10px; border:1px solid rgba(84,199,248,0.15); background:rgba(84,199,248,0.06); color:rgba(180,215,240,0.6); cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
      .dr-chat-toggle-btn:hover { background:rgba(84,199,248,0.12); }
      .dr-chat-badge { position:absolute; top:-4px; right:-4px; width:16px; height:16px; border-radius:50%; background:var(--sky); color:#030a14; font-size:9px; font-weight:700; display:flex; align-items:center; justify-content:center; }
      .dr-leave-btn { padding:7px 14px; border-radius:10px; border:1px solid rgba(248,113,113,0.2); background:rgba(248,113,113,0.07); color:var(--danger); font-size:12px; font-weight:600; cursor:pointer; transition:all 0.18s; font-family:'DM Sans',sans-serif; white-space:nowrap; }
      .dr-leave-btn:hover { background:rgba(248,113,113,0.14); border-color:rgba(248,113,113,0.4); }
      .room-mode-badge { font-size:9px; font-weight:700; letter-spacing:1px; padding:3px 8px; border-radius:6px; }
      .room-mode-badge.strict { background:rgba(248,113,113,0.12); border:1px solid rgba(248,113,113,0.3); color:var(--danger); }
      .room-mode-badge.free   { background:rgba(74,222,128,0.1);  border:1px solid rgba(74,222,128,0.3);  color:#4ade80; }

      /* ── ROOM BODY / LAYOUT ── */
      .dr-room-body { flex:1; display:flex; overflow:hidden; position:relative; }
      .dr-room-content { display:flex; flex:1; overflow:hidden; }
      .dr-video-area { flex:1; display:flex; flex-direction:column; overflow:hidden; }
      .dr-meet-grid { flex:1; display:grid; gap:6px; padding:8px; overflow:hidden; grid-template-columns:repeat(var(--grid-cols,2), 1fr); align-content:center; }
      .dr-meet-grid.scrollable { overflow-y:auto; align-content:start; }
      .dr-pinned-layout { flex:1; display:flex; gap:6px; padding:8px; overflow:hidden; }
      .dr-pinned-stage { flex:1; min-width:0; }
      .dr-pinned-rail { width:160px; display:flex; flex-direction:column; gap:5px; overflow-y:auto; flex-shrink:0; }

      /* ── VIDEO TILE ── */
      .dr-tile { position:relative; border-radius:14px; background:#050d1a; border:1.5px solid rgba(84,199,248,0.08); overflow:hidden; aspect-ratio:16/9; display:flex; align-items:center; justify-content:center; transition:border-color 0.2s; }
      .dr-tile-pinned { border-color:rgba(84,199,248,0.3); box-shadow:0 0 30px rgba(84,199,248,0.1); aspect-ratio:16/9; height:100%; }
      .dr-tile-speaking { border-color:rgba(74,222,128,0.6)!important; box-shadow:0 0 24px rgba(74,222,128,0.2)!important; animation:tile-glow 1.5s ease-in-out infinite; }
      .dr-tile-hand { border-color:rgba(251,191,36,0.4)!important; }
      @keyframes tile-glow { 0%,100%{box-shadow:0 0 16px rgba(74,222,128,0.15);} 50%{box-shadow:0 0 32px rgba(74,222,128,0.35);} }
      .dr-tile-video { width:100%; height:100%; object-fit:cover; border-radius:12px; }
      .dr-tile-avatar { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column; background:radial-gradient(circle at 50% 40%,rgba(84,199,248,0.06),transparent 70%); }
      .dr-tile-avatar-img { width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid rgba(84,199,248,0.3); }
      .dr-tile-avatar-ring { position:absolute; width:72px; height:72px; border-radius:50%; border:1.5px solid rgba(84,199,248,0.18); }
      .dr-tile-initials { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:rgba(180,215,240,0.5); }
      .dr-tile-blocked-badge { position:absolute; bottom:28px; right:6px; font-size:11px; }
      .tile-speaking-badge { position:absolute; top:6px; right:6px; font-size:10px; font-weight:700; padding:3px 8px; border-radius:8px; background:rgba(74,222,128,0.2); border:1px solid rgba(74,222,128,0.4); color:#4ade80; }
      .tile-hand-badge { position:absolute; top:6px; right:6px; font-size:16px; padding:3px; border-radius:8px; background:rgba(251,191,36,0.15); }
      .tile-shadow-badge { position:absolute; top:6px; left:36px; font-size:13px; opacity:0.7; }
      .dr-tile-info { position:absolute; bottom:0; left:0; right:0; padding:6px 8px; background:linear-gradient(transparent,rgba(0,0,0,0.75)); display:flex; align-items:center; justify-content:space-between; }
      .dr-tile-info-left { display:flex; align-items:center; gap:4px; min-width:0; }
      .dr-host-badge { font-size:8px; font-weight:800; letter-spacing:1px; padding:2px 5px; border-radius:4px; background:rgba(251,191,36,0.2); border:1px solid rgba(251,191,36,0.4); color:#fbbf24; flex-shrink:0; }
      .dr-cohost-badge { font-size:8px; font-weight:800; letter-spacing:1px; padding:2px 5px; border-radius:4px; background:rgba(167,139,250,0.2); border:1px solid rgba(167,139,250,0.4); color:#a78bfa; flex-shrink:0; }
      .dr-streamer-badge { font-size:8px; font-weight:800; letter-spacing:1px; padding:2px 5px; border-radius:4px; background:rgba(84,199,248,0.15); border:1px solid rgba(84,199,248,0.35); color:var(--sky); flex-shrink:0; }
      .dr-you-badge { font-size:8px; font-weight:700; padding:2px 5px; border-radius:4px; background:rgba(74,222,128,0.12); border:1px solid rgba(74,222,128,0.3); color:#4ade80; flex-shrink:0; }
      .dr-tile-name-avatar { width:14px; height:14px; border-radius:50%; object-fit:cover; flex-shrink:0; }
      .dr-tile-name { font-size:11px; font-weight:600; color:rgba(240,246,255,0.88); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .dr-tile-icons { display:flex; gap:3px; flex-shrink:0; }
      .dr-icon-on  { font-size:11px; opacity:0.7; }
      .dr-icon-off { font-size:11px; opacity:0.25; filter:grayscale(1); }
      .dr-pin-btn { position:absolute; top:6px; left:6px; width:26px; height:26px; border-radius:7px; border:1px solid rgba(84,199,248,0.15); background:rgba(3,10,20,0.6); color:rgba(180,215,240,0.4); cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; opacity:0; pointer-events:none; }
      .dr-tile:hover .dr-pin-btn { opacity:1; pointer-events:all; }
      .dr-pin-btn.active { opacity:1; pointer-events:all; color:var(--sky); border-color:rgba(84,199,248,0.35); }
      .dr-menu-wrap { position:absolute; top:6px; right:6px; }
      .dr-menu-btn { width:28px; height:28px; border-radius:8px; border:1px solid rgba(84,199,248,0.15); background:rgba(3,10,20,0.7); color:rgba(180,215,240,0.6); cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; opacity:0; pointer-events:none; }
      .dr-tile:hover .dr-menu-btn { opacity:1; pointer-events:all; }
      .dr-menu-dropdown { position:absolute; top:34px; right:0; z-index:100; background:rgba(4,12,24,0.97); border:1px solid rgba(84,199,248,0.15); border-radius:12px; padding:6px; min-width:170px; box-shadow:0 8px 32px rgba(0,0,0,0.5); }
      .dr-menu-dropdown button { display:flex; align-items:center; gap:8px; width:100%; padding:8px 12px; background:none; border:none; color:rgba(180,215,240,0.75); font-size:12px; font-weight:500; cursor:pointer; border-radius:8px; transition:all 0.12s; font-family:'DM Sans',sans-serif; text-align:left; white-space:nowrap; }
      .dr-menu-dropdown button:hover { background:rgba(84,199,248,0.08); color:#e8f2ff; }
      .dr-menu-divider { height:1px; background:rgba(84,199,248,0.07); margin:4px 0; }
      .dr-menu-ban { color:var(--danger)!important; }
      .dr-menu-ban:hover { background:rgba(248,113,113,0.08)!important; }

      /* ── CHAT ── */
      .dr-chat { position:absolute; right:0; top:0; bottom:0; width:280px; z-index:50; background:rgba(3,10,22,0.97); border-left:1px solid rgba(84,199,248,0.09); display:flex; flex-direction:column; backdrop-filter:blur(16px); }
      .dr-chat-header { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid rgba(84,199,248,0.07); flex-shrink:0; font-size:13px; font-weight:600; color:rgba(180,215,240,0.7); }
      .dr-chat-header-left { display:flex; align-items:center; gap:7px; }
      .dr-chat-dot { width:7px; height:7px; border-radius:50%; background:#4ade80; animation:dr-pulse 2s infinite; }
      .dr-chat-close { background:none; border:none; cursor:pointer; color:rgba(180,215,240,0.35); font-size:14px; padding:2px 6px; border-radius:6px; transition:all 0.15s; }
      .dr-chat-close:hover { color:rgba(180,215,240,0.8); background:rgba(84,199,248,0.08); }
      .dr-chat-messages { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:10px; }
      .dr-chat-empty { font-size:12px; color:rgba(180,215,240,0.25); text-align:center; padding:20px 0; }
      .dr-chat-msg { display:flex; flex-direction:column; gap:3px; }
      .dr-chat-msg.own { align-items:flex-end; }
      .dr-chat-author { font-size:10px; font-weight:600; color:rgba(180,215,240,0.4); }
      .dr-chat-text { font-size:13px; color:rgba(240,246,255,0.85); background:rgba(84,199,248,0.06); border:1px solid rgba(84,199,248,0.1); padding:7px 11px; border-radius:10px; max-width:220px; word-break:break-word; line-height:1.45; }
      .dr-chat-msg.own .dr-chat-text { background:rgba(84,199,248,0.1); border-color:rgba(84,199,248,0.2); }
      .dr-chat-input-row { display:flex; gap:8px; padding:10px 12px; border-top:1px solid rgba(84,199,248,0.07); }
      .dr-chat-input { flex:1; background:rgba(84,199,248,0.04); border:1px solid rgba(84,199,248,0.1); border-radius:10px; padding:8px 12px; color:#e8f2ff; font-size:13px; font-family:'DM Sans',sans-serif; outline:none; }
      .dr-chat-input:focus { border-color:rgba(84,199,248,0.3); }
      .dr-chat-send { width:34px; height:34px; border-radius:10px; border:1px solid rgba(84,199,248,0.25); background:rgba(84,199,248,0.1); color:var(--sky); cursor:pointer; font-size:16px; transition:all 0.15s; display:flex; align-items:center; justify-content:center; }
      .dr-chat-send:hover { background:rgba(84,199,248,0.2); border-color:rgba(84,199,248,0.45); }
      .dr-chat-disabled { padding:10px 14px; font-size:12px; color:rgba(180,215,240,0.3); text-align:center; border-top:1px solid rgba(84,199,248,0.07); }

      /* ── CONTROLS ── */
      .dr-controls { display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 16px; border-top:1px solid rgba(84,199,248,0.07); background:rgba(3,10,20,0.9); backdrop-filter:blur(12px); flex-shrink:0; }
      .dr-ctrl-btn { width:42px; height:42px; border-radius:12px; border:1px solid rgba(84,199,248,0.15); background:rgba(84,199,248,0.06); color:rgba(180,215,240,0.6); cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
      .dr-ctrl-btn.active  { border-color:rgba(84,199,248,0.45); background:rgba(84,199,248,0.14); color:var(--sky); }
      .dr-ctrl-btn.off     { border-color:rgba(248,113,113,0.2); background:rgba(248,113,113,0.08); color:var(--danger); }
      .dr-ctrl-btn.neutral { border-color:rgba(84,199,248,0.1); background:rgba(84,199,248,0.04); }
      .dr-ctrl-btn:hover { transform:scale(1.06); }
      .dr-ctrl-blocked-warn { font-size:18px; opacity:0.7; }
      .dr-controls-timer { display:flex; align-items:center; }

      /* ── SELF PIP ── */
      .dr-self-pip { position:fixed; bottom:76px; right:14px; width:130px; z-index:60; border-radius:12px; overflow:hidden; border:1.5px solid rgba(84,199,248,0.2); background:#040c18; box-shadow:0 8px 32px rgba(0,0,0,0.5); }
      .dr-self-pip-video { width:100%; display:block; aspect-ratio:4/3; object-fit:cover; }
      .dr-self-pip-avatar { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#040c18; aspect-ratio:4/3; }
      .dr-self-pip-avatar-img { width:44px; height:44px; border-radius:50%; object-fit:cover; border:1.5px solid rgba(84,199,248,0.25); }
      .dr-self-pip-initials { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; color:rgba(180,215,240,0.4); }
      .dr-self-pip-info { padding:5px 8px; display:flex; align-items:center; justify-content:space-between; background:rgba(3,10,20,0.9); }
      .dr-self-pip-name { font-size:10px; font-weight:600; color:rgba(180,215,240,0.55); }
      .dr-self-pip-icons { display:flex; gap:3px; }
      .dr-room-desc-bar { display:flex; align-items:center; gap:8px; padding:7px 16px; border-top:1px solid rgba(84,199,248,0.06); font-size:12px; color:rgba(180,215,240,0.4); background:rgba(3,10,20,0.6); flex-shrink:0; }

      /* ── SPEAK TIMER ── */
      .speak-timer { display:flex; align-items:center; justify-content:center; }

      /* ── VOTE PANEL ── */
      .vote-panel { background:rgba(167,139,250,0.07); border:1px solid rgba(167,139,250,0.2); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:8px; }
      .vote-header { display:flex; align-items:center; gap:6px; }
      .vote-icon { font-size:14px; }
      .vote-question { font-size:12px; font-weight:600; color:rgba(180,215,240,0.8); flex:1; }
      .vote-timer { font-size:11px; color:rgba(167,139,250,0.7); font-weight:600; flex-shrink:0; }
      .vote-options { display:flex; gap:6px; }
      .vote-opt { flex:1; padding:8px 6px; border-radius:8px; border:1px solid; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:space-between; gap:4px; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
      .vote-opt.yes { border-color:rgba(74,222,128,0.3); background:rgba(74,222,128,0.07); color:#4ade80; }
      .vote-opt.yes:hover:not(:disabled) { background:rgba(74,222,128,0.15); }
      .vote-opt.yes.voted { background:rgba(74,222,128,0.2); }
      .vote-opt.no  { border-color:rgba(248,113,113,0.3); background:rgba(248,113,113,0.07); color:var(--danger); }
      .vote-opt.no:hover:not(:disabled) { background:rgba(248,113,113,0.14); }
      .vote-opt.no.voted { background:rgba(248,113,113,0.18); }
      .vote-opt:disabled { opacity:0.7; cursor:not-allowed; }
      .vote-count { font-size:10px; opacity:0.7; }

      /* ── HOST PANEL ── */
      .host-panel { width:296px; flex-shrink:0; display:flex; flex-direction:column; background:rgba(3,10,22,0.98); border-left:1px solid rgba(84,199,248,0.1); overflow:hidden; }
      .host-panel-header { padding:12px 14px 0; border-bottom:1px solid rgba(84,199,248,0.07); flex-shrink:0; }
      .host-panel-title { font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:rgba(180,215,240,0.35); display:block; margin-bottom:8px; }
      .host-panel-tabs { display:flex; gap:2px; }
      .host-tab { flex:1; padding:7px 4px; background:none; border:none; border-bottom:2px solid transparent; color:rgba(180,215,240,0.4); cursor:pointer; font-size:16px; transition:all 0.15s; position:relative; }
      .host-tab.active { border-bottom-color:var(--sky); color:var(--sky); }
      .host-tab:hover:not(.active) { color:rgba(180,215,240,0.7); }
      .host-tab-badge { position:absolute; top:2px; right:4px; min-width:14px; height:14px; border-radius:7px; background:var(--danger); color:#fff; font-size:8px; font-weight:700; padding:0 3px; display:flex; align-items:center; justify-content:center; }
      .host-panel-body { flex:1; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:8px; }

      /* Current speaker bar */
      .current-speaker-bar { background:rgba(74,222,128,0.07); border:1px solid rgba(74,222,128,0.2); border-radius:10px; padding:8px 10px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .current-speaker-info { display:flex; align-items:center; gap:6px; min-width:0; }
      .speaking-dot { width:8px; height:8px; border-radius:50%; background:#4ade80; animation:dr-pulse 1s infinite; flex-shrink:0; }
      .speaking-label { font-size:10px; color:rgba(74,222,128,0.7); font-weight:600; flex-shrink:0; }
      .speaking-name { font-size:12px; font-weight:700; color:#4ade80; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .current-speaker-actions { display:flex; gap:5px; flex-shrink:0; }
      .spk-btn { padding:4px 9px; border-radius:7px; border:none; cursor:pointer; font-size:11px; font-weight:700; font-family:'DM Sans',sans-serif; }
      .spk-btn.extend { background:rgba(84,199,248,0.1); color:var(--sky); }
      .spk-btn.cut    { background:rgba(248,113,113,0.1); color:var(--danger); }

      /* HP sections */
      .hp-section { display:flex; flex-direction:column; gap:8px; }
      .hp-subsection { display:flex; flex-direction:column; gap:6px; }
      .hp-subsection-title { font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:rgba(180,215,240,0.3); padding:2px 0; }
      .hp-empty { font-size:12px; color:rgba(180,215,240,0.25); text-align:center; padding:12px 0; }
      .hp-quick-actions { display:flex; gap:5px; flex-wrap:wrap; }
      .hq-btn { flex:1; padding:7px 6px; border-radius:8px; border:1px solid rgba(84,199,248,0.15); background:rgba(84,199,248,0.05); color:rgba(180,215,240,0.65); font-size:11px; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:'DM Sans',sans-serif; white-space:nowrap; }
      .hq-btn:hover { background:rgba(84,199,248,0.12); color:#e8f2ff; }

      /* User list */
      .hp-list { display:flex; flex-direction:column; gap:4px; }
      .hp-user { background:rgba(84,199,248,0.03); border:1px solid rgba(84,199,248,0.07); border-radius:10px; overflow:hidden; }
      .hp-user.speaking { border-color:rgba(74,222,128,0.3); background:rgba(74,222,128,0.04); }
      .hp-user.hand-up  { border-color:rgba(251,191,36,0.25); background:rgba(251,191,36,0.03); }
      .hp-user-row { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; cursor:pointer; }
      .hp-user-row:hover { background:rgba(84,199,248,0.04); }
      .hp-user-left { display:flex; align-items:center; gap:8px; min-width:0; }
      .hp-avatar { width:30px; height:30px; border-radius:50%; object-fit:cover; border:1.5px solid rgba(84,199,248,0.2); flex-shrink:0; }
      .hp-avatar.sm { width:24px; height:24px; }
      .hp-avatar-placeholder { width:30px; height:30px; border-radius:50%; background:rgba(84,199,248,0.1); border:1.5px solid rgba(84,199,248,0.2); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:rgba(180,215,240,0.5); flex-shrink:0; }
      .hp-avatar-placeholder.sm { width:24px; height:24px; font-size:10px; }
      .hp-user-meta { min-width:0; }
      .hp-user-name { font-size:12px; font-weight:600; color:rgba(180,215,240,0.8); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .hp-badges { display:flex; gap:3px; flex-wrap:wrap; margin-top:2px; }
      .hbadge { font-size:9px; font-weight:700; padding:1px 5px; border-radius:4px; letter-spacing:0.5px; }
      .hbadge.host     { background:rgba(251,191,36,0.15); color:#fbbf24; }
      .hbadge.cohost   { background:rgba(167,139,250,0.15); color:#a78bfa; }
      .hbadge.speaking { background:rgba(74,222,128,0.15); color:#4ade80; }
      .hbadge.hand     { background:rgba(251,191,36,0.1); color:#fbbf24; }
      .hbadge.tmute    { background:rgba(248,113,113,0.1); color:var(--danger); }
      .hbadge.shadow   { background:rgba(107,114,128,0.15); color:rgba(180,215,240,0.5); }
      .hp-user-icons { display:flex; align-items:center; gap:4px; }
      .icon-on  { font-size:12px; opacity:0.65; }
      .icon-off { font-size:12px; opacity:0.2; filter:grayscale(1); }
      .hp-chevron { font-size:9px; color:rgba(180,215,240,0.25); margin-left:4px; }

      /* HP actions */
      .hp-actions { padding:8px 10px; border-top:1px solid rgba(84,199,248,0.06); display:flex; flex-direction:column; gap:5px; background:rgba(3,10,20,0.4); }
      .hp-actions-row { display:flex; gap:5px; flex-wrap:wrap; }
      .ha-btn { flex:1; padding:6px 8px; border-radius:7px; border:1px solid rgba(84,199,248,0.12); background:rgba(84,199,248,0.05); color:rgba(180,215,240,0.7); font-size:11px; font-weight:600; cursor:pointer; transition:all 0.14s; font-family:'DM Sans',sans-serif; white-space:nowrap; min-width:80px; }
      .ha-btn:hover { background:rgba(84,199,248,0.1); color:#e8f2ff; }
      .ha-btn.green  { border-color:rgba(74,222,128,0.25); color:#4ade80; background:rgba(74,222,128,0.06); }
      .ha-btn.green:hover { background:rgba(74,222,128,0.14); }
      .ha-btn.warn   { border-color:rgba(251,191,36,0.25); color:#fbbf24; background:rgba(251,191,36,0.06); }
      .ha-btn.warn:hover { background:rgba(251,191,36,0.13); }
      .ha-btn.danger { border-color:rgba(248,113,113,0.25); color:var(--danger); background:rgba(248,113,113,0.06); }
      .ha-btn.danger:hover { background:rgba(248,113,113,0.13); }

      /* Temp mute dropdown */
      .ha-tmute-wrap { position:relative; flex:1; }
      .ha-tmute-menu { position:absolute; bottom:calc(100% + 4px); left:0; z-index:200; background:rgba(4,12,24,0.98); border:1px solid rgba(84,199,248,0.15); border-radius:10px; padding:5px; min-width:110px; box-shadow:0 8px 24px rgba(0,0,0,0.5); }
      .ha-tmute-menu button { display:block; width:100%; padding:7px 12px; background:none; border:none; color:rgba(180,215,240,0.7); font-size:12px; font-weight:600; cursor:pointer; border-radius:6px; transition:all 0.12s; font-family:'DM Sans',sans-serif; text-align:left; }
      .ha-tmute-menu button:hover { background:rgba(84,199,248,0.08); color:#e8f2ff; }

      /* Queue */
      .queue-item { display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:8px; background:rgba(84,199,248,0.04); border:1px solid rgba(84,199,248,0.08); }
      .queue-item.hand { border-color:rgba(251,191,36,0.2); background:rgba(251,191,36,0.04); }
      .queue-pos { font-size:11px; font-weight:700; color:rgba(180,215,240,0.3); flex-shrink:0; min-width:18px; }
      .queue-name { font-size:12px; font-weight:600; color:rgba(180,215,240,0.75); flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .queue-actions { display:flex; gap:4px; }
      .qa-btn { width:28px; height:28px; border-radius:7px; border:none; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.14s; }
      .qa-btn.approve { background:rgba(74,222,128,0.1); color:#4ade80; }
      .qa-btn.approve:hover { background:rgba(74,222,128,0.22); }
      .qa-btn.reject  { background:rgba(248,113,113,0.1); color:var(--danger); }
      .qa-btn.reject:hover { background:rgba(248,113,113,0.2); }

      /* Settings */
      .mode-buttons { display:flex; gap:5px; }
      .mode-btn { flex:1; padding:7px 4px; border-radius:9px; border:1px solid rgba(84,199,248,0.1); background:rgba(84,199,248,0.03); color:rgba(180,215,240,0.5); font-size:11px; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
      .mode-btn.active { border-color:rgba(84,199,248,0.4); background:rgba(84,199,248,0.1); color:var(--sky); }
      .mode-btn:hover:not(.active) { color:rgba(180,215,240,0.8); }
      .mode-desc { font-size:11px; color:rgba(180,215,240,0.3); padding:4px 2px; }
      .settings-row { display:flex; align-items:center; justify-content:space-between; padding:4px 0; }
      .settings-label { font-size:12px; color:rgba(180,215,240,0.55); }
      .settings-stepper { display:flex; align-items:center; background:rgba(84,199,248,0.05); border:1px solid rgba(84,199,248,0.12); border-radius:9px; overflow:hidden; }
      .settings-stepper button { width:30px; height:28px; background:none; border:none; cursor:pointer; color:rgba(180,215,240,0.6); font-size:16px; display:flex; align-items:center; justify-content:center; transition:background 0.14s; }
      .settings-stepper button:hover { background:rgba(84,199,248,0.08); }
      .settings-stepper span { font-size:12px; font-weight:700; color:rgba(180,215,240,0.8); min-width:32px; text-align:center; }
      .settings-presets { display:flex; gap:4px; flex-wrap:wrap; }
      .settings-preset { padding:4px 10px; border-radius:6px; border:1px solid rgba(84,199,248,0.08); background:rgba(84,199,248,0.02); color:rgba(180,215,240,0.4); font-size:11px; font-weight:600; cursor:pointer; transition:all 0.14s; }
      .settings-preset.active { border-color:rgba(84,199,248,0.4); background:rgba(84,199,248,0.1); color:var(--sky); }
      .settings-toggle-row { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(84,199,248,0.05); }
      .settings-toggle-label { font-size:12px; color:rgba(180,215,240,0.6); }
      .toggle-btn { padding:4px 10px; border-radius:7px; border:1px solid; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
      .toggle-btn.on  { border-color:rgba(74,222,128,0.35); background:rgba(74,222,128,0.1); color:#4ade80; }
      .toggle-btn.off { border-color:rgba(84,199,248,0.12); background:rgba(84,199,248,0.04); color:rgba(180,215,240,0.3); }

      /* Logs */
      .log-item { display:flex; align-items:center; gap:6px; padding:5px 6px; border-radius:7px; background:rgba(84,199,248,0.03); border:1px solid rgba(84,199,248,0.06); flex-wrap:wrap; }
      .log-action { font-size:10px; font-weight:700; color:rgba(84,199,248,0.7); text-transform:capitalize; }
      .log-target { font-size:11px; color:rgba(180,215,240,0.65); flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .log-detail { font-size:10px; color:rgba(180,215,240,0.35); }
      .log-time   { font-size:9px; color:rgba(180,215,240,0.25); flex-shrink:0; }

      /* ── CREATE ROOM MODAL ── */
      .crm-overlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.65); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:16px; animation:dr-fadein 0.2s ease; }
      .crm-sheet { width:100%; max-width:520px; border-radius:24px; background:rgba(4,12,24,0.98); border:1px solid rgba(84,199,248,0.12); box-shadow:0 24px 80px rgba(0,0,0,0.6); overflow:hidden; position:relative; animation:crm-up 0.3s cubic-bezier(0.16,1,0.3,1) both; }
      @keyframes crm-up { from{opacity:0;transform:translateY(20px) scale(0.97);} to{opacity:1;transform:none;} }
      .crm-beam { height:2px; background:linear-gradient(90deg,rgba(84,199,248,0.7),rgba(59,158,218,0.3),transparent); }
      .crm-beam-glow { height:1px; background:linear-gradient(90deg,rgba(84,199,248,0.15),transparent); }
      .crm-header { display:flex; align-items:center; justify-content:space-between; padding:20px 26px 18px; border-bottom:1px solid rgba(84,199,248,0.07); }
      .crm-header-left { display:flex; align-items:center; gap:14px; }
      .crm-crown-wrap { width:46px; height:46px; border-radius:13px; background:rgba(251,191,36,0.08); display:flex; align-items:center; justify-content:center; position:relative; }
      .crm-crown-ring { position:absolute; inset:0; border-radius:13px; background:linear-gradient(135deg,rgba(251,191,36,0.14),rgba(251,191,36,0.04)); border:1px solid rgba(251,191,36,0.28); box-shadow:0 0 16px rgba(251,191,36,0.12); }
      .crm-crown-icon { font-size:22px; position:relative; z-index:1; }
      .crm-eyebrow { font-size:10px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:rgba(251,191,36,0.65); margin-bottom:4px; }
      .crm-title { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; letter-spacing:-0.5px; color:#f0f6ff; }
      .crm-close { width:34px; height:34px; border-radius:10px; border:1px solid rgba(84,199,248,0.1); background:rgba(84,199,248,0.04); color:rgba(180,215,240,0.35); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.18s; }
      .crm-close:hover { border-color:rgba(84,199,248,0.25); color:rgba(180,215,240,0.9); }
      .crm-body { padding:22px 26px; display:flex; flex-direction:column; gap:20px; }
      .crm-field { display:flex; flex-direction:column; gap:8px; }
      .crm-label { font-size:10px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:rgba(180,215,240,0.45); display:flex; align-items:center; gap:6px; }
      .crm-required { color:rgba(84,199,248,0.7); font-size:13px; }
      .crm-hint { font-weight:400; letter-spacing:0; text-transform:none; font-size:11px; color:rgba(180,215,240,0.25); }
      .crm-input-wrap { position:relative; }
      .crm-input { width:100%; background:rgba(3,10,22,0.8); border:1px solid rgba(84,199,248,0.1); border-radius:13px; padding:12px 16px; color:#e8f2ff; font-size:14px; font-family:'DM Sans',sans-serif; outline:none; transition:border-color 0.2s; resize:none; }
      .crm-input::placeholder { color:rgba(180,215,240,0.18); }
      .crm-input:focus { border-color:rgba(84,199,248,0.38); box-shadow:0 0 0 3px rgba(84,199,248,0.07); }
      .crm-textarea { min-height:80px; }
      .crm-char-count { position:absolute; bottom:10px; right:13px; font-size:10px; color:rgba(180,215,240,0.18); pointer-events:none; }
      .crm-char-count-ta { bottom:10px; }
      .crm-tags-grid { display:flex; flex-wrap:wrap; gap:7px; }
      .crm-tag { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:500; padding:7px 14px; border-radius:100px; border:1px solid rgba(84,199,248,0.09); background:rgba(84,199,248,0.03); color:rgba(180,215,240,0.45); cursor:pointer; transition:all 0.18s; white-space:nowrap; }
      .crm-tag:hover { border-color:rgba(84,199,248,0.22); color:rgba(180,215,240,0.82); }
      .crm-tag-on { border-color:rgba(84,199,248,0.5)!important; background:rgba(84,199,248,0.11)!important; color:#54c7f8!important; }
      .crm-tag-check { font-size:10px; font-weight:800; color:var(--sky); }
      .crm-capacity-row { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
      .crm-number-wrap { display:flex; align-items:center; background:rgba(3,10,22,0.8); border:1px solid rgba(84,199,248,0.1); border-radius:13px; overflow:hidden; }
      .crm-num-btn { width:42px; height:46px; background:rgba(84,199,248,0.04); border:none; color:rgba(180,215,240,0.45); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
      .crm-num-btn:hover { background:rgba(84,199,248,0.1); color:var(--sky); }
      .crm-number-input { width:74px; height:46px; background:transparent; border:none; border-left:1px solid rgba(84,199,248,0.08); border-right:1px solid rgba(84,199,248,0.08); color:#e8f2ff; font-family:'Syne',sans-serif; font-size:17px; font-weight:700; text-align:center; outline:none; -moz-appearance:textfield; }
      .crm-number-input::-webkit-outer-spin-button,.crm-number-input::-webkit-inner-spin-button { -webkit-appearance:none; }
      .crm-capacity-presets { display:flex; gap:6px; flex-wrap:wrap; }
      .crm-preset { font-size:12px; font-weight:500; padding:6px 14px; border-radius:100px; border:1px solid rgba(84,199,248,0.09); background:rgba(84,199,248,0.02); color:rgba(180,215,240,0.4); cursor:pointer; transition:all 0.15s; }
      .crm-preset:hover { border-color:rgba(84,199,248,0.2); color:rgba(180,215,240,0.75); }
      .crm-preset-on { border-color:rgba(84,199,248,0.5)!important; background:rgba(84,199,248,0.1)!important; color:var(--sky)!important; }
      .crm-capacity-note { font-size:11px; color:rgba(180,215,240,0.28); margin-top:4px; }
      .crm-error { display:flex; align-items:center; gap:9px; font-size:12px; color:var(--danger); background:rgba(248,113,113,0.05); border:1px solid rgba(248,113,113,0.18); border-radius:12px; padding:11px 15px; }
      .crm-footer { display:flex; justify-content:flex-end; gap:10px; padding:14px 26px 24px; border-top:1px solid rgba(84,199,248,0.07); }
      .crm-btn-cancel { padding:12px 24px; border-radius:13px; border:1px solid rgba(84,199,248,0.1); background:transparent; color:rgba(180,215,240,0.38); font-size:13px; cursor:pointer; transition:all 0.18s; font-family:'DM Sans',sans-serif; }
      .crm-btn-cancel:hover { border-color:rgba(84,199,248,0.22); color:rgba(180,215,240,0.75); }
      .crm-btn-create { display:flex; align-items:center; gap:8px; padding:12px 26px; border-radius:13px; border:1px solid rgba(84,199,248,0.38); background:linear-gradient(135deg,rgba(84,199,248,0.16),rgba(59,158,218,0.08)); color:var(--sky); font-family:'Syne',sans-serif; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.22s; position:relative; overflow:hidden; }
      .crm-btn-create:hover:not(:disabled) { border-color:rgba(84,199,248,0.65); box-shadow:0 0 28px rgba(84,199,248,0.22); transform:translateY(-1px); }
      .crm-btn-create:disabled { opacity:0.42; cursor:not-allowed; }
      .crm-arrow { font-size:16px; transition:transform 0.22s; }
      .crm-btn-create:hover .crm-arrow { transform:translateX(4px); }
      .crm-loading-dots { display:flex; gap:4px; align-items:center; }
      .crm-loading-dots span { width:5px; height:5px; border-radius:50%; background:var(--sky); animation:crm-dot 1.2s ease-in-out infinite; }
      .crm-loading-dots span:nth-child(2){animation-delay:0.2s;}
      .crm-loading-dots span:nth-child(3){animation-delay:0.4s;}
      @keyframes crm-dot { 0%,80%,100%{opacity:0.25;transform:scale(0.8);} 40%{opacity:1;transform:scale(1);} }
      .crm-locked-badges { display:flex; gap:10px; margin-top:4px; }
      .crm-locked-badge { padding:7px 18px; border-radius:100px; font-size:13px; font-weight:600; }
      .crm-locked-vip { background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.3); color:#fbbf24; }
      .crm-locked-streamer { background:rgba(84,199,248,0.08); border:1px solid rgba(84,199,248,0.25); color:var(--sky); }

      /* ── SCROLLBARS ── */
      ::-webkit-scrollbar { width:3px; height:3px; }
      ::-webkit-scrollbar-track { background:transparent; }
      ::-webkit-scrollbar-thumb { background:rgba(84,199,248,0.18); border-radius:2px; }

      @keyframes dr-fadein { from{opacity:0;} to{opacity:1;} }

      @media (max-width:900px) {
        .dr-header{padding:12px 18px;} .dr-filters{padding:12px 18px 6px;} .dr-main{padding:12px 18px 30px;}
        .host-panel{width:260px;}
      }
      @media (max-width:680px) {
        .host-panel{position:fixed;right:0;top:0;bottom:0;z-index:100;width:260px;box-shadow:-8px 0 32px rgba(0,0,0,0.5);}
        .dr-self-pip{width:100px;}
      }
      @media (max-width:560px) {
        .dr-logo-wordmark{font-size:16px;} .dr-logo-section-tag{display:none;}
        .dr-create-btn{padding:8px 14px;font-size:12px;}
        .crm-sheet{border-radius:20px;} .crm-header{padding:14px 20px 16px;} .crm-body{padding:18px 20px;} .crm-footer{padding:12px 20px 20px;}
      }
    `}</style>
  );
}