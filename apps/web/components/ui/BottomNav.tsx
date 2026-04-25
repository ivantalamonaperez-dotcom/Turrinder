"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import imgLogo        from "../../Images/logo.png";
import imgChat        from "../../Images/chat.png";
import imgDiscover    from "../../Images/discover.png";
import imgModalidades from "../../Images/modalidades.png";
import imgPerfil      from "../../Images/perfil.png";

function VIPModal({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 380);
  };

  const freeFeatures = [
    { label: "Anuncios",           has: false },
    { label: "Likes limitados",    has: false },
    { label: "Salas privadas",     has: false },
    { label: "Chats ilimitados",   has: true  },
    { label: "Videollamadas",      has: true  },
    { label: "Descubrí personas",  has: true  },
  ];

  const vipFeatures = [
    { label: "Sin anuncios",              has: true },
    { label: "Likes ilimitados",          has: true },
    { label: "Crear salas privadas",      has: true },
    { label: "Chats ilimitados",          has: true },
    { label: "Videollamadas",             has: true },
    { label: "Descubrí personas",         has: true },
  ];

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
          width: 100%; max-width: 580px;
          background: linear-gradient(160deg, #05101e 0%, #020a16 60%, #030d1a 100%);
          border: 1px solid rgba(84,199,248,0.16);
          border-radius: 24px;
          box-shadow:
            0 40px 100px rgba(0,0,0,0.8),
            0 0 80px rgba(84,199,248,0.06),
            inset 0 1px 0 rgba(255,255,255,0.06);
          overflow: hidden;
          opacity: 0; transform: translateY(32px) scale(0.95);
          transition: opacity 0.42s cubic-bezier(0.16,1,0.3,1), transform 0.42s cubic-bezier(0.16,1,0.3,1);
          max-height: 90vh; overflow-y: auto;
        }
        .vip-modal.in { opacity: 1; transform: translateY(0) scale(1); }

        .vip-modal::-webkit-scrollbar { width: 4px; }
        .vip-modal::-webkit-scrollbar-track { background: transparent; }
        .vip-modal::-webkit-scrollbar-thumb { background: rgba(84,199,248,0.2); border-radius: 4px; }

        /* Aurora top glow */
        .vip-modal-aurora {
          position: absolute; top: 0; left: 0; right: 0; height: 200px;
          background:
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,195,0,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 20% 0%, rgba(84,199,248,0.09) 0%, transparent 55%);
          pointer-events: none; z-index: 0;
        }

        .vip-modal-close {
          position: absolute; top: 16px; right: 16px; z-index: 10;
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.45); font-size: 16px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s ease;
          font-family: sans-serif;
        }
        .vip-modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }

        .vip-modal-header {
          position: relative; z-index: 1;
          text-align: center;
          padding: 40px 32px 28px;
        }
        .vip-crown {
          font-size: 40px; margin-bottom: 12px; display: block;
          filter: drop-shadow(0 0 18px rgba(255,195,0,0.6));
          animation: crownFloat 3s ease-in-out infinite;
        }
        @keyframes crownFloat {
          0%,100%{ transform: translateY(0) rotate(-4deg); }
          50%{ transform: translateY(-7px) rotate(4deg); }
        }
        .vip-modal-title {
          font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800;
          letter-spacing: -1px; color: #f5f8ff; line-height: 1.1;
          margin-bottom: 8px;
        }
        .vip-modal-title .gold {
          background: linear-gradient(135deg, #ffd700 0%, #ffb800 40%, #ff9500 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .vip-modal-subtitle {
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          color: rgba(180,215,240,0.45); line-height: 1.5;
        }

        /* Plans grid */
        .vip-plans {
          position: relative; z-index: 1;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 14px;
          padding: 0 24px 28px;
        }
        @media(max-width:480px){
          .vip-plans { grid-template-columns: 1fr; }
        }

        .vip-plan {
          border-radius: 18px;
          padding: 22px 20px;
          position: relative; overflow: hidden;
        }
        .vip-plan-free {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .vip-plan-vip {
          background: linear-gradient(145deg, rgba(255,195,0,0.08) 0%, rgba(255,140,0,0.05) 60%, rgba(84,199,248,0.04) 100%);
          border: 1px solid rgba(255,195,0,0.28);
          box-shadow: 0 0 40px rgba(255,195,0,0.07), inset 0 1px 0 rgba(255,195,0,0.12);
        }
        .vip-plan-vip::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,195,0,0.6), transparent);
        }

        .vip-plan-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase;
          padding: 4px 10px; border-radius: 100px;
          margin-bottom: 14px;
        }
        .vip-plan-free .vip-plan-badge {
          background: rgba(255,255,255,0.06); color: rgba(180,215,240,0.4);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .vip-plan-vip .vip-plan-badge {
          background: rgba(255,195,0,0.12); color: rgba(255,210,60,0.9);
          border: 1px solid rgba(255,195,0,0.25);
        }
        .vip-badge-dot { width: 5px; height: 5px; border-radius: 50%; }
        .vip-plan-free .vip-badge-dot { background: rgba(180,215,240,0.3); }
        .vip-plan-vip .vip-badge-dot { background: #ffd700; box-shadow: 0 0 6px #ffd700; animation: goldPulse 2s infinite; }
        @keyframes goldPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .vip-plan-price {
          font-family: 'Syne', sans-serif; font-weight: 800; line-height: 1;
          margin-bottom: 4px;
        }
        .vip-plan-free .vip-plan-price { font-size: 26px; color: rgba(240,248,255,0.55); }
        .vip-plan-vip .vip-plan-price {
          font-size: 30px;
          background: linear-gradient(135deg, #ffd700, #ffb800, #ff9500);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .vip-plan-price-sub {
          font-family: 'DM Sans', sans-serif; font-size: 10px;
          color: rgba(180,215,240,0.28); margin-bottom: 18px; letter-spacing: 0.3px;
        }
        .vip-plan-vip .vip-plan-price-sub { color: rgba(255,210,60,0.35); }

        .vip-features-list { display: flex; flex-direction: column; gap: 9px; }
        .vip-feature-row { display: flex; align-items: center; gap: 9px; }
        .vip-feature-icon {
          width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px;
        }
        .vip-feature-icon.yes-free {
          background: rgba(84,199,248,0.1); color: #54c7f8;
        }
        .vip-feature-icon.no-free {
          background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.15);
        }
        .vip-feature-icon.yes-vip {
          background: rgba(255,195,0,0.12); color: #ffd700;
          box-shadow: 0 0 8px rgba(255,195,0,0.2);
        }
        .vip-feature-label {
          font-family: 'DM Sans', sans-serif; font-size: 12.5px; line-height: 1;
        }
        .vip-plan-free .vip-feature-label { color: rgba(180,215,240,0.4); }
        .vip-plan-vip .vip-feature-label { color: rgba(240,248,255,0.82); }
        .vip-plan-free .vip-feature-row.has-no .vip-feature-label { text-decoration: line-through; color: rgba(180,215,240,0.2); }

        /* CTA Buttons */
        .vip-cta-wrap {
          position: relative; z-index: 1;
          padding: 0 24px 32px;
          display: flex; flex-direction: column; gap: 10px;
        }

        .vip-btn-primary {
          width: 100%; padding: 16px;
          background: linear-gradient(135deg, #ffd700 0%, #ffb800 50%, #ff9500 100%);
          border: none; border-radius: 14px;
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800;
          color: #1a0a00; cursor: pointer; letter-spacing: 0.2px;
          position: relative; overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 8px 32px rgba(255,195,0,0.4);
        }
        .vip-btn-primary::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.25), transparent 55%);
        }
        .vip-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 48px rgba(255,195,0,0.55);
        }
        .vip-btn-primary:active { transform: translateY(0); }

        .vip-btn-secondary {
          width: 100%; padding: 13px;
          background: transparent; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; color: rgba(180,215,240,0.35);
          font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer;
          transition: all 0.2s ease;
        }
        .vip-btn-secondary:hover {
          background: rgba(255,255,255,0.04); color: rgba(180,215,240,0.6);
          border-color: rgba(255,255,255,0.12);
        }

        .vip-disclaimer {
          position: relative; z-index: 1;
          text-align: center; font-family: 'DM Sans', sans-serif;
          font-size: 10px; color: rgba(180,215,240,0.18);
          padding: 0 24px 28px; line-height: 1.7; letter-spacing: 0.2px;
        }

        /* Shimmer on VIP card */
        .vip-plan-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,195,0,0.06) 50%, transparent 60%);
          animation: shimmerMove 4s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes shimmerMove {
          0%{ transform: translateX(-100%); }
          60%,100%{ transform: translateX(200%); }
        }
      `}</style>

      <div
        className={`vip-modal-backdrop ${visible ? "in" : ""}`}
        onClick={handleClose}
      >
        <div
          className={`vip-modal ${visible ? "in" : ""}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="vip-modal-aurora" />

          <button className="vip-modal-close" onClick={handleClose}>✕</button>

          {/* Header */}
          <div className="vip-modal-header">
            <span className="vip-crown">👑</span>
            <h2 className="vip-modal-title">
              Turrinder <span className="gold">VIP</span>
            </h2>
            <p className="vip-modal-subtitle">
              Desbloqueá la experiencia completa sin límites.
            </p>
          </div>

          {/* Plans */}
          <div className="vip-plans">

            {/* Free */}
            <div className="vip-plan vip-plan-free">
              <div className="vip-plan-badge">
                <div className="vip-badge-dot" />
                Gratis
              </div>
              <div className="vip-plan-price">$0</div>
              <div className="vip-plan-price-sub">Para siempre</div>
              <div className="vip-features-list">
                {freeFeatures.map((f, i) => (
                  <div key={i} className={`vip-feature-row ${f.has ? "" : "has-no"}`}>
                    <div className={`vip-feature-icon ${f.has ? "yes-free" : "no-free"}`}>
                      {f.has ? "✓" : "✕"}
                    </div>
                    <span className="vip-feature-label">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VIP */}
            <div className="vip-plan vip-plan-vip">
              <div className="vip-plan-shimmer" />
              <div className="vip-plan-badge">
                <div className="vip-badge-dot" />
                VIP
              </div>
              <div className="vip-plan-price">$4.99</div>
              <div className="vip-plan-price-sub">USD / mes</div>
              <div className="vip-features-list">
                {vipFeatures.map((f, i) => (
                  <div key={i} className="vip-feature-row">
                    <div className="vip-feature-icon yes-vip">✓</div>
                    <span className="vip-feature-label">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* CTA */}
          <div className="vip-cta-wrap">
            <button className="vip-btn-primary">
              👑 &nbsp;Activar Turrinder VIP
            </button>
            <button className="vip-btn-secondary" onClick={handleClose}>
              Quedarme con el plan gratis
            </button>
          </div>

          <p className="vip-disclaimer">
            Podés cancelar cuando quieras. Sin compromisos.<br />
            Al suscribirte aceptás los Términos de Uso y la Política de Privacidad.
          </p>
        </div>
      </div>
    </>
  );
}

export default function SideNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = (open || vipOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open, vipOpen]);

  const tabs = [
    { path: "/discover",    img: imgDiscover,    label: "Discover",    desc: "Conocé gente nueva",    accent: "#54c7f8" },
    { path: "/modalidades", img: imgModalidades, label: "Modalidades", desc: "Elegí cómo conectar",   accent: "#a78bfa" },
    { path: "/chat",        img: imgChat,        label: "Chats",       desc: "Tus conversaciones",    accent: "#3b9eda" },
    { path: "/profile",     img: imgPerfil,      label: "Perfil",      desc: "Tu cuenta",             accent: "#7dd8f8" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .snav-toggle {
          position: fixed; top: 50%; left: 0;
          transform: translateY(-50%);
          z-index: 60;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
          width: 36px; height: 72px;
          background: rgba(3,10,20,0.92);
          border: 1px solid rgba(84,199,248,0.18); border-left: none;
          border-radius: 0 14px 14px 0;
          cursor: pointer;
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          box-shadow: 4px 0 24px rgba(0,0,0,0.4), 0 0 16px rgba(84,199,248,0.08);
          transition: width 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          padding: 0; outline: none; -webkit-tap-highlight-color: transparent;
        }
        .snav-toggle:hover {
          width: 40px; background: rgba(84,199,248,0.10);
          box-shadow: 4px 0 28px rgba(0,0,0,0.5), 0 0 24px rgba(84,199,248,0.22);
        }
        .snav-toggle-bar {
          width: 14px; height: 2px; border-radius: 2px;
          background: rgba(255,255,255,0.65);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); transform-origin: center;
        }
        .snav-toggle.is-open .snav-toggle-bar:nth-child(1) { transform: translateY(7px) rotate(45deg);  background: #54c7f8; }
        .snav-toggle.is-open .snav-toggle-bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .snav-toggle.is-open .snav-toggle-bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); background: #54c7f8; }

        .snav-toggle-pip {
          position: absolute; top: 10px; right: 8px;
          width: 5px; height: 5px; border-radius: 50%;
          background: #54c7f8; box-shadow: 0 0 6px #54c7f8;
          animation: pipPulse 2s ease-in-out infinite;
        }
        @keyframes pipPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

        .snav-backdrop {
          position: fixed; inset: 0; z-index: 55;
          background: rgba(0,0,0,0); pointer-events: none;
          transition: background 0.35s ease, backdrop-filter 0.35s ease;
        }
        .snav-backdrop.visible {
          background: rgba(0,0,0,0.65); pointer-events: all;
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        }

        .snav-panel {
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 58;
          width: 280px;
          background: rgba(3,10,20,0.97);
          border-right: 1px solid rgba(84,199,248,0.14);
          backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px);
          display: flex; flex-direction: column; padding: 0;
          transform: translateX(-100%);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 8px 0 60px rgba(0,0,0,0.6), 0 0 80px rgba(84,199,248,0.05);
          overflow: hidden;
        }
        .snav-panel.open { transform: translateX(0); }

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

        .snav-header {
          position: relative; z-index: 2;
          display: flex; align-items: center; gap: 12px;
          padding: 36px 28px 28px;
          border-bottom: 1px solid rgba(84,199,248,0.12);
        }
        .snav-logo-icon {
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden;
        }
        .snav-logo-text {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          letter-spacing: -0.5px; color: #f5f8ff; line-height: 1;
        }
        .snav-logo-text span {
          background: linear-gradient(135deg, #54c7f8, #3b9eda, #1a6fa8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .snav-items {
          position: relative; z-index: 2; flex: 1;
          display: flex; flex-direction: column; gap: 2px;
          padding: 20px 14px;
        }

        .snav-item {
          display: flex; align-items: center; gap: 14px;
          padding: 11px 14px;
          border-radius: 14px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left; width: 100%;
          position: relative; overflow: hidden;
          opacity: 0; transform: translateX(-20px);
          -webkit-tap-highlight-color: transparent; outline: none;
        }
        .snav-panel.open .snav-item {
          animation: itemSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes itemSlideIn { to { opacity: 1; transform: translateX(0); } }

        .snav-item::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.035), transparent);
          transform: translateX(-120%); transition: transform 0.55s ease;
        }
        .snav-item:hover::before { transform: translateX(120%); }
        .snav-item:hover {
          background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.06);
          transform: translateX(3px);
        }
        .snav-item.active {
          background: var(--item-accent-bg); border-color: var(--item-accent-border);
        }
        .snav-item.active:hover { transform: translateX(3px); }

        .snav-item-icon {
          width: 38px; height: 38px; flex-shrink: 0;
          position: relative;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease;
          filter: brightness(0.45) saturate(0.2);
        }
        .snav-item.active .snav-item-icon {
          filter: brightness(1) saturate(1.1) drop-shadow(0 0 7px var(--item-accent));
        }
        .snav-item:hover .snav-item-icon {
          transform: scale(1.2) rotate(-5deg);
          filter: brightness(0.75) saturate(0.5);
        }
        .snav-item.active:hover .snav-item-icon {
          transform: scale(1.2) rotate(-5deg);
          filter: brightness(1.1) saturate(1.3) drop-shadow(0 0 10px var(--item-accent));
        }

        .snav-item-icon-glow {
          position: absolute; inset: -8px; border-radius: 50%;
          background: radial-gradient(circle, var(--item-accent) 0%, transparent 70%);
          opacity: 0; transition: opacity 0.3s ease; z-index: -1; filter: blur(7px);
        }
        .snav-item.active .snav-item-icon-glow { opacity: 0.3; }

        .snav-item-text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .snav-item-label {
          font-family: 'Syne', sans-serif; font-size: 13.5px; font-weight: 700;
          color: rgba(255,255,255,0.45); transition: color 0.2s ease;
          line-height: 1; letter-spacing: -0.2px;
        }
        .snav-item.active .snav-item-label { color: #f5f8ff; }
        .snav-item-desc {
          font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 400;
          color: rgba(180,215,240,0.25); line-height: 1; transition: color 0.2s ease;
        }
        .snav-item.active .snav-item-desc { color: rgba(180,215,240,0.5); }

        .snav-item-dot {
          width: 3px; height: 16px; border-radius: 3px; flex-shrink: 0;
          background: var(--item-accent, #54c7f8);
          box-shadow: 0 0 10px var(--item-accent, #54c7f8);
          opacity: 0; transform: scaleY(0);
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .snav-item.active .snav-item-dot { opacity: 1; transform: scaleY(1); }

        .snav-divider {
          position: relative; z-index: 2;
          display: flex; align-items: center; gap: 10px;
          padding: 8px 14px 5px;
        }
        .snav-divider-line { flex: 1; height: 1px; background: rgba(84,199,248,0.07); }
        .snav-divider-label {
          font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 500;
          letter-spacing: 2px; text-transform: uppercase;
          color: rgba(180,215,240,0.18); white-space: nowrap;
        }

        /* ── VIP Button ── */
        .snav-vip-wrap {
          position: relative; z-index: 2;
          padding: 14px 14px 10px;
        }
        .snav-vip-btn {
          width: 100%;
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,195,0,0.10) 0%, rgba(255,140,0,0.07) 60%, rgba(255,195,0,0.05) 100%);
          border: 1px solid rgba(255,195,0,0.28);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative; overflow: hidden;
          -webkit-tap-highlight-color: transparent; outline: none;
          box-shadow: 0 0 24px rgba(255,195,0,0.06), inset 0 1px 0 rgba(255,195,0,0.10);
          opacity: 0; transform: translateX(-20px);
        }
        .snav-panel.open .snav-vip-btn {
          animation: itemSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.38s forwards;
        }
        .snav-vip-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 30%, rgba(255,195,0,0.08) 50%, transparent 70%);
          transform: translateX(-120%);
          transition: transform 0.65s ease;
        }
        .snav-vip-btn:hover::before { transform: translateX(120%); }
        .snav-vip-btn:hover {
          background: linear-gradient(135deg, rgba(255,195,0,0.17) 0%, rgba(255,140,0,0.12) 60%, rgba(255,195,0,0.09) 100%);
          border-color: rgba(255,195,0,0.48);
          transform: translateX(3px);
          box-shadow: 0 0 36px rgba(255,195,0,0.14), inset 0 1px 0 rgba(255,195,0,0.18);
        }
        .snav-vip-btn:active { transform: scale(0.98) translateX(0); }

        .snav-vip-crown {
          font-size: 22px; flex-shrink: 0; line-height: 1;
          filter: drop-shadow(0 0 8px rgba(255,195,0,0.7));
          animation: crownBounce 3s ease-in-out infinite;
        }
        @keyframes crownBounce {
          0%,100%{ transform: translateY(0) rotate(-5deg); }
          50%{ transform: translateY(-4px) rotate(5deg); }
        }

        .snav-vip-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .snav-vip-label {
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800;
          letter-spacing: -0.2px; line-height: 1;
          background: linear-gradient(135deg, #ffd700 0%, #ffb800 50%, #ff9500 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .snav-vip-sub {
          font-family: 'DM Sans', sans-serif; font-size: 10px;
          color: rgba(255,195,0,0.38); line-height: 1;
        }

        .snav-vip-arrow {
          font-size: 12px; color: rgba(255,195,0,0.45);
          transition: transform 0.25s ease, color 0.25s ease;
        }
        .snav-vip-btn:hover .snav-vip-arrow {
          transform: translateX(3px); color: rgba(255,195,0,0.85);
        }

        .snav-footer {
          position: relative; z-index: 2;
          padding: 18px 28px 30px;
          border-top: 1px solid rgba(84,199,248,0.07);
        }
        .snav-footer-line {
          font-family: 'DM Sans', sans-serif; font-size: 10px;
          color: rgba(180,215,240,0.16); letter-spacing: 0.4px; text-align: center;
        }
      `}</style>

      {/* Backdrop nav */}
      <div className={`snav-backdrop ${open ? "visible" : ""}`} onClick={() => setOpen(false)} />

      {/* Toggle */}
      <button
        className={`snav-toggle ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        <div className="snav-toggle-bar" />
        <div className="snav-toggle-bar" />
        <div className="snav-toggle-bar" />
        {!open && <div className="snav-toggle-pip" />}
      </button>

      {/* Panel */}
      <nav className={`snav-panel ${open ? "open" : ""}`}>
        <div className="snav-panel-aurora" />

        <div className="snav-header">
          <div className="snav-logo-icon">
            <Image src={imgLogo} alt="Turrinder logo" width={40} height={40}
              style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </div>
          <div>
            <div className="snav-logo-text">Turr<span>inder</span></div>
          </div>
        </div>

        <div className="snav-items">
          {tabs.map((tab, i) => {
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
                  onClick={() => router.push(tab.path)}
                  style={{
                    animationDelay: `${0.06 + i * 0.07}s`,
                    "--item-accent":        tab.accent,
                    "--item-accent-bg":     `${tab.accent}12`,
                    "--item-accent-border": `${tab.accent}26`,
                  } as React.CSSProperties}
                >
                  <div className="snav-item-icon" style={{ "--item-accent": tab.accent } as React.CSSProperties}>
                    <div className="snav-item-icon-glow" />
                    <Image src={tab.img} alt={tab.label} width={34} height={34}
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

        {/* VIP Button */}
        <div className="snav-vip-wrap">
          <button
            className="snav-vip-btn"
            onClick={() => { setOpen(false); setTimeout(() => setVipOpen(true), 200); }}
          >
            <span className="snav-vip-crown">👑</span>
            <div className="snav-vip-text">
              <span className="snav-vip-label">Turrinder VIP</span>
              <span className="snav-vip-sub">Desbloqueá todo · $4.99/mes</span>
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