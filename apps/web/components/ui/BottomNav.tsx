"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import imgLogo        from "../../Images/logo.png";
import imgLogoVip     from "../../Images/logovip.png";
import imgChat        from "../../Images/chat.png";
import imgDiscover    from "../../Images/discover.png";
import imgModalidades from "../../Images/modalidades.png";
import imgPerfil         from "../../Images/perfil.png";
import imgConfiguracion  from "../../Images/configuracion.png";
import imgStreamer       from "../../Images/debates.png";
import imgFeedback       from "../../Images/feedback.png";
import { enviarFeedback } from '@/services/discordService';
import { supabase } from "@/services/supabase.client";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { useIsGuest } from "@/hooks/useGuestGuard";

initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, {
  locale: "es-AR",
});

// ─────────────────────────────────────────────────────────
// GUEST BLOCK MODAL
// ─────────────────────────────────────────────────────────
function GuestBlockModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 350); };
  const handleRegister = () => {
    setVisible(false);
    setTimeout(() => router.push("/auth/register"), 350);
  };

  return (
    <>
      <style>{`
        .gb-backdrop {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(0,0,0,0);
          backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px);
          transition: background 0.35s ease, backdrop-filter 0.35s ease;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .gb-backdrop.in {
          background: rgba(0,0,10,0.82);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        }
        .gb-modal {
          width: 100%; max-width: 380px;
          background: linear-gradient(160deg, #05101e 0%, #020a16 100%);
          border: 1px solid rgba(84,199,248,0.18);
          border-radius: 24px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.75), 0 0 60px rgba(84,199,248,0.06), inset 0 1px 0 rgba(84,199,248,0.10);
          padding: 36px 28px 28px;
          text-align: center;
          opacity: 0; transform: translateY(24px) scale(0.96);
          transition: opacity 0.38s cubic-bezier(0.16,1,0.3,1), transform 0.38s cubic-bezier(0.16,1,0.3,1);
          position: relative; overflow: hidden;
        }
        .gb-modal.in { opacity: 1; transform: translateY(0) scale(1); }
        .gb-modal::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(84,199,248,0.5), transparent);
        }
        .gb-aurora {
          position: absolute; top: 0; left: 0; right: 0; height: 160px;
          pointer-events: none;
          background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(84,199,248,0.14) 0%, transparent 65%);
        }
        .gb-icon { font-size: 48px; margin-bottom: 14px; display: block; animation: gbFloat 3s ease-in-out infinite; }
        @keyframes gbFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .gb-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #f5f8ff; letter-spacing: -0.5px; margin-bottom: 8px; position: relative; }
        .gb-sub { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(180,215,240,0.45); line-height: 1.6; margin-bottom: 26px; position: relative; }
        .gb-sub strong { color: rgba(84,199,248,0.8); font-weight: 600; }
        .gb-btn-primary {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #54c7f8 0%, #3b9eda 50%, #1a6fa8 100%);
          border: none; border-radius: 13px; color: #02080f;
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800;
          cursor: pointer; margin-bottom: 10px;
          box-shadow: 0 8px 28px rgba(84,199,248,0.4);
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          position: relative; overflow: hidden;
        }
        .gb-btn-primary::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,0.2),transparent 55%);
        }
        .gb-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(84,199,248,0.55); }
        .gb-btn-secondary {
          width: 100%; padding: 13px; background: transparent;
          border: 1px solid rgba(84,199,248,0.12); border-radius: 13px;
          color: rgba(143,212,255,0.4); font-family: 'DM Sans', sans-serif;
          font-size: 13px; cursor: pointer; transition: all 0.2s ease;
        }
        .gb-btn-secondary:hover {
          background: rgba(84,199,248,0.04);
          border-color: rgba(84,199,248,0.22);
          color: rgba(143,212,255,0.65);
        }
      `}</style>
      <div className={`gb-backdrop ${visible ? "in" : ""}`} onClick={handleClose}>
        <div className={`gb-modal ${visible ? "in" : ""}`} onClick={e => e.stopPropagation()}>
          <div className="gb-aurora" />
          <span className="gb-icon">🔒</span>
          <div className="gb-title">Creá tu cuenta</div>
          <p className="gb-sub">
            Esta función es solo para usuarios registrados.<br />
            <strong>Es gratis y tarda menos de 60 segundos.</strong>
          </p>
          <button className="gb-btn-primary" onClick={handleRegister}>
            Registrarme gratis →
          </button>
          <button className="gb-btn-secondary" onClick={handleClose}>
            Seguir explorando
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// FEEDBACK MODAL
// ─────────────────────────────────────────────────────────
type FeedbackType = "bug" | "idea" | "consulta" | "otro";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string; color: string }[] = [
  { value: "bug",     label: "Bug",       emoji: "🐛", color: "#f87171" },
  { value: "idea",    label: "Idea",      emoji: "💡", color: "#fbbf24" },
  { value: "consulta",label: "Consulta",  emoji: "💬", color: "#60a5fa" },
  { value: "otro",    label: "Otro",      emoji: "📝", color: "#a78bfa" },
];

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [visible,  setVisible]  = useState(false);
  const [type,     setType]     = useState<FeedbackType>("bug");
  const [message,  setMessage]  = useState("");
  const [email,    setEmail]    = useState("");
  const [status,   setStatus]   = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errMsg,   setErrMsg]   = useState("");

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 380); };

  const handleSubmit = async () => {
    if (!message.trim()) { setErrMsg("Por favor escribí tu mensaje."); return; }
    setStatus("sending"); setErrMsg("");
    try {
      const { data } = await supabase.auth.getUser();
      const userName = data.user?.user_metadata?.full_name ?? data.user?.email ?? "Anónimo";
      const userId = data.user?.id ?? 'desconocido';
      await enviarFeedback(type, `[${userName}] ${message.trim()}`, email, userId);
      setStatus("success");
    } catch (e) {
      console.error(e);
      setErrMsg("No se pudo enviar. Intentá de nuevo.");
      setStatus("error");
    }
  };

  const chosen = FEEDBACK_TYPES.find(f => f.value === type)!;

  return (
    <>
      <style>{`
        .fb-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0);
          backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px);
          transition: background 0.38s ease, backdrop-filter 0.38s ease;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .fb-backdrop.in {
          background: rgba(0,0,10,0.80);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        }
        .fb-modal {
          position: relative; z-index: 201;
          width: 100%; max-width: 460px;
          background: linear-gradient(160deg, #05101e 0%, #020a16 70%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06);
          overflow: hidden;
          opacity: 0; transform: translateY(28px) scale(0.96);
          transition: opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        .fb-modal.in { opacity: 1; transform: translateY(0) scale(1); }
        .fb-modal::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
        }
        .fb-aurora {
          position: absolute; top: 0; left: 0; right: 0; height: 180px;
          pointer-events: none; z-index: 0;
          transition: background 0.4s ease;
        }
        .fb-close {
          position: absolute; top: 14px; right: 14px; z-index: 10;
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.35); font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s ease;
        }
        .fb-close:hover { background: rgba(255,255,255,0.09); color: #fff; }
        .fb-header { position: relative; z-index: 1; padding: 32px 28px 18px; text-align: center; }
        .fb-emoji { font-size: 38px; display: block; margin-bottom: 10px; transition: all 0.25s ease; line-height: 1; }
        .fb-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #f5f8ff; letter-spacing: -0.5px; margin-bottom: 4px; }
        .fb-subtitle { font-family: 'DM Sans', sans-serif; font-size: 12.5px; color: rgba(180,215,240,0.38); }
        .fb-types { position: relative; z-index: 1; display: flex; gap: 8px; padding: 0 22px 16px; }
        .fb-type-chip {
          flex: 1; padding: 9px 6px; border-radius: 12px; cursor: pointer;
          border: 1.5px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
          font-family: 'DM Sans', sans-serif;
        }
        .fb-type-chip:hover { background: rgba(255,255,255,0.05); }
        .fb-type-chip.sel {
          background: var(--chip-bg);
          border-color: var(--chip-border);
          box-shadow: 0 0 14px var(--chip-glow);
        }
        .fb-type-emoji { font-size: 16px; line-height: 1; }
        .fb-type-label { font-size: 10px; font-weight: 600; letter-spacing: 0.5px; color: rgba(180,215,240,0.35); transition: color 0.2s; }
        .fb-type-chip.sel .fb-type-label { color: #f5f8ff; }
        .fb-body { position: relative; z-index: 1; padding: 0 22px 8px; display: flex; flex-direction: column; gap: 12px; }
        .fb-label { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(180,215,240,0.3); margin-bottom: 5px; display: block; }
        .fb-input, .fb-textarea {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; color: #f0f8ff;
          font-family: 'DM Sans', sans-serif; font-size: 13.5px;
          outline: none; transition: border-color 0.2s ease, box-shadow 0.2s ease;
          resize: none; box-sizing: border-box;
        }
        .fb-input { padding: 11px 14px; }
        .fb-textarea { padding: 12px 14px; min-height: 110px; line-height: 1.55; }
        .fb-input::placeholder, .fb-textarea::placeholder { color: rgba(180,215,240,0.18); }
        .fb-input:focus, .fb-textarea:focus { border-color: rgba(255,255,255,0.18); box-shadow: 0 0 0 3px rgba(255,255,255,0.04); }
        .fb-char { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(180,215,240,0.2); text-align: right; margin-top: 3px; }
        .fb-err { padding: 9px 14px; background: rgba(248,113,113,0.07); border: 1px solid rgba(248,113,113,0.22); border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 12px; color: #fca5a5; }
        .fb-cta { position: relative; z-index: 1; padding: 8px 22px 26px; display: flex; flex-direction: column; gap: 8px; }
        .fb-btn-send {
          width: 100%; padding: 14px;
          background: var(--btn-bg, rgba(255,255,255,0.06));
          border: 1.5px solid var(--btn-border, rgba(255,255,255,0.1));
          border-radius: 14px;
          font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800;
          color: #f5f8ff; cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: var(--btn-shadow, none);
          letter-spacing: -0.2px;
        }
        .fb-btn-send:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
        .fb-btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .fb-btn-cancel { width: 100%; padding: 12px; background: transparent; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(180,215,240,0.3); cursor: pointer; transition: all 0.2s ease; }
        .fb-btn-cancel:hover { background: rgba(255,255,255,0.03); color: rgba(180,215,240,0.55); }
        .fb-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fb-success { text-align: center; padding: 28px 22px 36px; position: relative; z-index: 1; }
        @keyframes successPop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        .fb-success-icon { font-size: 52px; animation: successPop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; margin-bottom: 14px; display: block; }
        .fb-success-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #f5f8ff; margin-bottom: 6px; }
        .fb-success-sub { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(180,215,240,0.42); }
      `}</style>

      <div className={`fb-backdrop ${visible ? "in" : ""}`} onClick={handleClose}>
        <div className={`fb-modal ${visible ? "in" : ""}`} onClick={e => e.stopPropagation()}>
          <div className="fb-aurora" style={{
            background: `radial-gradient(ellipse 70% 50% at 50% -5%, ${chosen.color}22 0%, transparent 65%)`
          }} />

          <button className="fb-close" onClick={handleClose}>✕</button>

          {status === "success" ? (
            <div className="fb-success">
              <span className="fb-success-icon">🚀</span>
              <div className="fb-success-title">¡Gracias por tu feedback!</div>
              <div className="fb-success-sub">Lo revisamos cuanto antes y mejoramos Turrinder para vos.</div>
            </div>
          ) : (
            <>
              <div className="fb-header">
                <span className="fb-emoji" style={{ filter: `drop-shadow(0 0 12px ${chosen.color}88)` }}>
                  {chosen.emoji}
                </span>
                <div className="fb-title">Feedback & Soporte</div>
                <div className="fb-subtitle">Tu opinión nos ayuda a mejorar la plataforma.</div>
              </div>

              <div className="fb-types">
                {FEEDBACK_TYPES.map(f => (
                  <button
                    key={f.value}
                    className={`fb-type-chip ${type === f.value ? "sel" : ""}`}
                    onClick={() => setType(f.value)}
                    style={{
                      "--chip-bg":     `${f.color}14`,
                      "--chip-border": `${f.color}44`,
                      "--chip-glow":   `${f.color}22`,
                    } as React.CSSProperties}
                  >
                    <span className="fb-type-emoji">{f.emoji}</span>
                    <span className="fb-type-label">{f.label}</span>
                  </button>
                ))}
              </div>

              <div className="fb-body">
                <div>
                  <label className="fb-label">Tu email (opcional)</label>
                  <input
                    className="fb-input"
                    type="email"
                    placeholder="para que podamos responderte"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="fb-label">Mensaje</label>
                  <textarea
                    className="fb-textarea"
                    placeholder={
                      type === "bug"      ? "Describí el bug: ¿qué pasó? ¿en qué pantalla?" :
                      type === "idea"     ? "¿Qué feature o mejora te gustaría ver?" :
                      type === "consulta" ? "¿En qué te podemos ayudar?" :
                                           "Contanos lo que querés..."
                    }
                    value={message}
                    maxLength={1000}
                    onChange={e => setMessage(e.target.value)}
                  />
                  <div className="fb-char">{message.length}/1000</div>
                </div>

                {errMsg && <div className="fb-err">⚠️ {errMsg}</div>}
              </div>

              <div className="fb-cta">
                <button
                  className="fb-btn-send"
                  onClick={handleSubmit}
                  disabled={status === "sending"}
                  style={{
                    "--btn-bg":     `${chosen.color}18`,
                    "--btn-border": `${chosen.color}44`,
                    "--btn-shadow": `0 0 20px ${chosen.color}22`,
                  } as React.CSSProperties}
                >
                  {status === "sending" ? (
                    <><span className="fb-spinner" /> Enviando...</>
                  ) : (
                    <>{chosen.emoji} Enviar {chosen.label}</>
                  )}
                </button>
                <button className="fb-btn-cancel" onClick={handleClose}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// TYPES & CONSTANTS (VIP)
// ─────────────────────────────────────────────────────────
type VipPlan    = "monthly" | "annual";
type VipCountry = "AR" | "OTHER";
type PayMethod  = "mp" | "paypal";

const VIP_PRICES = {
  AR: {
    monthly: { display: "$4.999", sub: "ARS / mes", save: null },
    annual:  { display: "$39.999", sub: "ARS / año", save: "Ahorrás $20.000" }
  },
  OTHER: {
    monthly: { display: "$3.99", sub: "USD / mes", save: null },
    annual:  { display: "$29.99", sub: "USD / año", save: "Save $19.89" }
  }
};

const PAYPAL_PLAN_IDS: Record<VipPlan, string> = {
  monthly: process.env.NEXT_PUBLIC_PAYPAL_PLAN_MONTHLY ?? "P-MONTHLY_PLAN_ID",
  annual:  process.env.NEXT_PUBLIC_PAYPAL_PLAN_ANNUAL  ?? "P-ANNUAL_PLAN_ID",
};

const FREE_FEATURES = [
  { label: "Sin anuncios",        has: false },
  { label: "Likes ilimitados",    has: false },
  { label: "Salas privadas",      has: false },
  { label: "Chats ilimitados",    has: true  },
  { label: "Videollamadas",       has: true  },
  { label: "Descubrí personas",   has: true  },
];

const VIP_FEATURES = [
  { label: "Sin anuncios",         has: true },
  { label: "Likes ilimitados",     has: true },
  { label: "Crear salas privadas", has: true },
  { label: "Chats ilimitados",     has: true },
  { label: "Videollamadas",        has: true },
  { label: "Descubrí personas",    has: true },
];

async function detectCountry(): Promise<VipCountry> {
  try {
    const res  = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return data.country_code === "AR" ? "AR" : "OTHER";
  } catch { return "OTHER"; }
}

// ─────────────────────────────────────────────────────────
// PAYPAL BUTTON
// ─────────────────────────────────────────────────────────
function PayPalSubscribeButton({
  planId,
  onError,
  onApprove,
}: {
  planId: string;
  onError: (msg: string) => void;
  onApprove: (subscriptionId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered     = useRef(false);

  useEffect(() => {
    if (rendered.current) return;
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) { onError("PayPal client ID no configurado."); return; }
    const existingScript = document.getElementById("paypal-sdk");
    const renderButton = () => {
      if (!containerRef.current) return;
      const pp = (window as any).paypal;
      if (!pp) { onError("No se pudo cargar PayPal."); return; }
      pp.Buttons({
        style: { shape: "rect", color: "gold", layout: "horizontal", label: "subscribe", height: 48 },
        createSubscription: (_data: any, actions: any) => actions.subscription.create({ plan_id: planId }),
        onApprove: (data: any) => onApprove(data.subscriptionID),
        onError:   (err: any) => { console.error(err); onError("Error al procesar el pago con PayPal."); },
      }).render(containerRef.current);
      rendered.current = true;
    };
    if (existingScript) { renderButton(); return; }
    const script = document.createElement("script");
    script.id  = "paypal-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription&currency=USD`;
    script.addEventListener("load", renderButton);
    script.addEventListener("error", () => onError("No se pudo cargar PayPal SDK."));
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  return <div ref={containerRef} style={{ width: "100%", minHeight: 48, borderRadius: 14, overflow: "hidden" }} />;
}

// ─────────────────────────────────────────────────────────
// VIP MODAL
// ─────────────────────────────────────────────────────────
function VIPModal({ onClose }: { onClose: () => void }) {
  const [visible,      setVisible]      = useState(false);
  const [plan,         setPlan]         = useState<VipPlan>("monthly");
  const [country,      setCountry]      = useState<VipCountry>("OTHER");
  const [payMethod,    setPayMethod]    = useState<PayMethod>("mp");
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [countryReady, setCountryReady] = useState(false);
  const [ppSuccess,    setPpSuccess]    = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    detectCountry().then(c => { setCountry(c); setCountryReady(true); });
  }, []);

  useEffect(() => {
    if (countryReady) setPayMethod(country === "AR" ? "mp" : "paypal");
  }, [country, countryReady]);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 380); };

  useEffect(() => {
    if (!countryReady || payMethod !== "mp") return;
    let cancelled = false;
    const createPreference = async () => {
      setPreferenceId(null); setError(null); setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Tenés que estar logueado."); setLoading(false); return; }
        const res  = await fetch("/api/mp/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, userId: user.id, country }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.preferenceId) { setError(data.error ?? "Error al preparar el pago."); return; }
        setPreferenceId(data.preferenceId);
      } catch { if (!cancelled) setError("Error de conexión."); }
      finally  { if (!cancelled) setLoading(false); }
    };
    createPreference();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, countryReady, payMethod]);

  const prices = VIP_PRICES[country];

  const handlePayPalApprove = async (subscriptionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await fetch("/api/paypal/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, plan, userId: user?.id }),
      });
      setPpSuccess(true);
    } catch {
      setError("Pago aprobado pero error al activar. Contactá soporte.");
    }
  };

  return (
    <>
      <style>{`
        .vip-modal-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0);
          backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px);
          transition: background 0.38s ease, backdrop-filter 0.38s ease;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .vip-modal-backdrop.in {
          background: rgba(0,0,10,0.82);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        }
        .vip-modal {
          position: relative; z-index: 201;
          width: 100%; max-width: 560px;
          background: linear-gradient(160deg, #05101e 0%, #020a16 60%, #030d1a 100%);
          border: 1px solid rgba(255,195,0,0.18);
          border-radius: 24px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(255,195,0,0.06), inset 0 1px 0 rgba(255,195,0,0.10);
          overflow: hidden;
          opacity: 0; transform: translateY(32px) scale(0.95);
          transition: opacity 0.42s cubic-bezier(0.16,1,0.3,1), transform 0.42s cubic-bezier(0.16,1,0.3,1);
          max-height: 90vh; overflow-y: auto;
        }
        .vip-modal.in { opacity: 1; transform: translateY(0) scale(1); }
        .vip-modal::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,195,0,0.55), transparent); border-radius: 24px 24px 0 0; }
        .vip-modal::-webkit-scrollbar { width: 3px; }
        .vip-modal::-webkit-scrollbar-thumb { background: rgba(255,195,0,0.18); border-radius: 4px; }
        .vip-modal-aurora { position: absolute; top: 0; left: 0; right: 0; height: 200px; background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,195,0,0.13) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 20% 0%, rgba(84,199,248,0.07) 0%, transparent 55%); pointer-events: none; z-index: 0; }
        .vip-modal-close { position: absolute; top: 16px; right: 16px; z-index: 10; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.45); font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; font-family: sans-serif; }
        .vip-modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .vip-modal-header { position: relative; z-index: 1; text-align: center; padding: 40px 32px 20px; }
        @keyframes crownFloat { 0%,100%{ transform: translateY(0) rotate(-4deg); } 50%{ transform: translateY(-7px) rotate(4deg); } }
        .vip-modal-title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; letter-spacing: -1px; color: #f5f8ff; line-height: 1.1; margin-bottom: 8px; }
        .vip-modal-title .gold { background: linear-gradient(135deg, #ffd700 0%, #ffb800 40%, #ff9500 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .vip-modal-subtitle { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(180,215,240,0.42); line-height: 1.5; }
        .vip-country-badge { display: inline-flex; align-items: center; gap: 5px; margin-top: 10px; padding: 4px 12px; background: rgba(255,195,0,0.07); border: 1px solid rgba(255,195,0,0.15); border-radius: 100px; font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,210,60,0.6); }
        .vip-plan-selector { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px 22px 14px; }
        .vip-plan-opt { padding: 16px 14px 14px; border-radius: 16px; cursor: pointer; border: 1.5px solid rgba(255,195,0,0.14); background: rgba(255,195,0,0.03); transition: all 0.22s cubic-bezier(0.16,1,0.3,1); position: relative; overflow: hidden; text-align: center; }
        .vip-plan-opt:hover { border-color: rgba(255,195,0,0.3); background: rgba(255,195,0,0.06); }
        .vip-plan-opt.sel { border-color: rgba(255,195,0,0.6); background: rgba(255,195,0,0.09); box-shadow: 0 0 0 1px rgba(255,195,0,0.18), 0 4px 20px rgba(255,195,0,0.1); }
        .vip-plan-opt.sel::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,195,0,0.6), transparent); }
        .vip-plan-best { position: absolute; top: -1px; left: 50%; transform: translateX(-50%); padding: 3px 10px; background: linear-gradient(135deg, #ffd700, #ff9500); border-radius: 0 0 10px 10px; font-family: 'Syne', sans-serif; font-size: 8px; font-weight: 800; letter-spacing: 1.5px; color: #1a0800; white-space: nowrap; }
        .vip-opt-label { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,210,60,0.5); margin-bottom: 6px; }
        .vip-opt-price { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 900; background: linear-gradient(135deg, #ffd700, #ffb800, #ff9500); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; }
        .vip-opt-sub { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(255,210,60,0.32); margin-top: 3px; }
        .vip-opt-save { display: inline-block; margin-top: 8px; padding: 3px 9px; border-radius: 100px; background: rgba(34,197,94,0.11); border: 1px solid rgba(34,197,94,0.22); font-size: 9px; font-weight: 700; letter-spacing: 0.5px; color: #4ade80; }
        .vip-opt-check { position: absolute; top: 10px; right: 10px; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid rgba(255,195,0,0.22); display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .vip-plan-opt.sel .vip-opt-check { background: rgba(255,195,0,0.9); border-color: transparent; box-shadow: 0 0 8px rgba(255,195,0,0.4); }
        .vip-opt-check-dot { width: 7px; height: 7px; border-radius: 50%; background: #1a0800; opacity: 0; transition: opacity 0.2s; }
        .vip-plan-opt.sel .vip-opt-check-dot { opacity: 1; }
        .vip-plans { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 22px 22px; }
        @media(max-width:480px){ .vip-plans { grid-template-columns: 1fr; } }
        .vip-plan { border-radius: 18px; padding: 20px 18px; position: relative; overflow: hidden; }
        .vip-plan-free { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
        .vip-plan-vip { background: linear-gradient(145deg, rgba(255,195,0,0.08) 0%, rgba(255,140,0,0.05) 60%, rgba(84,199,248,0.04) 100%); border: 1px solid rgba(255,195,0,0.28); box-shadow: 0 0 40px rgba(255,195,0,0.07), inset 0 1px 0 rgba(255,195,0,0.12); }
        .vip-plan-vip::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,195,0,0.6), transparent); }
        .vip-plan-badge { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 4px 10px; border-radius: 100px; margin-bottom: 14px; }
        .vip-plan-free .vip-plan-badge { background: rgba(255,255,255,0.06); color: rgba(180,215,240,0.4); border: 1px solid rgba(255,255,255,0.06); }
        .vip-plan-vip  .vip-plan-badge { background: rgba(255,195,0,0.12); color: rgba(255,210,60,0.9); border: 1px solid rgba(255,195,0,0.25); }
        .vip-badge-dot { width: 5px; height: 5px; border-radius: 50%; }
        .vip-plan-free .vip-badge-dot { background: rgba(180,215,240,0.3); }
        .vip-plan-vip  .vip-badge-dot { background: #ffd700; box-shadow: 0 0 6px #ffd700; animation: goldPulse 2s infinite; }
        @keyframes goldPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .vip-features-list { display: flex; flex-direction: column; gap: 9px; }
        .vip-feature-row { display: flex; align-items: center; gap: 9px; }
        .vip-feature-icon { width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; }
        .vip-feature-icon.yes-free { background: rgba(84,199,248,0.1); color: #54c7f8; }
        .vip-feature-icon.no-free  { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.15); }
        .vip-feature-icon.yes-vip  { background: rgba(255,195,0,0.12); color: #ffd700; box-shadow: 0 0 8px rgba(255,195,0,0.2); }
        .vip-feature-label { font-family: 'DM Sans', sans-serif; font-size: 12.5px; line-height: 1; }
        .vip-plan-free .vip-feature-label { color: rgba(180,215,240,0.4); }
        .vip-plan-vip  .vip-feature-label { color: rgba(240,248,255,0.82); }
        .vip-plan-free .vip-feature-row.has-no .vip-feature-label { text-decoration: line-through; color: rgba(180,215,240,0.2); }
        .vip-plan-shimmer { position: absolute; inset: 0; background: linear-gradient(105deg, transparent 40%, rgba(255,195,0,0.06) 50%, transparent 60%); animation: shimmerMove 4s ease-in-out infinite; pointer-events: none; }
        @keyframes shimmerMove { 0%{ transform: translateX(-100%); } 60%,100%{ transform: translateX(200%); } }
        .vip-pay-method { position: relative; z-index: 1; padding: 0 22px 14px; }
        .vip-pay-method-label { font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(180,215,240,0.3); margin-bottom: 10px; text-align: center; }
        .vip-pay-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .vip-pay-tab { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 10px; border-radius: 12px; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02); transition: all 0.22s cubic-bezier(0.16,1,0.3,1); font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; color: rgba(180,215,240,0.35); }
        .vip-pay-tab:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.14); color: rgba(180,215,240,0.6); }
        .vip-pay-tab.sel-mp { background: rgba(0,158,227,0.10); border-color: rgba(0,158,227,0.45); color: #009ee3; box-shadow: 0 0 16px rgba(0,158,227,0.12), inset 0 1px 0 rgba(0,158,227,0.15); }
        .vip-pay-tab.sel-pp { background: rgba(0,112,192,0.10); border-color: rgba(0,48,135,0.55); color: #0070c0; box-shadow: 0 0 16px rgba(0,112,192,0.12), inset 0 1px 0 rgba(255,196,57,0.15); }
        .vip-pay-tab-icon { font-size: 16px; }
        .vip-pp-pay  { color: #003087; font-weight: 800; }
        .vip-pp-pal  { color: #009cde; font-weight: 800; }
        .vip-pp-disclaimer { margin-top: 8px; padding: 8px 12px; background: rgba(255,196,57,0.06); border: 1px solid rgba(255,196,57,0.18); border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 11px; color: rgba(255,196,57,0.7); line-height: 1.5; text-align: center; }
        .vip-error-banner { margin: 0 22px 8px; padding: 10px 14px; position: relative; z-index: 1; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.25); border-radius: 10px; font-size: 12px; color: #fca5a5; font-family: 'DM Sans', sans-serif; }
        .vip-cta-wrap { position: relative; z-index: 1; padding: 0 22px 14px; display: flex; flex-direction: column; gap: 9px; }
        .vip-btn-secondary { width: 100%; padding: 13px; background: transparent; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; color: rgba(180,215,240,0.35); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.2s ease; }
        .vip-btn-secondary:hover { background: rgba(255,255,255,0.04); color: rgba(180,215,240,0.6); border-color: rgba(255,255,255,0.12); }
        .vip-spinner { width: 15px; height: 15px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0; }
        .vip-wallet-skeleton { width: 100%; height: 52px; border-radius: 14px; background: rgba(0,158,227,0.08); border: 1px solid rgba(0,158,227,0.2); display: flex; align-items: center; justify-content: center; gap: 10px; font-family: "DM Sans", sans-serif; font-size: 13px; color: rgba(0,158,227,0.6); }
        .vip-wallet-wrap { width: 100%; }
        .vip-wallet-wrap > div { border-radius: 14px !important; overflow: hidden; }
        .vip-wallet-wrap iframe { border-radius: 14px !important; }
        .vip-paypal-wrap { width: 100%; border-radius: 14px; overflow: hidden; }
        .vip-success { text-align: center; padding: 24px 22px; position: relative; z-index: 1; }
        @keyframes successPop { 0%{transform:scale(0.6);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        .vip-success-icon { font-size: 48px; animation: successPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .vip-success-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #f5f8ff; margin: 12px 0 6px; }
        .vip-success-sub { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(180,215,240,0.45); }
        .vip-disclaimer { position: relative; z-index: 1; text-align: center; font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(180,215,240,0.18); padding: 4px 22px 28px; line-height: 1.8; }
        .vip-secure { display: flex; align-items: center; justify-content: center; gap: 5px; margin-bottom: 5px; font-size: 11px; color: rgba(180,215,240,0.24); }
      `}</style>

      <div className={`vip-modal-backdrop ${visible ? "in" : ""}`} onClick={handleClose}>
        <div className={`vip-modal ${visible ? "in" : ""}`} onClick={e => e.stopPropagation()}>
          <div className="vip-modal-aurora" />
          <button className="vip-modal-close" onClick={handleClose}>✕</button>

          <div className="vip-modal-header">
            <Image src={imgLogoVip} alt="Turrinder VIP" width={56} height={56}
              style={{ objectFit: "contain", filter: "drop-shadow(0 0 18px rgba(255,195,0,0.6))", animation: "crownFloat 3s ease-in-out infinite", display: "block", margin: "0 auto 12px" }} />
            <h2 className="vip-modal-title">Turrinder <span className="gold">VIP</span></h2>
            <p className="vip-modal-subtitle">Desbloqueá la experiencia completa sin límites.</p>
            <div className="vip-country-badge">
              {country === "AR" ? "🇦🇷 Precios en pesos argentinos" : "🌍 Precios en dólares"}
            </div>
          </div>

          <div className="vip-plan-selector">
            {(["monthly", "annual"] as VipPlan[]).map(p => {
              const info = prices[p];
              return (
                <div key={p} className={`vip-plan-opt ${plan === p ? "sel" : ""}`}
                  onClick={() => setPlan(p)} role="radio" aria-checked={plan === p} tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && setPlan(p)}>
                  {p === "annual" && <div className="vip-plan-best">MEJOR PRECIO</div>}
                  <div className="vip-opt-check"><div className="vip-opt-check-dot" /></div>
                  <div className="vip-opt-label">{p === "monthly" ? "Mensual" : "Anual"}</div>
                  <div className="vip-opt-price">{info.display}</div>
                  <div className="vip-opt-sub">{info.sub}</div>
                  {info.save && <div className="vip-opt-save">{info.save}</div>}
                </div>
              );
            })}
          </div>

          <div className="vip-plans">
            <div className="vip-plan vip-plan-free">
              <div className="vip-plan-badge"><div className="vip-badge-dot" />Gratis</div>
              <div className="vip-features-list">
                {FREE_FEATURES.map((f, i) => (
                  <div key={i} className={`vip-feature-row ${f.has ? "" : "has-no"}`}>
                    <div className={`vip-feature-icon ${f.has ? "yes-free" : "no-free"}`}>{f.has ? "✓" : "✕"}</div>
                    <span className="vip-feature-label">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="vip-plan vip-plan-vip">
              <div className="vip-plan-shimmer" />
              <div className="vip-plan-badge"><div className="vip-badge-dot" />VIP</div>
              <div className="vip-features-list">
                {VIP_FEATURES.map((f, i) => (
                  <div key={i} className="vip-feature-row">
                    <div className="vip-feature-icon yes-vip">✓</div>
                    <span className="vip-feature-label">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="vip-pay-method">
            <div className="vip-pay-method-label">Método de pago</div>
            <div className="vip-pay-tabs">
              <button className={`vip-pay-tab ${payMethod === "mp" ? "sel-mp" : ""}`} onClick={() => setPayMethod("mp")}>
                <span className="vip-pay-tab-icon">💳</span>
                Mercado Pago
              </button>
              <button className={`vip-pay-tab ${payMethod === "paypal" ? "sel-pp" : ""}`} onClick={() => setPayMethod("paypal")}>
                <span className="vip-pay-tab-icon">🅿️</span>
                <span><span className="vip-pp-pay">Pay</span><span className="vip-pp-pal">Pal</span></span>
              </button>
            </div>
            {payMethod === "paypal" && country === "AR" && (
              <div className="vip-pp-disclaimer">⚠️ PayPal cobra en USD. Verificá si tu cuenta acepta pagos internacionales.</div>
            )}
          </div>

          {error && <div className="vip-error-banner">⚠️ {error}</div>}

          {ppSuccess ? (
            <div className="vip-success">
              <div className="vip-success-icon">🎉</div>
              <div className="vip-success-title">¡Bienvenido/a al VIP!</div>
              <div className="vip-success-sub">Tu suscripción fue activada correctamente.</div>
            </div>
          ) : (
            <div className="vip-cta-wrap">
              {payMethod === "mp" && (
                <>
                  {loading && (
                    <div className="vip-wallet-skeleton">
                      <span className="vip-spinner" />
                      <span>Preparando pago seguro...</span>
                    </div>
                  )}
                  {!loading && preferenceId && (
                    <div className="vip-wallet-wrap">
                      <Wallet
                        initialization={{ preferenceId, redirectMode: "self" }}
                        onReady={() => {}}
                        onError={(err: any) => {
                          console.error("Wallet Brick error:", err);
                          setError("Error al cargar el botón de pago. Recargá la página.");
                        }}
                      />
                    </div>
                  )}
                </>
              )}
              {payMethod === "paypal" && (
                <div className="vip-paypal-wrap">
                  <PayPalSubscribeButton planId={PAYPAL_PLAN_IDS[plan]} onError={(msg) => setError(msg)} onApprove={handlePayPalApprove} />
                </div>
              )}
              <button className="vip-btn-secondary" onClick={handleClose}>Quedarme con el plan gratis</button>
            </div>
          )}

          <div className="vip-disclaimer">
            <div className="vip-secure">🔒 Pago 100% seguro · Mercado Pago · PayPal</div>
            Renovación automática mensual o anual según el plan elegido.<br />
            Podés cancelar cuando quieras desde tu cuenta de Mercado Pago o PayPal.<br />
            Al suscribirte aceptás los Términos de Uso y la Política de Privacidad.
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// DISCORD LOGO SVG
// ─────────────────────────────────────────────────────────
function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// SIDE NAV
// ─────────────────────────────────────────────────────────
export default function SideNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const [open,           setOpen]           = useState(false);
  const [vipOpen,        setVipOpen]        = useState(false);
  const [feedbackOpen,   setFeedbackOpen]   = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false); // ← NUEVO
  const [drawerOpen, setDrawerOpen] = useState(false); // ← Mobile extras drawer
  const [isMobile, setIsMobile] = useState(false);

  const isGuest = useIsGuest(); // ← NUEVO

  const openTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => { if (isMobile) setOpen(false); }, [pathname, isMobile]);

  useEffect(() => {
    document.body.style.overflow = (open || vipOpen || feedbackOpen || guestModalOpen || drawerOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open, vipOpen, feedbackOpen, guestModalOpen, drawerOpen]);

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (!open) openTimer.current = setTimeout(() => setOpen(true), 500);
  };
  const handleMouseLeave = () => {
    if (isMobile) return;
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    if (open) closeTimer.current = setTimeout(() => setOpen(false), 500);
  };

  const guardedAction = (action: () => void) => {
  if (isGuest) {
    if (isMobile) setOpen(false);
    // En vez de modal, directo al register
    router.push("/auth/register");
    return;
  }
  action();
};

  const tabs = [
    { path: "/discover",       img: imgDiscover,       label: "Discover",       desc: "Conocé gente nueva",    accent: "#54c7f8" },
    { path: "/modalidades",    img: imgModalidades,    label: "Modalidades",    desc: "Elegí cómo conectar",   accent: "#a78bfa" },
    { path: "/chat",           img: imgChat,           label: "Chats",          desc: "Tus conversaciones",    accent: "#3b9eda" },
    { path: "/profile",        img: imgPerfil,         label: "Perfil",         desc: "Tu cuenta",             accent: "#7dd8f8" },
    { path: "/configuracion",  img: imgConfiguracion,  label: "Configuración",  desc: "Ajustes y privacidad",  accent: "#94a3b8" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .snav-panel {
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 58;
          width: 64px;
          background: rgba(3,10,20,0.97);
          border-right: 1px solid rgba(84,199,248,0.14);
          backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px);
          display: flex; flex-direction: column;
          transition: width 0.3s cubic-bezier(0.32, 0.72, 0, 1);
          box-shadow: 8px 0 60px rgba(0,0,0,0.6), 0 0 80px rgba(84,199,248,0.05);
          overflow: hidden;
        }
        .snav-panel.open { width: 280px; z-index: 60; }
        .snav-panel-aurora {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 80% 40% at 20% 10%, rgba(84,199,248,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 90%, rgba(59,158,218,0.07) 0%, transparent 60%);
        }
        .snav-panel::after {
          content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 1px; z-index: 1;
          background: linear-gradient(to bottom, transparent 0%, rgba(84,199,248,0.3) 30%, rgba(59,158,218,0.2) 60%, transparent 100%);
        }
        .snav-backdrop {
          position: fixed; inset: 0; z-index: 55;
          background: rgba(0,0,0,0); pointer-events: none;
          transition: background 0.35s ease, backdrop-filter 0.35s ease;
        }
        .snav-backdrop.visible {
          background: rgba(0,0,0,0.55); pointer-events: all;
          backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
        }
        .snav-header {
          position: relative; z-index: 2;
          display: flex; align-items: center; gap: 12px;
          padding: 20px 12px 16px;
          border-bottom: 1px solid rgba(84,199,248,0.12);
          min-height: 72px; overflow: hidden; flex-shrink: 0;
        }
        .snav-logo-icon { width: 40px; height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; overflow: hidden; }
        .snav-logo-text { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #f5f8ff; line-height: 1; white-space: nowrap; opacity: 0; transform: translateX(-8px); transition: opacity 0.25s ease 0.15s, transform 0.25s ease 0.15s; }
        .snav-panel.open .snav-logo-text { opacity: 1; transform: translateX(0); }
        .snav-logo-text span { background: linear-gradient(135deg, #54c7f8, #3b9eda, #1a6fa8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .snav-mobile-toggle { display: none; position: relative; z-index: 2; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: 40px; height: 40px; margin: 10px auto 4px; background: rgba(84,199,248,0.05); border: 1px solid rgba(84,199,248,0.14); border-radius: 12px; cursor: pointer; flex-shrink: 0; transition: background 0.2s ease, box-shadow 0.2s ease; padding: 0; outline: none; -webkit-tap-highlight-color: transparent; }
        .snav-mobile-toggle:hover { background: rgba(84,199,248,0.12); box-shadow: 0 0 16px rgba(84,199,248,0.18); }
        .snav-toggle-bar { width: 14px; height: 2px; border-radius: 2px; background: rgba(255,255,255,0.55); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); transform-origin: center; }
        .snav-mobile-toggle.is-open .snav-toggle-bar:nth-child(1) { transform: translateY(7px) rotate(45deg); background: #54c7f8; }
        .snav-mobile-toggle.is-open .snav-toggle-bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .snav-mobile-toggle.is-open .snav-toggle-bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); background: #54c7f8; }
        @keyframes pipPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        .snav-toggle-pip { position: absolute; top: 7px; right: 7px; width: 5px; height: 5px; border-radius: 50%; background: #54c7f8; box-shadow: 0 0 6px #54c7f8; animation: pipPulse 2s ease-in-out infinite; }
        .snav-hover-hint { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; height: 28px; margin: 8px 8px 2px; flex-shrink: 0; opacity: 0.0; transition: opacity 0.3s ease; }
        .snav-panel:not(.open):hover .snav-hover-hint { opacity: 1; }
        .snav-hover-hint-line { width: 20px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, rgba(84,199,248,0.0), rgba(84,199,248,0.35), rgba(84,199,248,0.0)); animation: hintBlink 2s ease-in-out infinite; }
        @keyframes hintBlink { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .snav-items { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 12px 8px; overflow: hidden; }
        .snav-item { display: flex; align-items: center; justify-content: center; gap: 0; padding: 0 10px; border-radius: 12px; border: 1px solid transparent; background: transparent; cursor: pointer; transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1); text-align: left; width: 100%; position: relative; overflow: hidden; -webkit-tap-highlight-color: transparent; outline: none; height: 46px; }
        .snav-panel.open .snav-item { justify-content: flex-start; gap: 14px; }
        .snav-item::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.035), transparent); transform: translateX(-120%); transition: transform 0.55s ease; }
        .snav-item:hover::before { transform: translateX(120%); }
        .snav-item:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.06); }
        .snav-panel.open .snav-item:hover { transform: translateX(3px); }
        .snav-item.active { background: var(--item-accent-bg); border-color: var(--item-accent-border); }
        .snav-panel:not(.open) .snav-item::after { content: attr(data-tooltip); position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%) translateX(-4px); background: rgba(3,10,20,0.95); border: 1px solid rgba(84,199,248,0.2); color: #f5f8ff; font-family: 'DM Sans', sans-serif; font-size: 12px; padding: 5px 10px; border-radius: 8px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.18s ease, transform 0.18s ease; z-index: 100; box-shadow: 4px 4px 16px rgba(0,0,0,0.5); }
        .snav-panel:not(.open) .snav-item:hover::after { opacity: 1; transform: translateY(-50%) translateX(0); }
        .snav-panel:not(.open) .snav-item-streamer::after { content: 'Ser Streamer'; border-color: rgba(167,139,250,0.3); color: #a78bfa; }
        .snav-panel:not(.open) .snav-item-vip::after { content: 'VIP ✨'; border-color: rgba(255,195,0,0.3); color: #ffd700; }
        .snav-panel:not(.open) .snav-item-feedback::after { content: 'Feedback & Bugs'; border-color: rgba(52,211,153,0.3); color: #34d399; }
        .snav-panel:not(.open) .snav-item-discord::after { content: 'Comunidad Discord'; border-color: rgba(88,101,242,0.4); color: #7289da; }
        .snav-item-icon { width: 32px; height: 32px; flex-shrink: 0; position: relative; transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease; filter: brightness(0.45) saturate(0.2); }
        .snav-item.active .snav-item-icon { filter: brightness(1) saturate(1.1) drop-shadow(0 0 7px var(--item-accent)); }
        .snav-item:hover .snav-item-icon { transform: scale(1.12) rotate(-4deg); filter: brightness(0.75) saturate(0.5); }
        .snav-item.active:hover .snav-item-icon { transform: scale(1.12) rotate(-4deg); filter: brightness(1.1) saturate(1.3) drop-shadow(0 0 10px var(--item-accent)); }
        .snav-item-icon-glow { position: absolute; inset: -8px; border-radius: 50%; background: radial-gradient(circle, var(--item-accent) 0%, transparent 70%); opacity: 0; transition: opacity 0.3s ease; z-index: -1; filter: blur(7px); }
        .snav-item.active .snav-item-icon-glow { opacity: 0.3; }
        .snav-item-icon-svg { width: 32px; height: 32px; flex-shrink: 0; position: relative; transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.3s ease, filter 0.3s ease; color: rgba(255,255,255,0.28); display: flex; align-items: center; justify-content: center; }
        .snav-item:hover .snav-item-icon-svg { transform: scale(1.12) rotate(-4deg); color: rgba(114,137,218,0.7); }
        .snav-item-discord:hover .snav-item-icon-svg { filter: drop-shadow(0 0 6px rgba(88,101,242,0.5)); }
        .snav-item-text { display: flex; flex-direction: column; gap: 2px; flex: 1; opacity: 0; transform: translateX(-6px); transition: opacity 0.15s ease, transform 0.15s ease, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1); white-space: nowrap; overflow: hidden; max-width: 0; }
        .snav-panel.open .snav-item-text { opacity: 1; transform: translateX(0); max-width: 200px; transition: opacity 0.25s ease 0.18s, transform 0.25s ease 0.18s, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1); }
        .snav-item-label { font-family: 'Syne', sans-serif; font-size: 13.5px; font-weight: 700; color: rgba(255,255,255,0.45); transition: color 0.2s ease; line-height: 1; letter-spacing: -0.2px; }
        .snav-item.active .snav-item-label { color: #f5f8ff; }
        .snav-item-desc { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(180,215,240,0.25); line-height: 1; }
        .snav-item.active .snav-item-desc { color: rgba(180,215,240,0.5); }
        .snav-item-dot { width: 3px; height: 16px; border-radius: 3px; flex-shrink: 0; background: var(--item-accent, #54c7f8); box-shadow: 0 0 10px var(--item-accent, #54c7f8); opacity: 0; transform: scaleY(0); transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); max-width: 0; overflow: hidden; }
        .snav-panel.open .snav-item-dot { max-width: 3px; }
        .snav-item.active .snav-item-dot { opacity: 1; transform: scaleY(1); }
        .snav-divider { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 6px 10px 3px; overflow: hidden; }
        .snav-divider-line { flex: 1; height: 1px; background: rgba(84,199,248,0.07); }
        .snav-divider-label { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: rgba(180,215,240,0.18); white-space: nowrap; opacity: 0; transition: opacity 0.2s ease; }
        .snav-panel.open .snav-divider-label { opacity: 1; transition: opacity 0.25s ease 0.2s; }
        @keyframes crownBounce { 0%,100%{transform:translateY(0)rotate(-5deg)} 50%{transform:translateY(-4px)rotate(5deg)} }
        @keyframes discordPulse { 0%,100%{box-shadow:0 0 0 0 rgba(88,101,242,0)} 50%{box-shadow:0 0 18px 3px rgba(88,101,242,0.18)} }
        .snav-item-discord:hover { animation: discordPulse 1.8s ease-in-out infinite; }
        .snav-footer { position: relative; z-index: 2; padding: 12px 12px 20px; border-top: 1px solid rgba(84,199,248,0.07); overflow: hidden; flex-shrink: 0; }
        .snav-footer-line { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(180,215,240,0.16); text-align: center; white-space: nowrap; opacity: 0; transition: opacity 0.2s ease; }
        .snav-panel.open .snav-footer-line { opacity: 1; transition: opacity 0.25s ease 0.25s; }
        /* ── MOBILE BOTTOM NAV ────────────────────────────────── */
        @media (max-width: 768px) {
          /* Hide the desktop sidebar entirely on mobile */
          .snav-panel,
          .snav-backdrop {
            display: none !important;
          }

          /* Fixed bottom bar */
          .snav-bottom-nav {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            z-index: 60;
            height: 64px;
            background: rgba(3,10,20,0.97);
            border-top: 1px solid rgba(84,199,248,0.14);
            backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px);
            box-shadow: 0 -8px 40px rgba(0,0,0,0.55), 0 0 60px rgba(84,199,248,0.04);
            display: flex;
            align-items: stretch;
            overflow: hidden;
          }

          /* Aurora strip at the top edge of the bottom bar */
          .snav-bottom-nav::before {
            content: '';
            position: absolute; top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(84,199,248,0.35), transparent);
          }

          /* Scrollable items track */
          .snav-bottom-track {
            display: flex;
            align-items: center;
            gap: 0;
            padding: 0 4px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            flex: 1;
            min-width: 0;
          }
          .snav-bottom-track::-webkit-scrollbar { display: none; }

          /* Individual bottom nav item */
          .snav-bottom-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            flex: 1;
            min-width: 0;
            height: 52px;
            border-radius: 12px;
            border: 1px solid transparent;
            background: transparent;
            cursor: pointer;
            flex-shrink: 0;
            scroll-snap-align: start;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            -webkit-tap-highlight-color: transparent;
            outline: none;
            padding: 0 4px;
            position: relative;
            overflow: hidden;
          }
          .snav-bottom-item::before {
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent);
            transform: translateY(-100%);
            transition: transform 0.3s ease;
          }
          .snav-bottom-item:active::before { transform: translateY(0); }
          .snav-bottom-item.active {
            background: var(--item-accent-bg);
            border-color: var(--item-accent-border);
          }

          .snav-bottom-icon {
            width: 26px; height: 26px;
            flex-shrink: 0;
            position: relative;
            filter: brightness(0.45) saturate(0.2);
            transition: filter 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64,1);
          }
          .snav-bottom-item.active .snav-bottom-icon {
            filter: brightness(1) saturate(1.1) drop-shadow(0 0 6px var(--item-accent));
            transform: translateY(-2px);
          }
          .snav-bottom-icon-glow {
            position: absolute; inset: -8px; border-radius: 50%;
            background: radial-gradient(circle, var(--item-accent) 0%, transparent 70%);
            opacity: 0; filter: blur(6px); z-index: -1;
            transition: opacity 0.3s ease;
          }
          .snav-bottom-item.active .snav-bottom-icon-glow { opacity: 0.35; }

          .snav-bottom-label {
            font-family: 'Syne', sans-serif;
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: -0.1px;
            color: rgba(255,255,255,0.3);
            white-space: nowrap;
            line-height: 1;
            transition: color 0.2s ease;
          }
          .snav-bottom-item.active .snav-bottom-label {
            color: rgba(255,255,255,0.88);
          }

          /* Active pip indicator */
          .snav-bottom-pip {
            position: absolute;
            bottom: 5px; left: 50%; transform: translateX(-50%);
            width: 14px; height: 2px; border-radius: 2px;
            background: var(--item-accent);
            box-shadow: 0 0 8px var(--item-accent);
            opacity: 0; transform: translateX(-50%) scaleX(0);
            transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .snav-bottom-item.active .snav-bottom-pip {
            opacity: 1; transform: translateX(-50%) scaleX(1);
          }

          /* No fade overlay needed — items fit without scroll */
          .snav-bottom-nav::after {
            content: '';
            position: absolute; top: 0; right: 52px; bottom: 0; width: 0;
            pointer-events: none;
          }

          /* Extras button (…) that opens the full expanded list */
          .snav-bottom-more {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            width: 52px;
            flex-shrink: 0;
            height: 100%;
            border: none;
            background: rgba(84,199,248,0.04);
            border-left: 1px solid rgba(84,199,248,0.10);
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            outline: none;
            padding: 0 8px;
            transition: background 0.2s ease;
          }
          .snav-bottom-more:active { background: rgba(84,199,248,0.10); }
          .snav-bottom-more-dots {
            display: flex; gap: 3px; align-items: center;
          }
          .snav-bottom-more-dots span {
            width: 4px; height: 4px; border-radius: 50%;
            background: rgba(84,199,248,0.45);
          }
          .snav-bottom-more-label {
            font-family: 'DM Sans', sans-serif;
            font-size: 9px; font-weight: 600;
            color: rgba(84,199,248,0.5);
            letter-spacing: 0.5px;
          }

          /* Full-screen drawer for extras on mobile */
          .snav-mobile-drawer {
            position: fixed; inset: 0; z-index: 80;
            display: flex; flex-direction: column; justify-content: flex-end;
          }
          .snav-mobile-drawer-backdrop {
            position: absolute; inset: 0;
            background: rgba(0,0,10,0.75);
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          }
          .snav-mobile-drawer-sheet {
            position: relative; z-index: 1;
            background: linear-gradient(180deg, #04101f 0%, #020a16 100%);
            border-top: 1px solid rgba(84,199,248,0.18);
            border-radius: 24px 24px 0 0;
            padding: 12px 16px 32px;
            display: flex; flex-direction: column; gap: 4px;
            transform: translateY(100%);
            transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .snav-mobile-drawer-sheet.in { transform: translateY(0); }
          .snav-mobile-drawer-handle {
            width: 36px; height: 4px; border-radius: 4px;
            background: rgba(84,199,248,0.2);
            margin: 0 auto 16px;
          }
          .snav-mobile-drawer-title {
            font-family: 'DM Sans', sans-serif; font-size: 9px;
            font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase;
            color: rgba(180,215,240,0.28); margin-bottom: 8px; padding: 0 4px;
          }
          .snav-mobile-drawer-item {
            display: flex; align-items: center; gap: 14px;
            padding: 13px 14px; border-radius: 14px;
            background: transparent; border: 1px solid transparent;
            cursor: pointer; width: 100%; text-align: left;
            -webkit-tap-highlight-color: transparent; outline: none;
            transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
          }
          .snav-mobile-drawer-item:active {
            background: rgba(255,255,255,0.04);
          }
          .snav-mobile-drawer-icon {
            width: 32px; height: 32px; flex-shrink: 0;
            filter: brightness(0.6) saturate(0.5);
          }
          .snav-mobile-drawer-icon-svg {
            width: 32px; height: 32px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            color: rgba(255,255,255,0.35);
          }
          .snav-mobile-drawer-text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
          .snav-mobile-drawer-label {
            font-family: 'Syne', sans-serif; font-size: 13.5px; font-weight: 700;
            color: rgba(255,255,255,0.72); letter-spacing: -0.2px; line-height: 1;
          }
          .snav-mobile-drawer-desc {
            font-family: 'DM Sans', sans-serif; font-size: 11px;
            color: rgba(180,215,240,0.28); line-height: 1;
          }
        }

        /* Hide bottom nav on desktop */
        @media (min-width: 769px) {
          .snav-bottom-nav,
          .snav-mobile-drawer { display: none !important; }
        }
      `}</style>

      <div className={`snav-backdrop ${open ? "visible" : ""}`} onClick={() => setOpen(false)} />

      <nav
        className={`snav-panel ${open ? "open" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="snav-panel-aurora" />

        <div className="snav-header">
          <div className="snav-logo-icon">
            <Image src={imgLogo} alt="Turrinder logo" width={40} height={40}
              style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </div>
          <div className="snav-logo-text">Turr<span>inder</span></div>
        </div>

        <button
          className={`snav-mobile-toggle ${open ? "is-open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Colapsar menú" : "Expandir menú"}
        >
          <div className="snav-toggle-bar" />
          <div className="snav-toggle-bar" />
          <div className="snav-toggle-bar" />
          {!open && <div className="snav-toggle-pip" />}
        </button>

        <div className="snav-hover-hint">
          <div className="snav-hover-hint-line" />
        </div>

        <div className="snav-items">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || pathname.startsWith(tab.path + "/");
            return (
              <div key={tab.path}>
                {tab.path === "/discover" && (
                  <div className="snav-divider">
                    <div className="snav-divider-line" />
                    <span className="snav-divider-label">Modos</span>
                    <div className="snav-divider-line" />
                  </div>
                )}
                {tab.path === "/chat" && (
                  <div className="snav-divider" style={{ marginTop: "2px" }}>
                    <div className="snav-divider-line" />
                    <span className="snav-divider-label">Social</span>
                    <div className="snav-divider-line" />
                  </div>
                )}
                {tab.path === "/configuracion" && (
                  <div className="snav-divider">
                    <div className="snav-divider-line" />
                    <span className="snav-divider-label">Config</span>
                    <div className="snav-divider-line" />
                  </div>
                )}
                <button
                  className={`snav-item ${isActive ? "active" : ""}`}
                  onClick={() => {
  if (isGuest && tab.path !== "/discover") {
    if (isMobile) setOpen(false);
    router.push("/auth/register");
    return;
  }
  router.push(tab.path);
  if (isMobile) setOpen(false);
}}
                  data-tooltip={tab.label}
                  style={{
                    "--item-accent":        tab.accent,
                    "--item-accent-bg":     `${tab.accent}12`,
                    "--item-accent-border": `${tab.accent}26`,
                  } as React.CSSProperties}
                >
                  <div className="snav-item-icon" style={{ "--item-accent": tab.accent } as React.CSSProperties}>
                    <div className="snav-item-icon-glow" />
                    <Image src={tab.img} alt={tab.label} width={32} height={32}
                      style={{ objectFit: "contain", width: "100%", height: "100%" }} />
                  </div>
                  <div className="snav-item-text">
                    <span className="snav-item-label">{tab.label}</span>
                    <span className="snav-item-desc">{tab.desc}</span>
                  </div>
                  <div className="snav-item-dot" />
                </button>
              </div>
            );
          })}

          {/* ── Extras ── */}
          <div className="snav-divider" style={{ marginTop: "2px" }}>
            <div className="snav-divider-line" />
            <span className="snav-divider-label">Extras</span>
            <div className="snav-divider-line" />
          </div>

          {/* Streamer */}
          <button
            className="snav-item snav-item-streamer"
            onClick={() => guardedAction(() => {
              if (isMobile) setOpen(false);
              router.push("/streamers");
            })}
            data-tooltip="Ser Streamer"
            style={{
              "--item-accent":        "#a78bfa",
              "--item-accent-bg":     "rgba(167,139,250,0.07)",
              "--item-accent-border": "rgba(167,139,250,0.20)",
            } as React.CSSProperties}
          >
            <div className="snav-item-icon" style={{ "--item-accent": "#a78bfa" } as React.CSSProperties}>
              <div className="snav-item-icon-glow" />
              <Image src={imgStreamer} alt="Ser Streamer" width={32} height={32}
                style={{ objectFit: "contain", width: "100%", height: "100%" }} />
            </div>
            <div className="snav-item-text">
              <span className="snav-item-label" style={{ background: "linear-gradient(135deg,#c4b5fd,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Ser Streamer</span>
              <span className="snav-item-desc">¡Aplicá y crecé!</span>
            </div>
            <div className="snav-item-dot" style={{ background: "#a78bfa", boxShadow: "0 0 10px #a78bfa" }} />
          </button>

          {/* Feedback */}
          <button
            className="snav-item snav-item-feedback"
            onClick={() => guardedAction(() => {
              if (isMobile) setOpen(false);
              setTimeout(() => setFeedbackOpen(true), 200);
            })}
            data-tooltip="Feedback & Bugs"
            style={{
              "--item-accent":        "#34d399",
              "--item-accent-bg":     "rgba(52,211,153,0.06)",
              "--item-accent-border": "rgba(52,211,153,0.18)",
            } as React.CSSProperties}
          >
            <div className="snav-item-icon" style={{ "--item-accent": "#34d399" } as React.CSSProperties}>
              <div className="snav-item-icon-glow" />
              <span style={{ fontSize: 24, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>🐛</span>
            </div>
            <div className="snav-item-text">
              <span className="snav-item-label" style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Feedback</span>
              <span className="snav-item-desc">Bug, idea o consulta</span>
            </div>
            <div className="snav-item-dot" style={{ background: "#34d399", boxShadow: "0 0 10px #34d399" }} />
          </button>

          {/* Discord */}
          <button
            className="snav-item snav-item-discord"
            onClick={() => {
              if (isMobile) setOpen(false);
              window.open("https://discord.gg/jXkEpvCvRD", "_blank", "noopener,noreferrer");
            }}
            data-tooltip="Comunidad Discord"
            style={{
              "--item-accent":        "#7289da",
              "--item-accent-bg":     "rgba(88,101,242,0.07)",
              "--item-accent-border": "rgba(88,101,242,0.20)",
            } as React.CSSProperties}
          >
            <div className="snav-item-icon-svg" style={{ "--item-accent": "#7289da" } as React.CSSProperties}>
              <DiscordIcon size={22} />
            </div>
            <div className="snav-item-text">
              <span className="snav-item-label" style={{ background: "linear-gradient(135deg,#b9bfff,#7289da)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Comunidad
              </span>
              <span className="snav-item-desc">Unite a nuestro Discord</span>
            </div>
            <div className="snav-item-dot" style={{ background: "#7289da", boxShadow: "0 0 10px #7289da" }} />
          </button>

          {/* VIP */}
          <button
            className="snav-item snav-item-vip"
            onClick={() => guardedAction(() => {
              if (isMobile) setOpen(false);
              setTimeout(() => setVipOpen(true), 200);
            })}
            data-tooltip="Turrinder VIP"
            style={{
              "--item-accent":        "#ffd700",
              "--item-accent-bg":     "rgba(255,195,0,0.07)",
              "--item-accent-border": "rgba(255,195,0,0.20)",
            } as React.CSSProperties}
          >
            <div className="snav-item-icon" style={{ "--item-accent": "#ffd700" } as React.CSSProperties}>
              <div className="snav-item-icon-glow" />
              <Image src={imgLogoVip} alt="VIP" width={28} height={28}
                style={{ objectFit: "contain", width: "100%", height: "100%", filter: "drop-shadow(0 0 6px rgba(255,195,0,0.6))", animation: "crownBounce 3s ease-in-out infinite" }} />
            </div>
            <div className="snav-item-text">
              <span className="snav-item-label" style={{ background: "linear-gradient(135deg,#ffd700,#ffb800,#ff9500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Turrinder VIP</span>
              <span className="snav-item-desc">Desde $4.99 · sin límites</span>
            </div>
            <div className="snav-item-dot" style={{ background: "#ffd700", boxShadow: "0 0 10px #ffd700" }} />
          </button>
        </div>

        <div className="snav-footer">
          <p className="snav-footer-line">Turrinder © {new Date().getFullYear()}</p>
        </div>
      </nav>


      {/* ══════════════════════════════════════════════
          MOBILE BOTTOM NAV (only visible on ≤768px)
      ══════════════════════════════════════════════ */}
      <div className="snav-bottom-nav">
        {/* Scrollable main tabs */}
        <div className="snav-bottom-track">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || pathname.startsWith(tab.path + "/");
            return (
              <button
                key={tab.path}
                className={`snav-bottom-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  if (isGuest && tab.path !== "/discover") {
                    router.push("/auth/register");
                    return;
                  }
                  router.push(tab.path);
                }}
                style={{
                  "--item-accent":        tab.accent,
                  "--item-accent-bg":     `${tab.accent}14`,
                  "--item-accent-border": `${tab.accent}28`,
                } as React.CSSProperties}
              >
                <div className="snav-bottom-icon" style={{ "--item-accent": tab.accent } as React.CSSProperties}>
                  <div className="snav-bottom-icon-glow" />
                  <Image src={tab.img} alt={tab.label} width={26} height={26}
                    style={{ objectFit: "contain", width: "100%", height: "100%" }} />
                </div>
                <span className="snav-bottom-label">{tab.label}</span>
                <div className="snav-bottom-pip" />
              </button>
            );
          })}
        </div>

        {/* Extras button */}
        <button className="snav-bottom-more" onClick={() => setDrawerOpen(true)} aria-label="Más opciones">
          <div className="snav-bottom-more-dots">
            <span /><span /><span />
          </div>
          <span className="snav-bottom-more-label">Más</span>
        </button>
      </div>

      {/* Mobile extras drawer */}
      {drawerOpen && (
        <div className="snav-mobile-drawer" onClick={() => setDrawerOpen(false)}>
          <div className="snav-mobile-drawer-backdrop" />
          <div className={`snav-mobile-drawer-sheet in`} onClick={e => e.stopPropagation()}>
            <div className="snav-mobile-drawer-handle" />
            <div className="snav-mobile-drawer-title">Extras</div>

            {/* Streamer */}
            <button className="snav-mobile-drawer-item" onClick={() => { setDrawerOpen(false); guardedAction(() => router.push("/streamers")); }}>
              <div className="snav-mobile-drawer-icon">
                <Image src={imgStreamer} alt="Ser Streamer" width={32} height={32} style={{ objectFit: "contain", width: "100%", height: "100%" }} />
              </div>
              <div className="snav-mobile-drawer-text">
                <span className="snav-mobile-drawer-label" style={{ background: "linear-gradient(135deg,#c4b5fd,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Ser Streamer</span>
                <span className="snav-mobile-drawer-desc">¡Aplicá y crecé!</span>
              </div>
            </button>

            {/* Feedback */}
            <button className="snav-mobile-drawer-item" onClick={() => { setDrawerOpen(false); guardedAction(() => setTimeout(() => setFeedbackOpen(true), 200)); }}>
              <div className="snav-mobile-drawer-icon-svg">
                <span style={{ fontSize: 24, lineHeight: 1 }}>🐛</span>
              </div>
              <div className="snav-mobile-drawer-text">
                <span className="snav-mobile-drawer-label" style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Feedback</span>
                <span className="snav-mobile-drawer-desc">Bug, idea o consulta</span>
              </div>
            </button>

            {/* Discord */}
            <button className="snav-mobile-drawer-item" onClick={() => { setDrawerOpen(false); window.open("https://discord.gg/jXkEpvCvRD", "_blank", "noopener,noreferrer"); }}>
              <div className="snav-mobile-drawer-icon-svg">
                <DiscordIcon size={22} />
              </div>
              <div className="snav-mobile-drawer-text">
                <span className="snav-mobile-drawer-label" style={{ background: "linear-gradient(135deg,#b9bfff,#7289da)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Comunidad</span>
                <span className="snav-mobile-drawer-desc">Unite a nuestro Discord</span>
              </div>
            </button>

            {/* VIP */}
            <button className="snav-mobile-drawer-item" onClick={() => { setDrawerOpen(false); guardedAction(() => setTimeout(() => setVipOpen(true), 200)); }}>
              <div className="snav-mobile-drawer-icon">
                <Image src={imgLogoVip} alt="VIP" width={32} height={32}
                  style={{ objectFit: "contain", width: "100%", height: "100%", filter: "drop-shadow(0 0 6px rgba(255,195,0,0.6))" }} />
              </div>
              <div className="snav-mobile-drawer-text">
                <span className="snav-mobile-drawer-label" style={{ background: "linear-gradient(135deg,#ffd700,#ffb800,#ff9500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Turrinder VIP</span>
                <span className="snav-mobile-drawer-desc">Desde $4.99 · sin límites</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {vipOpen        && <VIPModal      onClose={() => setVipOpen(false)}        />}
      {feedbackOpen   && <FeedbackModal onClose={() => setFeedbackOpen(false)}   />}
      {guestModalOpen && <GuestBlockModal onClose={() => setGuestModalOpen(false)} />}
    </>
  );
}