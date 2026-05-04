"use client";

/**
 * PrivacidadSection — FUNCIONAL con Supabase
 *
 * ── Cambio de contraseña ─────────────────────────────────────────
 *   supabase.auth.updateUser({ password: newPass })
 *   Requiere sesión activa. Valida que la nueva contraseña tenga
 *   al menos 8 caracteres y que ambas coincidan.
 *
 * ── 2FA (TOTP) ───────────────────────────────────────────────────
 *   Enroll:  supabase.auth.mfa.enroll({ factorType: "totp" })
 *            → devuelve QR en base64 y secret manual
 *   Verify:  supabase.auth.mfa.challengeAndVerify({ factorId, code })
 *            → confirma el factor y lo activa
 *   Unenroll: supabase.auth.mfa.unenroll({ factorId })
 *            → desactiva el factor
 *   Lista:   supabase.auth.mfa.listFactors()
 *            → para saber si ya tiene 2FA activo al cargar
 *
 * ── Verificación de email ────────────────────────────────────────
 *   Se lee de supabase.auth.getUser() → user.email_confirmed_at
 *   Reenvío: supabase.auth.resend({ type: "signup", email })
 *
 * ── Verificación de teléfono ────────────────────────────────────
 *   Se lee de user.phone + user.phone_confirmed_at
 *   Agregar: supabase.auth.updateUser({ phone }) → envía OTP por SMS
 *   Verificar OTP: supabase.auth.verifyOtp({ phone, token, type: "sms" })
 *   Requiere que el proveedor SMS esté configurado en el proyecto Supabase.
 *
 * ── Sesiones activas ────────────────────────────────────────────
 *   Cerrar todas: supabase.auth.signOut({ scope: "global" })
 */

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

// ─── Supabase client ─────────────────────────────────────────────────────────
// Reutiliza el singleton del proyecto si ya existe, o crea uno local.
// En producción reemplazá esto por import { supabase } from "@/services/supabase.client"

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── UI primitivos ───────────────────────────────────────────────────────────

const accent = "#a78bfa";

function Toggle({
  value,
  onChange,
  loading,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={() => !loading && onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none",
        background: value
          ? "linear-gradient(135deg, #a78bfa, #7c5cbf)"
          : "rgba(255,255,255,0.08)",
        boxShadow: value ? "0 0 12px rgba(167,139,250,0.4)" : "none",
        cursor: loading ? "wait" : "pointer",
        position: "relative", flexShrink: 0,
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        opacity: loading ? 0.5 : 1,
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

function ActionBtn({
  label, color = accent, onClick, loading, disabled,
}: {
  label: string; color?: string;
  onClick?: () => void; loading?: boolean; disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={loading || disabled}
      style={{
        padding: "7px 16px", borderRadius: 10,
        background: hover ? `${color}20` : `${color}0d`,
        border: `1px solid ${hover ? color + "55" : color + "28"}`,
        color, fontFamily: "'DM Sans', sans-serif",
        fontSize: 12, fontWeight: 600,
        cursor: loading || disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease", whiteSpace: "nowrap",
        opacity: disabled ? 0.4 : 1,
      }}
    >{loading ? "..." : label}</button>
  );
}

function Row({ label, sub, children }: {
  label: string; sub?: string | React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, padding: "13px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

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

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type = "info" }: { msg: string; type?: "info" | "error" | "success" }) {
  const color = type === "error" ? "#f97316" : type === "success" ? "#4ade80" : accent;
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(5,15,30,0.95)",
      border: `1px solid ${color}35`,
      borderRadius: 100, padding: "8px 20px",
      fontFamily: "'DM Sans', sans-serif", fontSize: 12, color,
      zIndex: 9999, backdropFilter: "blur(12px)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
      animation: "toastIn 0.25s ease",
      whiteSpace: "nowrap",
    }}>
      {msg}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}

// ─── Input de texto ───────────────────────────────────────────────────────────

function Input({
  type = "text", placeholder, value, onChange, autoComplete,
}: {
  type?: string; placeholder?: string; value: string;
  onChange: (v: string) => void; autoComplete?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      autoComplete={autoComplete}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10, padding: "10px 14px",
        color: "#e8f4fd", fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        outline: "none",
        transition: "border-color 0.2s",
      }}
      onFocus={e => e.target.style.borderColor = `${accent}55`}
      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
    />
  );
}

