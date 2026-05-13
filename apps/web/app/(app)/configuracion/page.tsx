"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import VideoAudioSection from "./VideoAudioSection";
import PrivacidadSection  from "./PrivacidadSection";
import { supabase } from "@/services/supabase.client";

// ─── Imágenes de iconos ───────────────────────────────────────────
import imgWebcam      from "../../../Images/webcam.png";
import imgCandado     from "../../../Images/candado.png";
import imgEscudo      from "../../../Images/escudo.png";
import imgDiamante    from "../../../Images/diamante.png";
import imgEstadisticas from "../../../Images/ligues.png";

// ─── Types ────────────────────────────────────────────────────────
type Section =
  | "video-audio"
  | "privacidad"
  | "moderacion"
  | "premium"
  | "estadisticas";

interface SectionMeta {
  id: Section;
  img: typeof imgWebcam;
  label: string;
  desc: string;
  accent: string;
}

interface Report {
  id: string;
  reported_user_id: string | null;
  reporter_user_id: string | null;
  reported_name: string | null;
  reason: string;
  details: string | null;
  status: "pendiente" | "en_revision" | "resuelto" | "descartado";
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
}

const STATUS_META: Record<Report["status"], { label: string; color: string }> = {
  pendiente:   { label: "PENDIENTE",    color: "#f97316" },
  en_revision: { label: "EN REVISIÓN", color: "#fbbf24" },
  resuelto:    { label: "RESUELTO",    color: "#4ade80" },
  descartado:  { label: "DESCARTADO",  color: "rgba(180,215,240,0.35)" },
};

const SECTIONS: SectionMeta[] = [
  { id: "video-audio",  img: imgWebcam,       label: "Video y Audio",          desc: "Cámara, micrófono y extras",   accent: "#54c7f8" },
  { id: "privacidad",   img: imgCandado,      label: "Privacidad y Seguridad", desc: "2FA, contraseña, verificación", accent: "#a78bfa" },
  { id: "moderacion",   img: imgEscudo,       label: "Moderación",             desc: "Filtros, reportes y bloqueos",  accent: "#f97316" },
  { id: "premium",      img: imgDiamante,     label: "Premium",                desc: "Plan, pagos y beneficios",      accent: "#ffd700" },
  { id: "estadisticas", img: imgEstadisticas, label: "Estadísticas",           desc: "Tu actividad y reputación",     accent: "#4ade80" },
];

// ─── Toggle Component ────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none",
        background: value
          ? "linear-gradient(135deg, #54c7f8, #3b9eda)"
          : "rgba(255,255,255,0.08)",
        boxShadow: value ? "0 0 12px rgba(84,199,248,0.4)" : "none",
        cursor: "pointer", position: "relative", flexShrink: 0,
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}
      aria-pressed={value}
    >
      <span style={{
        position: "absolute", top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: value ? "#fff" : "rgba(255,255,255,0.35)",
        transition: "left 0.25s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

// ─── Select Component ────────────────────────────────────────────
function Select({ options, value, onChange, accent }: {
  options: string[]; value: string;
  onChange: (v: string) => void; accent: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: `1px solid rgba(255,255,255,0.1)`,
        borderRadius: 8, padding: "6px 10px",
        color: "#e8f4fd", fontFamily: "'DM Sans', sans-serif", fontSize: 12,
        cursor: "pointer", outline: "none", minWidth: 140,
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
        paddingRight: 28,
      }}
    >
      {options.map(o => <option key={o} value={o} style={{ background: "#050f1e" }}>{o}</option>)}
    </select>
  );
}

// ─── Slider Component ────────────────────────────────────────────
function Slider({ value, onChange, accent }: {
  value: number; onChange: (v: number) => void; accent: string;
}) {
  return (
    <input
      type="range" min={0} max={100} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        width: 120, accentColor: accent, cursor: "pointer",
        height: 4, borderRadius: 2,
      }}
    />
  );
}

