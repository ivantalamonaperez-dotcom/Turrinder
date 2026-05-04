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

import { supabase } from "@/services/supabase.client";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, {
  locale: "es-AR",
});

type VipPlan    = "monthly" | "annual";
type VipCountry = "AR" | "OTHER";

const VIP_PRICES = {
  AR:    { monthly: { display: "$4.999", sub: "ARS / mes", save: null },    annual: { display: "$39.999", sub: "ARS / año", save: "Ahorrás $20k" } },
  OTHER: { monthly: { display: "$4.99",  sub: "USD / mes", save: null },    annual: { display: "$39.99",  sub: "USD / año", save: "Ahorrás $19.89" } },
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
// VIP MODAL
// ─────────────────────────────────────────────────────────
function VIPModal({ onClose }: { onClose: () => void }) {
  const [visible,      setVisible]      = useState(false);
  const [plan,         setPlan]         = useState<VipPlan>("monthly");
  const [country,      setCountry]      = useState<VipCountry>("OTHER");
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [countryReady, setCountryReady] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    detectCountry().then(c => { setCountry(c); setCountryReady(true); });
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 380); };

  useEffect(() => {
    if (!countryReady) return;
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
  }, [plan, countryReady]);

  const prices = VIP_PRICES[country];

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
        .vip-modal-aurora {
          position: absolute; top: 0; left: 0; right: 0; height: 200px;
          background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,195,0,0.13) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 20% 0%, rgba(84,199,248,0.07) 0%, transparent 55%);
          pointer-events: none; z-index: 0;
        }
        .vip-modal-close {
          position: absolute; top: 16px; right: 16px; z-index: 10;
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.45); font-size: 16px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s ease; font-family: sans-serif;
        }
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
        .vip-error-banner { margin: 0 22px 8px; padding: 10px 14px; position: relative; z-index: 1; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.25); border-radius: 10px; font-size: 12px; color: #fca5a5; font-family: 'DM Sans', sans-serif; }
        .vip-cta-wrap { position: relative; z-index: 1; padding: 0 22px 14px; display: flex; flex-direction: column; gap: 9px; }
        .vip-btn-secondary { width: 100%; padding: 13px; background: transparent; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; color: rgba(180,215,240,0.35); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.2s ease; }
        .vip-btn-secondary:hover { background: rgba(255,255,255,0.04); color: rgba(180,215,240,0.6); border-color: rgba(255,255,255,0.12); }
        .vip-spinner { width: 15px; height: 15px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .vip-wallet-wrap { width: 100%; }
        .vip-wallet-wrap > div { border-radius: 14px !important; overflow: hidden; }
        .vip-wallet-wrap iframe { border-radius: 14px !important; }
        .vip-wallet-skeleton { width: 100%; height: 52px; border-radius: 14px; background: rgba(0,158,227,0.08); border: 1px solid rgba(0,158,227,0.2); display: flex; align-items: center; justify-content: center; gap: 10px; font-family: "DM Sans", sans-serif; font-size: 13px; color: rgba(0,158,227,0.6); }
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

          {error && <div className="vip-error-banner">⚠️ {error}</div>}

          <div className="vip-cta-wrap">
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
            <button className="vip-btn-secondary" onClick={handleClose}>
              Quedarme con el plan gratis
            </button>
          </div>

          <div className="vip-disclaimer">
            <div className="vip-secure">🔒 Pago 100% seguro con Mercado Pago</div>
            Renovación automática mensual o anual según el plan elegido.<br />
            Podés cancelar cuando quieras desde tu cuenta de Mercado Pago.<br />
            Al suscribirte aceptás los Términos de Uso y la Política de Privacidad.
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// SIDE NAV
// ─────────────────────────────────────────────────────────
export default function SideNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const [open,    setOpen]    = useState(false);
  const [vipOpen, setVipOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const openTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = (open || vipOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open, vipOpen]);

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

        /* ── Sidebar ── */
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

        /* ── Backdrop ── */
        .snav-backdrop {
          position: fixed; inset: 0; z-index: 55;
          background: rgba(0,0,0,0); pointer-events: none;
          transition: background 0.35s ease, backdrop-filter 0.35s ease;
        }
        .snav-backdrop.visible {
          background: rgba(0,0,0,0.55); pointer-events: all;
          backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
        }

        /* ── Header ── */
        .snav-header {
          position: relative; z-index: 2;
          display: flex; align-items: center; gap: 12px;
          padding: 20px 12px 16px;
          border-bottom: 1px solid rgba(84,199,248,0.12);
          min-height: 72px; overflow: hidden; flex-shrink: 0;
        }
        .snav-logo-icon {
          width: 40px; height: 40px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border-radius: 12px; overflow: hidden;
        }
        .snav-logo-text {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          letter-spacing: -0.5px; color: #f5f8ff; line-height: 1;
          white-space: nowrap;
          opacity: 0; transform: translateX(-8px);
          transition: opacity 0.25s ease 0.15s, transform 0.25s ease 0.15s;
        }
        .snav-panel.open .snav-logo-text { opacity: 1; transform: translateX(0); }
        .snav-logo-text span {
          background: linear-gradient(135deg, #54c7f8, #3b9eda, #1a6fa8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        /* ── Botón mobile-only ── */
        .snav-mobile-toggle {
          display: none;
          position: relative; z-index: 2;
          flex-direction: column; align-items: center; justify-content: center; gap: 5px;
          width: 40px; height: 40px; margin: 10px auto 4px;
          background: rgba(84,199,248,0.05);
          border: 1px solid rgba(84,199,248,0.14);
          border-radius: 12px;
          cursor: pointer; flex-shrink: 0;
          transition: background 0.2s ease, box-shadow 0.2s ease;
          padding: 0; outline: none; -webkit-tap-highlight-color: transparent;
        }
        .snav-mobile-toggle:hover {
          background: rgba(84,199,248,0.12);
          box-shadow: 0 0 16px rgba(84,199,248,0.18);
        }
        .snav-toggle-bar {
          width: 14px; height: 2px; border-radius: 2px;
          background: rgba(255,255,255,0.55);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); transform-origin: center;
        }
        .snav-mobile-toggle.is-open .snav-toggle-bar:nth-child(1) { transform: translateY(7px) rotate(45deg);  background: #54c7f8; }
        .snav-mobile-toggle.is-open .snav-toggle-bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .snav-mobile-toggle.is-open .snav-toggle-bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); background: #54c7f8; }
        @keyframes pipPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        .snav-toggle-pip {
          position: absolute; top: 7px; right: 7px;
          width: 5px; height: 5px; border-radius: 50%;
          background: #54c7f8; box-shadow: 0 0 6px #54c7f8;
          animation: pipPulse 2s ease-in-out infinite;
        }

        /* ── Hint hover (desktop) ── */
        .snav-hover-hint {
          position: relative; z-index: 2;
          display: flex; align-items: center; justify-content: center;
          height: 28px; margin: 8px 8px 2px; flex-shrink: 0;
          opacity: 0.0; transition: opacity 0.3s ease;
        }
        .snav-panel:not(.open):hover .snav-hover-hint { opacity: 1; }
        .snav-hover-hint-line {
          width: 20px; height: 2px; border-radius: 2px;
          background: linear-gradient(90deg, rgba(84,199,248,0.0), rgba(84,199,248,0.35), rgba(84,199,248,0.0));
          animation: hintBlink 2s ease-in-out infinite;
        }
        @keyframes hintBlink { 0%,100%{opacity:0.4} 50%{opacity:1} }

        /* ── Items ── */
        .snav-items {
          position: relative; z-index: 2; flex: 1;
          display: flex; flex-direction: column; gap: 4px;
          padding: 12px 8px; overflow: hidden;
        }
        .snav-item {
          display: flex; align-items: center; justify-content: center; gap: 0;
          padding: 0 10px; border-radius: 12px; border: 1px solid transparent;
          background: transparent; cursor: pointer;
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left; width: 100%; position: relative; overflow: hidden;
          -webkit-tap-highlight-color: transparent; outline: none; height: 46px;
        }
        .snav-panel.open .snav-item { justify-content: flex-start; gap: 14px; }
        .snav-item::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.035), transparent);
          transform: translateX(-120%); transition: transform 0.55s ease;
        }
        .snav-item:hover::before { transform: translateX(120%); }
        .snav-item:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.06); }
        .snav-panel.open .snav-item:hover { transform: translateX(3px); }
        .snav-item.active { background: var(--item-accent-bg); border-color: var(--item-accent-border); }

        .snav-panel:not(.open) .snav-item::after {
          content: attr(data-tooltip);
          position: absolute; left: calc(100% + 10px); top: 50%;
          transform: translateY(-50%) translateX(-4px);
          background: rgba(3,10,20,0.95); border: 1px solid rgba(84,199,248,0.2);
          color: #f5f8ff; font-family: 'DM Sans', sans-serif; font-size: 12px;
          padding: 5px 10px; border-radius: 8px; white-space: nowrap;
          opacity: 0; pointer-events: none;
          transition: opacity 0.18s ease, transform 0.18s ease; z-index: 100;
          box-shadow: 4px 4px 16px rgba(0,0,0,0.5);
        }
        .snav-panel:not(.open) .snav-item:hover::after { opacity: 1; transform: translateY(-50%) translateX(0); }

        .snav-item-icon {
          width: 32px; height: 32px; flex-shrink: 0; position: relative;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease;
          filter: brightness(0.45) saturate(0.2);
        }
        .snav-item.active .snav-item-icon { filter: brightness(1) saturate(1.1) drop-shadow(0 0 7px var(--item-accent)); }
        .snav-item:hover .snav-item-icon { transform: scale(1.12) rotate(-4deg); filter: brightness(0.75) saturate(0.5); }
        .snav-item.active:hover .snav-item-icon { transform: scale(1.12) rotate(-4deg); filter: brightness(1.1) saturate(1.3) drop-shadow(0 0 10px var(--item-accent)); }
        .snav-item-icon-glow {
          position: absolute; inset: -8px; border-radius: 50%;
          background: radial-gradient(circle, var(--item-accent) 0%, transparent 70%);
          opacity: 0; transition: opacity 0.3s ease; z-index: -1; filter: blur(7px);
        }
        .snav-item.active .snav-item-icon-glow { opacity: 0.3; }

        .snav-item-text {
          display: flex; flex-direction: column; gap: 2px; flex: 1;
          opacity: 0; transform: translateX(-6px);
          transition: opacity 0.15s ease, transform 0.15s ease, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1);
          white-space: nowrap; overflow: hidden; max-width: 0;
        }
        .snav-panel.open .snav-item-text {
          opacity: 1; transform: translateX(0); max-width: 200px;
          transition: opacity 0.25s ease 0.18s, transform 0.25s ease 0.18s, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .snav-item-label { font-family: 'Syne', sans-serif; font-size: 13.5px; font-weight: 700; color: rgba(255,255,255,0.45); transition: color 0.2s ease; line-height: 1; letter-spacing: -0.2px; }
        .snav-item.active .snav-item-label { color: #f5f8ff; }
        .snav-item-desc { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(180,215,240,0.25); line-height: 1; }
        .snav-item.active .snav-item-desc { color: rgba(180,215,240,0.5); }

        .snav-item-dot {
          width: 3px; height: 16px; border-radius: 3px; flex-shrink: 0;
          background: var(--item-accent, #54c7f8); box-shadow: 0 0 10px var(--item-accent, #54c7f8);
          opacity: 0; transform: scaleY(0);
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          max-width: 0; overflow: hidden;
        }
        .snav-panel.open .snav-item-dot { max-width: 3px; }
        .snav-item.active .snav-item-dot { opacity: 1; transform: scaleY(1); }

        .snav-divider {
          position: relative; z-index: 2;
          display: flex; align-items: center; gap: 10px; padding: 6px 10px 3px; overflow: hidden;
        }
        .snav-divider-line { flex: 1; height: 1px; background: rgba(84,199,248,0.07); }
        .snav-divider-label {
          font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 500;
          letter-spacing: 2px; text-transform: uppercase; color: rgba(180,215,240,0.18); white-space: nowrap;
          opacity: 0; transition: opacity 0.2s ease;
        }
        .snav-panel.open .snav-divider-label { opacity: 1; transition: opacity 0.25s ease 0.2s; }

        /* ── Streamer Button ── */
        .snav-streamer-wrap {
          position: relative; z-index: 2;
          padding: 4px 8px 2px; overflow: hidden; flex-shrink: 0;
        }
        .snav-streamer-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 0;
          padding: 10px 10px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(124,58,237,0.08) 60%, rgba(167,139,250,0.06) 100%);
          border: 1px solid rgba(167,139,250,0.32);
          cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative; overflow: hidden;
          -webkit-tap-highlight-color: transparent; outline: none;
          box-shadow: 0 0 24px rgba(167,139,250,0.07), inset 0 1px 0 rgba(167,139,250,0.12);
          height: 46px;
        }
        .snav-panel.open .snav-streamer-btn { justify-content: flex-start; gap: 12px; }
        .snav-streamer-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(167,139,250,0.10) 50%, transparent 70%);
          transform: translateX(-120%); transition: transform 0.65s ease;
        }
        .snav-streamer-btn:hover::before { transform: translateX(120%); }
        .snav-streamer-btn:hover {
          background: linear-gradient(135deg, rgba(167,139,250,0.20) 0%, rgba(124,58,237,0.14) 60%, rgba(167,139,250,0.10) 100%);
          border-color: rgba(167,139,250,0.52);
          box-shadow: 0 0 36px rgba(167,139,250,0.16), inset 0 1px 0 rgba(167,139,250,0.20);
        }
        .snav-panel.open .snav-streamer-btn:hover { transform: translateX(3px); }

        /* Tooltip colapsado */
        .snav-panel:not(.open) .snav-streamer-btn::after {
          content: '🎙 Streamers';
          position: absolute; left: calc(100% + 10px); top: 50%;
          transform: translateY(-50%) translateX(-4px);
          background: rgba(3,10,20,0.95); border: 1px solid rgba(167,139,250,0.3);
          color: #a78bfa; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 800;
          padding: 5px 10px; border-radius: 8px; white-space: nowrap;
          opacity: 0; pointer-events: none;
          transition: opacity 0.18s ease, transform 0.18s ease; z-index: 100;
        }
        .snav-panel:not(.open) .snav-streamer-btn:hover::after { opacity: 1; transform: translateY(-50%) translateX(0); }

        @keyframes micPulse { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.15) rotate(5deg); } }
        .snav-streamer-icon { flex-shrink: 0; font-size: 20px; animation: micPulse 2.5s ease-in-out infinite; display: inline-block; }

        .snav-streamer-text {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
          opacity: 0; transform: translateX(-6px); white-space: nowrap; overflow: hidden; max-width: 0;
          transition: opacity 0.15s ease, transform 0.15s ease, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .snav-panel.open .snav-streamer-text {
          opacity: 1; transform: translateX(0); max-width: 200px;
          transition: opacity 0.25s ease 0.22s, transform 0.25s ease 0.22s, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .snav-streamer-label {
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800; line-height: 1;
          background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #7c3aed 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .snav-streamer-sub { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(167,139,250,0.42); line-height: 1; }
        .snav-streamer-arrow {
          font-size: 12px; color: rgba(167,139,250,0.45);
          opacity: 0; max-width: 0; overflow: hidden;
          transition: transform 0.25s ease, color 0.25s ease, opacity 0.2s ease, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .snav-panel.open .snav-streamer-arrow { opacity: 1; max-width: 20px; }
        .snav-streamer-btn:hover .snav-streamer-arrow { transform: translateX(3px); color: rgba(167,139,250,0.85); }

        /* ── VIP ── */
        .snav-vip-wrap {
          position: relative; z-index: 2;
          padding: 4px 8px 6px; overflow: hidden; flex-shrink: 0;
        }
        .snav-vip-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 0;
          padding: 10px 10px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,195,0,0.10) 0%, rgba(255,140,0,0.07) 60%, rgba(255,195,0,0.05) 100%);
          border: 1px solid rgba(255,195,0,0.28);
          cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative; overflow: hidden;
          -webkit-tap-highlight-color: transparent; outline: none;
          box-shadow: 0 0 24px rgba(255,195,0,0.06), inset 0 1px 0 rgba(255,195,0,0.10);
          height: 46px;
        }
        .snav-panel.open .snav-vip-btn { justify-content: flex-start; gap: 12px; }
        .snav-vip-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,195,0,0.08) 50%, transparent 70%);
          transform: translateX(-120%); transition: transform 0.65s ease;
        }
        .snav-vip-btn:hover::before { transform: translateX(120%); }
        .snav-vip-btn:hover {
          background: linear-gradient(135deg, rgba(255,195,0,0.17) 0%, rgba(255,140,0,0.12) 60%, rgba(255,195,0,0.09) 100%);
          border-color: rgba(255,195,0,0.48);
          box-shadow: 0 0 36px rgba(255,195,0,0.14), inset 0 1px 0 rgba(255,195,0,0.18);
        }
        .snav-panel.open .snav-vip-btn:hover { transform: translateX(3px); }

        @keyframes crownBounce { 0%,100%{transform:translateY(0)rotate(-5deg)} 50%{transform:translateY(-4px)rotate(5deg)} }

        .snav-vip-icon { flex-shrink: 0; transition: none; }

        .snav-vip-text {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
          opacity: 0; transform: translateX(-6px); white-space: nowrap; overflow: hidden; max-width: 0;
          transition: opacity 0.15s ease, transform 0.15s ease, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .snav-panel.open .snav-vip-text {
          opacity: 1; transform: translateX(0); max-width: 200px;
          transition: opacity 0.25s ease 0.22s, transform 0.25s ease 0.22s, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .snav-vip-label {
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800; line-height: 1;
          background: linear-gradient(135deg, #ffd700 0%, #ffb800 50%, #ff9500 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .snav-vip-sub { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(255,195,0,0.38); line-height: 1; }
        .snav-vip-arrow {
          font-size: 12px; color: rgba(255,195,0,0.45);
          opacity: 0; max-width: 0; overflow: hidden;
          transition: transform 0.25s ease, color 0.25s ease, opacity 0.2s ease, max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .snav-panel.open .snav-vip-arrow { opacity: 1; max-width: 20px; }
        .snav-vip-btn:hover .snav-vip-arrow { transform: translateX(3px); color: rgba(255,195,0,0.85); }

        /* Tooltip VIP colapsado */
        .snav-panel:not(.open) .snav-vip-btn::after {
          content: 'VIP';
          position: absolute; left: calc(100% + 10px); top: 50%;
          transform: translateY(-50%) translateX(-4px);
          background: rgba(3,10,20,0.95); border: 1px solid rgba(255,195,0,0.3);
          color: #ffd700; font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 800;
          padding: 5px 10px; border-radius: 8px; white-space: nowrap;
          opacity: 0; pointer-events: none;
          transition: opacity 0.18s ease, transform 0.18s ease; z-index: 100;
        }
        .snav-panel:not(.open) .snav-vip-btn:hover::after { opacity: 1; transform: translateY(-50%) translateX(0); }

        .snav-footer {
          position: relative; z-index: 2;
          padding: 12px 12px 20px;
          border-top: 1px solid rgba(84,199,248,0.07); overflow: hidden; flex-shrink: 0;
        }
        .snav-footer-line {
          font-family: 'DM Sans', sans-serif; font-size: 10px;
          color: rgba(180,215,240,0.16); text-align: center; white-space: nowrap;
          opacity: 0; transition: opacity 0.2s ease;
        }
        .snav-panel.open .snav-footer-line { opacity: 1; transition: opacity 0.25s ease 0.25s; }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .snav-mobile-toggle { display: flex !important; }
          .snav-hover-hint { display: none; }
          .snav-panel { width: 64px; }
          .snav-panel.open { width: 280px; }
        }
      `}</style>

      {/* Backdrop */}
      <div className={`snav-backdrop ${open ? "visible" : ""}`} onClick={() => setOpen(false)} />

      {/* Sidebar */}
      <nav
        className={`snav-panel ${open ? "open" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="snav-panel-aurora" />

        {/* Logo */}
        <div className="snav-header">
          <div className="snav-logo-icon">
            <Image src={imgLogo} alt="Turrinder logo" width={40} height={40}
              style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </div>
          <div className="snav-logo-text">Turr<span>inder</span></div>
        </div>

        {/* Botón mobile */}
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

        {/* Hint desktop */}
        <div className="snav-hover-hint">
          <div className="snav-hover-hint-line" />
        </div>

        {/* Nav items */}
        <div className="snav-items">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || pathname.startsWith(tab.path + "/");
            return (
              <div key={tab.path}>
                {tab.path === "/modalidades" && (
                  <div className="snav-divider">
                    <div className="snav-divider-line" />
                    <span className="snav-divider-label">Modos</span>
                    <div className="snav-divider-line" />
                  </div>
                )}
                <button
                  className={`snav-item ${isActive ? "active" : ""}`}
                  onClick={() => { router.push(tab.path); setOpen(false); }}
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
                {tab.path === "/modalidades" && (
                  <div className="snav-divider" style={{ marginTop: "2px" }}>
                    <div className="snav-divider-line" />
                    <span className="snav-divider-label">Social</span>
                    <div className="snav-divider-line" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Streamer — va ANTES del VIP */}
        <div className="snav-streamer-wrap">
          <button
            className="snav-streamer-btn"
            onClick={() => { setOpen(false); router.push("/streamers"); }}
          >
            <span className="snav-streamer-icon">🎙</span>
            <div className="snav-streamer-text">
              <span className="snav-streamer-label">Ser Streamer</span>
              <span className="snav-streamer-sub">¡Aplicá y crecé con nosotros!</span>
            </div>
            <span className="snav-streamer-arrow">›</span>
          </button>
        </div>

        {/* VIP */}
        <div className="snav-vip-wrap">
          <button
            className="snav-vip-btn"
            onClick={() => { setOpen(false); setTimeout(() => setVipOpen(true), 200); }}
          >
            <Image src={imgLogoVip} alt="VIP" width={26} height={26} className="snav-vip-icon"
              style={{ objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(255,195,0,0.7))", animation: "crownBounce 3s ease-in-out infinite" }} />
            <div className="snav-vip-text">
              <span className="snav-vip-label">Turrinder VIP</span>
              <span className="snav-vip-sub">Mensual o anual · desde $4.99</span>
            </div>
            <span className="snav-vip-arrow">›</span>
          </button>
        </div>

        <div className="snav-footer">
          <p className="snav-footer-line">Turrinder © {new Date().getFullYear()}</p>
        </div>
      </nav>

      {/* VIP Modal */}
      {vipOpen && <VIPModal onClose={() => setVipOpen(false)} />}
    </>
  );
}