// ─── Modal base ───────────────────────────────────────────────────────────────

function Modal({
  title, onClose, children,
}: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)", zIndex: 1000,
        }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1001, width: "min(460px, 94vw)",
        background: "rgba(5,15,30,0.98)",
        border: "1px solid rgba(167,139,250,0.18)",
        borderRadius: 20, padding: 28,
        boxShadow: "0 0 60px rgba(167,139,250,0.1), 0 24px 80px rgba(0,0,0,0.8)",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 24,
        }}>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800,
            color: accent, letterSpacing: -0.3,
          }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "rgba(255,255,255,0.5)",
              width: 28, height: 28, cursor: "pointer", fontSize: 14,
            }}
          >✕</button>
        </div>
        {children}
      </div>
    </>
  );
}

// ─── Modal: Cambiar contraseña ────────────────────────────────────────────────

function ModalPassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "error" | "success" } | null>(null);

  const showToast = (msg: string, type: "info" | "error" | "success" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async () => {
    if (!next || !confirm) { showToast("Completá todos los campos", "error"); return; }
    if (next.length < 8) { showToast("La contraseña debe tener al menos 8 caracteres", "error"); return; }
    if (next !== confirm) { showToast("Las contraseñas no coinciden", "error"); return; }

    setLoading(true);
    const supabase = getSupabase();

    // Supabase no requiere la contraseña actual si hay sesión activa.
    // Para mayor seguridad, re-autenticamos primero con el email del usuario.
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      showToast("Sesión expirada. Volvé a iniciar sesión.", "error");
      setLoading(false);
      return;
    }

    // Re-autenticar con contraseña actual si se proporcionó
    if (current) {
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: userData.user.email!,
        password: current,
      });
      if (reAuthError) {
        showToast("Contraseña actual incorrecta", "error");
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    setLoading(false);

    if (error) {
      showToast(error.message ?? "Error al cambiar contraseña", "error");
    } else {
      showToast("✓ Contraseña actualizada", "success");
      setTimeout(onClose, 1200);
    }
  };

  return (
    <Modal title="🔑 Cambiar contraseña" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(180,215,240,0.45)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
            Contraseña actual (para mayor seguridad)
          </div>
          <Input
            type="password"
            placeholder="••••••••"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "rgba(180,215,240,0.45)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
            Nueva contraseña (mínimo 8 caracteres)
          </div>
          <Input
            type="password"
            placeholder="••••••••"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "rgba(180,215,240,0.45)", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
            Confirmar nueva contraseña
          </div>
          <Input
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
        </div>

        {/* Indicador de fuerza */}
        {next.length > 0 && (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {[1, 2, 3, 4].map(i => {
              const strength = next.length >= 12 && /[A-Z]/.test(next) && /[0-9]/.test(next) && /[^a-zA-Z0-9]/.test(next) ? 4
                : next.length >= 10 && /[A-Z]/.test(next) && /[0-9]/.test(next) ? 3
                : next.length >= 8 ? 2 : 1;
              const color = strength >= 3 ? "#4ade80" : strength === 2 ? "#fbbf24" : "#f87171";
              return (
                <div key={i} style={{
                  height: 3, flex: 1, borderRadius: 2,
                  background: i <= strength ? color : "rgba(255,255,255,0.08)",
                  transition: "background 0.3s",
                }} />
              );
            })}
            <span style={{
              fontSize: 10, fontFamily: "'DM Sans', sans-serif",
              color: "rgba(180,215,240,0.4)", marginLeft: 6, whiteSpace: "nowrap",
            }}>
              {next.length >= 12 && /[A-Z]/.test(next) && /[0-9]/.test(next) && /[^a-zA-Z0-9]/.test(next) ? "Muy segura"
                : next.length >= 10 && /[A-Z]/.test(next) ? "Segura"
                : next.length >= 8 ? "Aceptable" : "Débil"}
            </span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            marginTop: 8, padding: "11px 0", borderRadius: 12,
            background: loading
              ? "rgba(167,139,250,0.1)"
              : "linear-gradient(135deg, #a78bfa, #7c5cbf)",
            border: "none",
            color: "#fff", fontFamily: "'DM Sans', sans-serif",
            fontSize: 14, fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            transition: "opacity 0.2s",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </Modal>
  );
}

// ─── Modal: 2FA TOTP ──────────────────────────────────────────────────────────

function Modal2FA({
  onClose, onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"enroll" | "verify">("enroll");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "error" | "success" } | null>(null);

  const showToast = (msg: string, type: "info" | "error" | "success" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Enroll al montar
  useEffect(() => {
    const enroll = async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Turrinder Authenticator",
      });

      setEnrolling(false);

      if (error || !data) {
        showToast("Error al generar el QR. Intentá de nuevo.", "error");
        return;
      }

      setFactorId(data.id);
      setQrUrl(data.totp.qr_code);   // ya viene en base64 dataURL
      setSecret(data.totp.secret);
    };

    enroll();
  }, []);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      showToast("Ingresá el código de 6 dígitos", "error");
      return;
    }
    if (!factorId) { showToast("Error de enroll, reiniciá", "error"); return; }

    setLoading(true);
    const supabase = getSupabase();

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    setLoading(false);

    if (error) {
      showToast("Código incorrecto. Verificá tu app.", "error");
    } else {
      showToast("✓ 2FA activado correctamente", "success");
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    }
  };

  return (
    <Modal title="🔐 Activar autenticación de dos factores" onClose={onClose}>
      {enrolling ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 16, padding: "20px 0",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: `3px solid ${accent}30`,
            borderTop: `3px solid ${accent}`,
            animation: "spin2fa 0.8s linear infinite",
          }} />
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
            color: "rgba(180,215,240,0.45)",
          }}>Generando QR...</div>
          <style>{`@keyframes spin2fa { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* QR */}
          {qrUrl && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{
                padding: 12, borderRadius: 16,
                background: "#fff",
                border: `2px solid ${accent}30`,
                display: "inline-block",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR 2FA" width={160} height={160} style={{ display: "block" }} />
              </div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                color: "rgba(180,215,240,0.5)", textAlign: "center", lineHeight: 1.5,
              }}>
                Escaneá con <strong style={{ color: "rgba(240,248,255,0.7)" }}>Google Authenticator</strong>,{" "}
                <strong style={{ color: "rgba(240,248,255,0.7)" }}>Authy</strong> o cualquier app TOTP
              </div>

              {/* Secret manual */}
              {secret && (
                <div style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, padding: "10px 14px",
                }}>
                  <div style={{
                    fontSize: 10, fontFamily: "'DM Sans', sans-serif",
                    color: "rgba(180,215,240,0.35)", marginBottom: 4, letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>Clave manual (si no podés escanear)</div>
                  <div style={{
                    fontFamily: "monospace", fontSize: 13,
                    color: accent, wordBreak: "break-all", letterSpacing: 2,
                  }}>{secret}</div>
                </div>
              )}
            </div>
          )}

          {/* Código */}
          <div>
            <div style={{
              fontSize: 11, color: "rgba(180,215,240,0.45)",
              marginBottom: 8, fontFamily: "'DM Sans', sans-serif",
            }}>
              Ingresá el código de 6 dígitos de tu app
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: `1px solid ${accent}30`,
                borderRadius: 10, padding: "12px 14px",
                color: "#e8f4fd", fontFamily: "monospace",
                fontSize: 22, letterSpacing: 8, textAlign: "center",
                outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = `${accent}70`}
              onBlur={e => e.target.style.borderColor = `${accent}30`}
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            style={{
              padding: "11px 0", borderRadius: 12,
              background: code.length === 6
                ? "linear-gradient(135deg, #a78bfa, #7c5cbf)"
                : "rgba(167,139,250,0.08)",
              border: "none",
              color: code.length === 6 ? "#fff" : accent,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, fontWeight: 700,
              cursor: loading || code.length !== 6 ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Verificando..." : "Activar 2FA"}
          </button>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </Modal>
  );
}

// ─── Modal: Desactivar 2FA ────────────────────────────────────────────────────

function ModalDisable2FA({
  factorId, onClose, onSuccess,
}: {
  factorId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "error" | "success" } | null>(null);

  const showToast = (msg: string, type: "info" | "error" | "success" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDisable = async () => {
    if (!code || code.length !== 6) {
      showToast("Ingresá el código de 6 dígitos", "error");
      return;
    }

    setLoading(true);
    const supabase = getSupabase();

    // Verificar el código antes de desactivar
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (verifyError) {
      showToast("Código incorrecto", "error");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setLoading(false);

    if (error) {
      showToast("Error al desactivar 2FA", "error");
    } else {
      showToast("2FA desactivado", "success");
      setTimeout(() => { onSuccess(); onClose(); }, 1000);
    }
  };

  return (
    <Modal title="⚠️ Desactivar 2FA" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{
          padding: "12px 16px", borderRadius: 12,
          background: "rgba(249,115,22,0.08)",
          border: "1px solid rgba(249,115,22,0.2)",
          fontFamily: "'DM Sans', sans-serif", fontSize: 12,
          color: "rgba(249,180,100,0.8)", lineHeight: 1.5,
        }}>
          Desactivar 2FA reduce la seguridad de tu cuenta. Necesitás confirmar con tu app autenticadora.
        </div>

        <div>
          <div style={{
            fontSize: 11, color: "rgba(180,215,240,0.45)",
            marginBottom: 8, fontFamily: "'DM Sans', sans-serif",
          }}>
            Código de tu app autenticadora
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(249,115,22,0.3)",
              borderRadius: 10, padding: "12px 14px",
              color: "#e8f4fd", fontFamily: "monospace",
              fontSize: 22, letterSpacing: 8, textAlign: "center", outline: "none",
            }}
          />
        </div>

        <button
          onClick={handleDisable}
          disabled={loading || code.length !== 6}
          style={{
            padding: "11px 0", borderRadius: 12,
            background: "rgba(249,115,22,0.15)",
            border: "1px solid rgba(249,115,22,0.3)",
            color: "#f97316", fontFamily: "'DM Sans', sans-serif",
            fontSize: 14, fontWeight: 700,
            cursor: loading || code.length !== 6 ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Desactivando..." : "Confirmar desactivación"}
        </button>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </Modal>
  );
}

// ─── Modal: Agregar teléfono ──────────────────────────────────────────────────

function ModalPhone({
  currentPhone, onClose, onSuccess,
}: {
  currentPhone: string | null; onClose: () => void; onSuccess: (phone: string) => void;
}) {
  const [step, setStep] = useState<"input" | "verify">("input");
  const [phone, setPhone] = useState(currentPhone ?? "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "info" | "error" | "success" } | null>(null);

  const showToast = (msg: string, type: "info" | "error" | "success" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!cleaned.startsWith("+") || cleaned.length < 10) {
      showToast("Ingresá el número con código de país (+54...)", "error");
      return;
    }

    setLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ phone: cleaned });
    setLoading(false);

    if (error) {
      showToast(error.message ?? "Error al enviar SMS", "error");
    } else {
      showToast("✓ SMS enviado", "success");
      setStep("verify");
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) { showToast("Ingresá el código", "error"); return; }

    setLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.replace(/\s/g, ""),
      token: otp,
      type: "sms",
    });
    setLoading(false);

    if (error) {
      showToast("Código incorrecto o expirado", "error");
    } else {
      showToast("✓ Teléfono verificado", "success");
      setTimeout(() => { onSuccess(phone); onClose(); }, 1000);
    }
  };

  return (
    <Modal
      title={currentPhone ? "📱 Cambiar teléfono" : "📱 Agregar teléfono"}
      onClose={onClose}
    >
      {step === "input" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
            color: "rgba(180,215,240,0.45)", lineHeight: 1.5,
          }}>
            Ingresá tu número con código de país. Te enviaremos un SMS de verificación.
          </div>
          <Input
            type="tel"
            placeholder="+54 9 11 1234 5678"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
          />
          <button
            onClick={handleSendOtp}
            disabled={loading}
            style={{
              padding: "11px 0", borderRadius: 12,
              background: "linear-gradient(135deg, #a78bfa, #7c5cbf)",
              border: "none", color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Enviando SMS..." : "Enviar código"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
            color: "rgba(180,215,240,0.45)", lineHeight: 1.5,
          }}>
            Ingresá el código que recibiste en <strong style={{ color: "rgba(240,248,255,0.7)" }}>{phone}</strong>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)",
              border: `1px solid ${accent}30`,
              borderRadius: 10, padding: "12px 14px",
              color: "#e8f4fd", fontFamily: "monospace",
              fontSize: 22, letterSpacing: 8, textAlign: "center", outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setStep("input")}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(240,248,255,0.6)",
                fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                cursor: "pointer",
              }}
            >← Volver</button>
            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              style={{
                flex: 2, padding: "10px 0", borderRadius: 12,
                background: "linear-gradient(135deg, #a78bfa, #7c5cbf)",
                border: "none", color: "#fff",
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >{loading ? "Verificando..." : "Verificar"}</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </Modal>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PrivacidadSection() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Estado 2FA
  const [twofa, setTwofa] = useState(false);
  const [twofaFactorId, setTwofaFactorId] = useState<string | null>(null);
  const [twofaLoading, setTwofaLoading] = useState(false);

  // Modales
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  // Toast global de la sección
  const [toast, setToast] = useState<{ msg: string; type: "info" | "error" | "success" } | null>(null);

  // Estado local de teléfono (para reflejo inmediato sin reload)
  const [phoneLocal, setPhoneLocal] = useState<string | null>(null);
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);

  // Estado para reenvío de email
  const [resendingEmail, setResendingEmail] = useState(false);

  // Estado para cerrar sesiones
  const [closingSessions, setClosingSessions] = useState(false);

  const showToast = (msg: string, type: "info" | "error" | "success" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Cargar usuario y 2FA al montar ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = getSupabase();

      const { data: userData } = await supabase.auth.getUser();
      const u = userData.user;
      setUser(u ?? null);

      if (u) {
        setPhoneLocal(u.phone ?? null);
        setPhoneConfirmed(!!u.phone_confirmed_at);
      }

      // Verificar si ya tiene 2FA activo
      const { data: mfaData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = mfaData?.totp?.find(f => f.status === "verified");
      if (verifiedFactor) {
        setTwofa(true);
        setTwofaFactorId(verifiedFactor.id);
      }

      setLoadingUser(false);
    };

    load();
  }, []);

  // ── Reenviar email de verificación ───────────────────────────────────────
  const handleResendEmail = async () => {
    if (!user?.email) return;
    setResendingEmail(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
    });
    setResendingEmail(false);
    if (error) {
      showToast("Error al reenviar el email", "error");
    } else {
      showToast("✓ Email de verificación enviado", "success");
    }
  };

  // ── Cerrar todas las sesiones ────────────────────────────────────────────
  const handleCloseAllSessions = async () => {
    setClosingSessions(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setClosingSessions(false);
    if (error) {
      showToast("Error al cerrar sesiones", "error");
    } else {
      showToast("✓ Todas las sesiones cerradas", "success");
      // Redirigir al login después de un momento
      setTimeout(() => window.location.href = "/auth/login", 1500);
    }
  };

  const emailVerified  = !!user?.email_confirmed_at;
  const emailDisplay   = user?.email
    ? user.email.replace(/(.{2}).+(@.+)/, "$1···$2")
    : "—";

  const phoneDisplay = phoneLocal
    ? phoneLocal.replace(/(\+\d{2,3})\d+(\d{4})/, "$1 ···· $2")
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingUser) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "60px 0", gap: 14,
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          border: `2px solid ${accent}30`,
          borderTop: `2px solid ${accent}`,
          animation: "spinPri 0.7s linear infinite",
        }} />
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 13,
          color: "rgba(180,215,240,0.4)",
        }}>Cargando...</span>
        <style>{`@keyframes spinPri { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      {/* ── Seguridad de cuenta ── */}
      <Block title="Seguridad">

        <Row
          label="Autenticación de dos factores"
          sub={twofa
            ? "Activa · app autenticadora (TOTP)"
            : "Protegé tu cuenta con un segundo factor"}
        >
          {twofa && <Badge label="ACTIVO" color="#4ade80" />}
          <Toggle
            value={twofa}
            loading={twofaLoading}
            onChange={(val) => {
              if (val) {
                setShow2FA(true);
              } else {
                setShowDisable2FA(true);
              }
            }}
          />
        </Row>

        <Row
          label="Contraseña"
          sub={user?.last_sign_in_at
            ? `Último acceso: ${new Date(user.last_sign_in_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}`
            : "Actualizá tu contraseña regularmente"}
        >
          <ActionBtn label="Cambiar" onClick={() => setShowPassword(true)} />
        </Row>

        <Row
          label="Cerrar todas las sesiones"
          sub="Desconectá todos los dispositivos activos"
        >
          <ActionBtn
            label="Cerrar sesiones"
            color="#f97316"
            loading={closingSessions}
            onClick={handleCloseAllSessions}
          />
        </Row>
      </Block>

      {/* ── Verificación ── */}
      <Block title="Verificación">

        <Row
          label="Email"
          sub={emailDisplay}
        >
          {emailVerified ? (
            <Badge label="VERIFICADO" color="#4ade80" />
          ) : (
            <>
              <Badge label="PENDIENTE" color="#f97316" />
              <ActionBtn
                label="Reenviar"
                loading={resendingEmail}
                onClick={handleResendEmail}
              />
            </>
          )}
        </Row>

        <Row
          label="Teléfono"
          sub={phoneDisplay ?? "No configurado · agrega un número para mayor seguridad"}
        >
          {phoneLocal ? (
            <>
              <Badge
                label={phoneConfirmed ? "VERIFICADO" : "PENDIENTE"}
                color={phoneConfirmed ? "#4ade80" : "#f97316"}
              />
              <ActionBtn label="Cambiar" onClick={() => setShowPhone(true)} />
            </>
          ) : (
            <ActionBtn label="Agregar" onClick={() => setShowPhone(true)} />
          )}
        </Row>
      </Block>

      {/* ── Modales ── */}
      {showPassword && (
        <ModalPassword onClose={() => setShowPassword(false)} />
      )}

      {show2FA && (
        <Modal2FA
          onClose={() => setShow2FA(false)}
          onSuccess={() => {
            setTwofa(true);
            // Recargar factorId
            getSupabase().auth.mfa.listFactors().then(({ data }) => {
              const f = data?.totp?.find(f => f.status === "verified");
              if (f) setTwofaFactorId(f.id);
            });
          }}
        />
      )}

      {showDisable2FA && twofaFactorId && (
        <ModalDisable2FA
          factorId={twofaFactorId}
          onClose={() => setShowDisable2FA(false)}
          onSuccess={() => {
            setTwofa(false);
            setTwofaFactorId(null);
          }}
        />
      )}

      {showPhone && (
        <ModalPhone
          currentPhone={phoneLocal}
          onClose={() => setShowPhone(false)}
          onSuccess={(phone) => {
            setPhoneLocal(phone);
            setPhoneConfirmed(false); // estará pendiente hasta verificar
          }}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  );
}