// ─── Setting Row ─────────────────────────────────────────────────
function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, padding: "13px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 13.5,
          color: "rgba(240,248,255,0.85)", fontWeight: 500, lineHeight: 1.2,
        }}>{label}</div>
        {sub && (
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 11,
            color: "rgba(180,215,240,0.35)", marginTop: 3,
          }}>{sub}</div>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Section Block ───────────────────────────────────────────────
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700,
        letterSpacing: 2, textTransform: "uppercase",
        color: "rgba(180,215,240,0.35)", marginBottom: 4,
      }}>{title}</div>
      <div style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, padding: "0 18px",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 100,
      background: `${color}18`, border: `1px solid ${color}35`,
      color, fontFamily: "'DM Sans', sans-serif",
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ─── Action Button ───────────────────────────────────────────────
function ActionBtn({ label, accent, onClick }: { label: string; accent: string; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "7px 16px", borderRadius: 10,
        background: hover ? `${accent}20` : `${accent}0d`,
        border: `1px solid ${hover ? accent + "55" : accent + "28"}`,
        color: accent, fontFamily: "'DM Sans', sans-serif",
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        transition: "all 0.2s ease", whiteSpace: "nowrap",
      }}
    >{label}</button>
  );
}

function ModeracionSection() {
  const [autoBlock,    setAutoBlock]    = useState(true);
  const [sensibilidad, setSensibilidad] = useState(60);
  const [skipReported, setSkipReported] = useState(true);
  const [anonimos,     setAnonimos]     = useState(false);
  const [reports,      setReports]      = useState<Report[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [detailInput,  setDetailInput]  = useState("");
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState<string | null>(null);
  const [banCount,     setBanCount]     = useState(0); // ← advertencias = baneos recibidos

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Reportes que hizo el usuario
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("reporter_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) setReports(data as Report[]);

      // Cuántas veces fue baneado el usuario logueado
      const { count } = await supabase
        .from("bans")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setBanCount(count ?? 0);

      setLoading(false);
    };
    load();
  }, []);

  const handleAddDetails = useCallback(async (reportId: string) => {
    if (!detailInput.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    const { error } = await supabase
      .from("reports")
      .update({ details: detailInput.trim(), updated_at: new Date().toISOString() })
      .eq("id", reportId);
    if (error) {
      setSaveMsg("Error al guardar. Intentá de nuevo.");
    } else {
      setReports(prev => prev.map(r =>
        r.id === reportId ? { ...r, details: detailInput.trim(), updated_at: new Date().toISOString() } : r
      ));
      setSaveMsg("Detalles guardados ✓");
      setEditingId(null);
      setDetailInput("");
      setTimeout(() => setSaveMsg(null), 3000);
    }
    setSaving(false);
  }, [detailInput]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const pendingCount = reports.filter(r => r.status === "pendiente" || r.status === "en_revision").length;

  return (
    <>
      <Block title="Opciones de moderación">
        <Row label="Bloqueo automático de insultos" sub="Detecta y filtra lenguaje agresivo">
          <Toggle value={autoBlock} onChange={setAutoBlock} />
        </Row>
        <Row label="Nivel de sensibilidad del filtro" sub={`Sensibilidad: ${sensibilidad}%`}>
          <Slider value={sensibilidad} onChange={setSensibilidad} accent="#f97316" />
        </Row>
        <Row label="Auto-skip de usuarios reportados" sub="Evita emparejar con usuarios reportados">
          <Toggle value={skipReported} onChange={setSkipReported} />
        </Row>
        <Row label="Permitir chats anónimos" sub="Ocultar identidad en conversaciones">
          <Toggle value={anonimos} onChange={setAnonimos} />
        </Row>
      </Block>

      <Block title={`Mis reportes${pendingCount > 0 ? ` · ${pendingCount} activos` : ""}`}>
        <style>{`@keyframes modSpin { to { transform: rotate(360deg); } }`}</style>
        {loading ? (
          <div style={{ padding: "20px 0", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(249,115,22,0.2)", borderTopColor: "#f97316", animation: "modSpin 0.7s linear infinite", flexShrink: 0 }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(180,215,240,0.3)" }}>Cargando reportes...</span>
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🛡️</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(180,215,240,0.3)" }}>No enviaste ningún reporte todavía</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(180,215,240,0.2)", marginTop: 4 }}>Podés reportar usuarios desde su perfil</div>
          </div>
        ) : (
          <div style={{ paddingTop: 4, paddingBottom: 4 }}>
            {saveMsg && (
              <div style={{ padding: "8px 14px", borderRadius: 10, margin: "8px 0", background: saveMsg.includes("Error") ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.08)", border: `1px solid ${saveMsg.includes("Error") ? "rgba(239,68,68,0.2)" : "rgba(74,222,128,0.2)"}`, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: saveMsg.includes("Error") ? "#f87171" : "#4ade80" }}>{saveMsg}</div>
            )}
            {reports.map((r, i) => {
              const meta   = STATUS_META[r.status] ?? STATUS_META.pendiente;
              const isOpen = expanded === r.id;
              const isEdit = editingId === r.id;
              return (
                <div key={r.id} style={{ borderBottom: i < reports.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", cursor: "pointer", gap: 12 }} onClick={() => setExpanded(isOpen ? null : r.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(240,248,255,0.85)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14 }}>🚩</span>
                        {r.reported_name ?? "Usuario desconocido"}
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(180,215,240,0.35)", marginTop: 2 }}>{r.reason} · {formatDate(r.created_at)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <Badge label={meta.label} color={meta.color} />
                      <span style={{ fontSize: 11, color: "rgba(180,215,240,0.25)", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                    </div>
                  </div>

                  {/* Explicación del estado */}
                  {isOpen && (
                    <div style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.12)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                      
                      {/* Descripción del estado actual */}
                      <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: `${meta.color}0e`, border: `1px solid ${meta.color}22` }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: meta.color, fontWeight: 600, marginBottom: 3 }}>
                          {r.status === "pendiente"   && "⏳ Tu reporte está esperando revisión del equipo."}
                          {r.status === "en_revision" && "👀 El equipo está revisando tu reporte. Aún no se tomó acción."}
                          {r.status === "resuelto"    && "✅ El usuario fue sancionado. Gracias por reportar."}
                          {r.status === "descartado"  && "❌ El reporte fue revisado y no se encontró una violación."}
                        </div>
                      </div>

                      {r.details && !isEdit && (
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: "rgba(180,215,240,0.6)", lineHeight: 1.6, marginBottom: 12 }}>
                          <span style={{ color: "rgba(249,115,22,0.5)", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginRight: 6 }}>DETALLES</span>
                          {r.details}
                        </div>
                      )}
                      {r.admin_notes && (
                        <div style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(180,240,200,0.65)", lineHeight: 1.5 }}>
                          <span style={{ color: "#4ade8088", fontSize: 10, fontWeight: 700, letterSpacing: 1, display: "block", marginBottom: 4 }}>NOTA DEL EQUIPO</span>
                          {r.admin_notes}
                        </div>
                      )}
                      {isEdit ? (
                        <div>
                          <textarea value={detailInput} onChange={e => setDetailInput(e.target.value)} placeholder="Describí el incidente con más detalles..." maxLength={600} style={{ width: "100%", minHeight: 76, resize: "vertical", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 10, padding: "10px 13px", fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: "rgba(220,235,255,0.8)", outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setEditingId(null); setDetailInput(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(180,215,240,0.4)", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={() => handleAddDetails(r.id)} disabled={saving || !detailInput.trim()} style={{ flex: 2, padding: "8px 0", borderRadius: 9, background: "rgba(249,115,22,0.18)", border: "1px solid rgba(249,115,22,0.4)", color: "#fb923c", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", opacity: saving || !detailInput.trim() ? 0.5 : 1 }}>{saving ? "Guardando..." : "Guardar detalles"}</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(r.id); setDetailInput(r.details ?? ""); }} style={{ padding: "7px 14px", borderRadius: 9, fontSize: 11.5, fontWeight: 600, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "rgba(249,115,22,0.75)", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                          {r.details ? "✏️ Editar detalles" : "+ Agregar detalles"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Advertencias recibidas = cantidad de baneos del usuario logueado */}
        <Row
          label="Advertencias recibidas"
          sub={banCount === 0 ? "Sin advertencias activas" : `Tuviste ${banCount} sanción${banCount > 1 ? "es" : ""} en tu cuenta`}
        >
          <Badge
            label={banCount === 0 ? "0 ACTIVAS" : `${banCount} ${banCount > 1 ? "SANCIONES" : "SANCIÓN"}`}
            color={banCount === 0 ? "#4ade80" : "#f97316"}
          />
        </Row>
      </Block>
    </>
  );
}

// ─── Section: Premium ────────────────────────────────────────────
interface VipPayment {
  id: string; payment_id: string; plan: string; days: number;
  vip_until: string; status: string; created_at: string;
}
interface VipProfile {
  role: string; vip_since: string | null; vip_until: string | null;
}

function PremiumSection() {
  const [profile,         setProfile]         = useState<VipProfile | null>(null);
  const [payments,        setPayments]        = useState<VipPayment[]>([]);
  const [loadingProfile,  setLoadingProfile]  = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [autoRenew,       setAutoRenew]       = useState(true);
  const [cancelLoading,   setCancelLoading]   = useState(false);
  const [cancelDone,      setCancelDone]      = useState(false);
  const [autoRenewMsg,    setAutoRenewMsg]    = useState<string | null>(null);
  const [userId,          setUserId]          = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: p } = await supabase.from("profiles").select("role, vip_since, vip_until").eq("id", user.id).single();
      if (p) setProfile(p);
      setLoadingProfile(false);
      const { data: pag } = await supabase.from("vip_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      if (pag) setPayments(pag);
      setLoadingPayments(false);
      const { data: prof } = await supabase.from("profiles").select("auto_renew").eq("id", user.id).single();
      if (prof?.auto_renew !== undefined) setAutoRenew(prof.auto_renew);
    };
    load();
  }, []);

  const handleAutoRenew = useCallback(async (val: boolean) => {
    if (!userId) return;
    setAutoRenew(val); setAutoRenewMsg(null);
    const { error } = await supabase.from("profiles").update({ auto_renew: val }).eq("id", userId);
    if (error) { setAutoRenew(!val); setAutoRenewMsg("Error al guardar. Intentá de nuevo."); }
    else { setAutoRenewMsg(val ? "Renovación automática activada ✓" : "Renovación automática desactivada ✓"); setTimeout(() => setAutoRenewMsg(null), 3000); }
  }, [userId]);

  const handleCancel = useCallback(async () => {
    if (!userId || cancelDone) return;
    const confirmed = window.confirm("¿Cancelar la suscripción VIP? Seguirás teniendo acceso hasta que venza el período actual.");
    if (!confirmed) return;
    setCancelLoading(true);
    const { error } = await supabase.from("profiles").update({ auto_renew: false }).eq("id", userId);
    if (!error) { setAutoRenew(false); setCancelDone(true); }
    setCancelLoading(false);
  }, [userId, cancelDone]);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
  const daysLeft   = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const planLabel  = (plan: string) => plan === "monthly" ? "VIP Mensual" : plan === "annual" ? "VIP Anual" : plan;

  const isVip      = profile?.role === "vip";
  const remaining  = profile?.vip_until ? daysLeft(profile.vip_until) : 0;
  const urgentDays = remaining <= 7;

  if (loadingProfile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 56, borderRadius: 14, background: "rgba(255,255,255,0.04)", animation: "shimmer 1.4s ease-in-out infinite" }} />)}
        <style>{`@keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.8} }`}</style>
      </div>
    );
  }

  return (
    <>
      <Block title="Tu plan actual">
        <div style={{ padding: "16px 0" }}>
          {isVip ? (
            <div style={{ background: "linear-gradient(135deg, rgba(255,195,0,0.10) 0%, rgba(255,140,0,0.07) 100%)", border: `1px solid ${urgentDays ? "rgba(249,115,22,0.55)" : "rgba(255,195,0,0.28)"}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, background: "linear-gradient(135deg, #ffd700, #ff9500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Turrinder VIP 👑</div>
                  {profile?.vip_until && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, marginTop: 4, color: urgentDays ? "rgba(249,115,22,0.85)" : "rgba(255,210,60,0.5)" }}>{autoRenew ? "Renueva" : "Vence"} el {formatDate(profile.vip_until)}{urgentDays && <span style={{ marginLeft: 6, fontWeight: 700 }}>· {remaining}d restantes</span>}</div>}
                </div>
                <Badge label="ACTIVO" color="#4ade80" />
              </div>
              {profile?.vip_since && profile?.vip_until && (() => {
                const total = new Date(profile.vip_until).getTime() - new Date(profile.vip_since).getTime();
                const elapsed = Date.now() - new Date(profile.vip_since).getTime();
                const pct = Math.min(100, Math.round((elapsed / total) * 100));
                return (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,210,60,0.4)", fontFamily: "'DM Sans', sans-serif" }}>Período actual</span>
                      <span style={{ fontSize: 10, color: "rgba(255,210,60,0.5)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{remaining}d restantes</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 100, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 100, width: `${pct}%`, background: urgentDays ? "linear-gradient(90deg, #f97316, #ef4444)" : "linear-gradient(90deg, #ffd700, #ff9500)", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "20px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "rgba(240,248,255,0.5)" }}>Plan Gratuito</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(180,215,240,0.3)", marginTop: 3 }}>Algunas funciones están limitadas</div>
              </div>
              <ActionBtn label="Mejorar a VIP" accent="#ffd700" />
            </div>
          )}
        </div>
        {isVip && (
          <>
            <Row label="Renovación automática" sub={autoRenew ? `Se renueva automáticamente el ${profile?.vip_until ? formatDate(profile.vip_until) : "próximo período"}` : "No se renovará — acceso hasta fin del período actual"}>
              <Toggle value={autoRenew} onChange={handleAutoRenew} />
            </Row>
            {autoRenewMsg && <div style={{ padding: "8px 14px", borderRadius: 10, marginBottom: 4, background: autoRenewMsg.includes("Error") ? "rgba(239,68,68,0.08)" : "rgba(74,222,128,0.08)", border: `1px solid ${autoRenewMsg.includes("Error") ? "rgba(239,68,68,0.2)" : "rgba(74,222,128,0.2)"}`, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: autoRenewMsg.includes("Error") ? "#f87171" : "#4ade80" }}>{autoRenewMsg}</div>}
            {!cancelDone ? (
              <Row label="Cancelar suscripción" sub="Seguirás con VIP hasta que venza el período"><ActionBtn label={cancelLoading ? "Cancelando..." : "Cancelar"} accent="#ef4444" onClick={handleCancel} /></Row>
            ) : (
              <Row label="Suscripción cancelada" sub="Tenés VIP hasta fin del período actual"><Badge label="CANCELADA" color="#f97316" /></Row>
            )}
          </>
        )}
      </Block>
      {isVip && (
        <Block title="Beneficios activos">
          {["Sin anuncios en toda la app","Likes ilimitados","Crear salas privadas","Chats ilimitados","Videollamadas HD"].map((text, i) => (
            <Row key={i} label={text}><span style={{ color: "#4ade80", fontSize: 14 }}>✓</span></Row>
          ))}
        </Block>
      )}
      <Block title="Historial de pagos">
        {loadingPayments ? (
          <div style={{ padding: "18px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,195,0,0.2)", borderTopColor: "#ffd700", animation: "spin 0.7s linear infinite" }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(180,215,240,0.3)" }}>Cargando pagos...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(180,215,240,0.3)" }}>Sin pagos registrados todavía</div>
          </div>
        ) : (
          <div style={{ paddingTop: 4, paddingBottom: 4 }}>
            {payments.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < payments.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "rgba(255,195,0,0.08)", border: "1px solid rgba(255,195,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👑</div>
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(240,248,255,0.85)", fontWeight: 500 }}>{planLabel(p.plan)}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(180,215,240,0.35)", marginTop: 2 }}>{formatDate(p.created_at)} · ID {p.payment_id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <Badge label={p.status === "approved" ? "PAGADO" : p.status.toUpperCase()} color={p.status === "approved" ? "#4ade80" : "#f97316"} />
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(180,215,240,0.3)", marginTop: 4 }}>{p.days} días</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Block>
      {isVip && profile?.vip_since && (
        <Block title="Detalles de la suscripción">
          <Row label="VIP desde" sub="Fecha de primera activación"><span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "rgba(255,210,60,0.8)" }}>{formatDate(profile.vip_since)}</span></Row>
          <Row label="Pagos realizados" sub="Total de renovaciones"><span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "rgba(255,210,60,0.8)" }}>{payments.length}</span></Row>
          <Row label="Soporte prioritario" sub="Respondemos en menos de 24hs"><ActionBtn label="Contactar" accent="#ffd700" /></Row>
        </Block>
      )}
    </>
  );
}

// ─── Section: Estadísticas ───────────────────────────────────────
function EstadisticasSection() {
  const stats = [
    { label: "Tiempo en llamadas",           value: "47h 23m", sub: "este mes",           color: "#54c7f8", icon: "📞" },
    { label: "Matches totales",              value: "284",     sub: "desde que empezaste", color: "#a78bfa", icon: "🔥" },
    { label: "Debates ganados",              value: "61%",     sub: "tasa de victoria",    color: "#f97316", icon: "🏆" },
    { label: "Likes recibidos",              value: "1.204",   sub: "total acumulado",     color: "#f472b6", icon: "❤️" },
    { label: "Tiempo prom. de conversación", value: "18 min",  sub: "por sesión",          color: "#4ade80", icon: "⏱️" },
    { label: "Ranking / Reputación",         value: "#342",    sub: "top 5% global",       color: "#ffd700", icon: "⭐" },
  ];
  return (
    <>
      <Block title="Tu actividad">
        <div style={{ paddingTop: 8, paddingBottom: 8 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: `${s.color}12`, border: `1px solid ${s.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: "rgba(180,215,240,0.55)" }}>{s.label}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(180,215,240,0.3)", marginTop: 1 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </Block>
      <Block title="Ranking global">
        <Row label="Tu posición actual" sub="Basado en matches, tiempo y reputación">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#ffd700" }}>#342</span>
            <Badge label="TOP 5%" color="#ffd700" />
          </div>
        </Row>
        <Row label="Puntos de reputación" sub="Se calcula cada semana">
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "#4ade80" }}>4.820 pts</span>
        </Row>
      </Block>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const [active, setActive] = useState<Section>("video-audio");
  const current = SECTIONS.find(s => s.id === active)!;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #030a14; color: #e8f4fd; min-height: 100vh; }

        .cfg-bg-mesh {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-color: #030a14;
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(84,199,248,0.12) 0%, transparent 80%),
            radial-gradient(ellipse 60% 60% at 100% 100%, rgba(59,158,218,0.08) 0%, transparent 70%);
        }

        .cfg-root { position: relative; z-index: 1; display: flex; min-height: 100vh; }

        .cfg-sidenav {
          width: 220px; flex-shrink: 0;
          background: rgba(3,10,20,0.72);
          border-right: 1px solid rgba(84,199,248,0.10);
          padding: 28px 10px; position: sticky; top: 0;
          height: 100vh; overflow-y: auto;
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        }
        .cfg-sidenav::-webkit-scrollbar { width: 3px; }
        .cfg-sidenav::-webkit-scrollbar-thumb { background: rgba(84,199,248,0.15); border-radius: 4px; }

        @media (max-width: 900px) {
          .cfg-sidenav { width: 64px; }
          .cfg-nav-label { display: none; }
          .cfg-nav-desc  { display: none; }
          .cfg-nav-head  { display: none; }
        }

        .cfg-nav-head {
          font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 700;
          letter-spacing: 2.5px; text-transform: uppercase;
          color: rgba(180,215,240,0.25); padding: 4px 10px 14px;
        }

        /* ── Nav item: sin caja, icono protagonista ── */
        .cfg-nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 9px 10px; border-radius: 12px;
          border: 1px solid transparent; cursor: pointer;
          margin-bottom: 2px; background: transparent;
          width: 100%; text-align: left;
          transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
          position: relative; outline: none;
          -webkit-tap-highlight-color: transparent;
        }
        .cfg-nav-item:hover  { background: rgba(255,255,255,0.04); }
        .cfg-nav-item.active {
          background: var(--nav-accent-bg);
          border-color: var(--nav-accent-border);
        }
        .cfg-nav-item:hover .cfg-nav-icon-img {
          transform: scale(1.12) rotate(-4deg);
        }
        .cfg-nav-item.active .cfg-nav-icon-img {
          transform: scale(1.08);
          filter: drop-shadow(0 0 7px var(--nav-accent));
        }

        /* Icono: sin fondo, sin borde */
        .cfg-nav-icon {
          width: 32px; height: 32px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }

        /* Glow detrás del icono cuando está activo */
        .cfg-nav-icon-glow {
          position: absolute; inset: -6px; border-radius: 50%;
          background: radial-gradient(circle, var(--nav-accent) 0%, transparent 70%);
          opacity: 0; transition: opacity 0.3s ease; z-index: 0; filter: blur(6px);
          pointer-events: none;
        }
        .cfg-nav-item.active .cfg-nav-icon-glow { opacity: 0.35; }

        .cfg-nav-icon-img {
          position: relative; z-index: 1;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), filter 0.25s ease, opacity 0.25s ease;
          opacity: 0.4;
        }
        .cfg-nav-item:hover  .cfg-nav-icon-img { opacity: 0.7; }
        .cfg-nav-item.active .cfg-nav-icon-img { opacity: 1; }

        .cfg-nav-label {
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: rgba(240,248,255,0.55); line-height: 1.2;
          transition: color 0.2s ease;
        }
        .cfg-nav-item:hover  .cfg-nav-label { color: rgba(240,248,255,0.8); }
        .cfg-nav-item.active .cfg-nav-label { color: rgba(240,248,255,0.95); }
        .cfg-nav-desc {
          font-family: 'DM Sans', sans-serif; font-size: 10px;
          color: rgba(180,215,240,0.28); margin-top: 2px;
        }

        /* Dot activo a la derecha */
        .cfg-nav-dot {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          width: 4px; height: 16px; border-radius: 4px;
          background: var(--nav-accent);
          box-shadow: 0 0 8px var(--nav-accent);
          opacity: 0; transform: translateY(-50%) scaleY(0);
          transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .cfg-nav-item.active .cfg-nav-dot {
          opacity: 1; transform: translateY(-50%) scaleY(1);
        }

        .cfg-content { flex: 1; max-width: 680px; padding: 32px 28px 60px; overflow-y: auto; }
        @media (max-width: 600px) { .cfg-content { padding: 20px 16px 60px; } }

        .cfg-section-header { margin-bottom: 28px; }

        .cfg-section-title {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
          letter-spacing: -0.5px;
          display: flex; align-items: center; gap: 14px; margin-bottom: 6px;
        }

        .cfg-section-sub { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(180,215,240,0.38); }
        .cfg-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(84,199,248,0.15), transparent); margin: 0 0 28px; }

        select option { background: #050f1e; color: #e8f4fd; }

        input[type=range] {
          -webkit-appearance: none; height: 4px;
          background: rgba(255,255,255,0.1); border-radius: 2px; outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px;
          border-radius: 50%; background: #54c7f8;
          box-shadow: 0 0 8px rgba(84,199,248,0.5); cursor: pointer;
        }
      `}</style>

      <div className="cfg-bg-mesh" />

      <div className="cfg-root">
        {/* ── Sidebar ── */}
        <aside className="cfg-sidenav">
          <div className="cfg-nav-head">Configuración</div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`cfg-nav-item ${active === s.id ? "active" : ""}`}
              onClick={() => setActive(s.id)}
              style={{
                "--nav-accent":        s.accent,
                "--nav-accent-bg":     `${s.accent}10`,
                "--nav-accent-border": `${s.accent}22`,
              } as React.CSSProperties}
            >
              <div className="cfg-nav-icon">
                <div className="cfg-nav-icon-glow" />
                <Image
                  src={s.img}
                  alt={s.label}
                  width={26}
                  height={26}
                  className="cfg-nav-icon-img"
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cfg-nav-label">{s.label}</div>
                <div className="cfg-nav-desc">{s.desc}</div>
              </div>
              <div className="cfg-nav-dot" />
            </button>
          ))}
        </aside>

        {/* ── Content ── */}
        <main className="cfg-content">
          <div className="cfg-section-header">
            <h1 className="cfg-section-title">
              {/* Icono del header también sin caja */}
              <div style={{ position: "relative", width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  position: "absolute", inset: -8, borderRadius: "50%",
                  background: `radial-gradient(circle, ${current.accent} 0%, transparent 70%)`,
                  opacity: 0.22, filter: "blur(8px)", pointerEvents: "none",
                }} />
                <Image
                  src={current.img}
                  alt={current.label}
                  width={34}
                  height={34}
                  style={{
                    objectFit: "contain", position: "relative", zIndex: 1,
                    filter: `drop-shadow(0 0 8px ${current.accent}90)`,
                  }}
                />
              </div>
              <span style={{ color: current.accent }}>
                {current.label}
              </span>
            </h1>
            <p className="cfg-section-sub">{current.desc}</p>
          </div>

          <div className="cfg-divider" style={{
            background: `linear-gradient(90deg, transparent, ${current.accent}25, transparent)`,
          }} />

          {active === "video-audio"  && <VideoAudioSection />}
          {active === "privacidad"   && <PrivacidadSection />}
          {active === "moderacion"   && <ModeracionSection />}
          {active === "premium"      && <PremiumSection />}
          {active === "estadisticas" && <EstadisticasSection />}
        </main>
      </div>
    </>
  );
}