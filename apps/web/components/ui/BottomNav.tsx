"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import imgLogo        from "../../Images/logo.png";
import imgChat        from "../../Images/chat.png";
import imgDiscover    from "../../Images/discover.png";
import imgModalidades from "../../Images/modalidades.png";
import imgPerfil      from "../../Images/perfil.png";

export default function SideNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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

        /* ── Icon: solo imagen, sin recuadro ── */
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

        /* Glow blob detrás del ícono */
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

        /* Pill indicador activo */
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

      {/* Backdrop */}
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
                  {/* Ícono: imagen directa sin recuadro */}
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

        <div className="snav-footer">
          <p className="snav-footer-line">Turrinder © {new Date().getFullYear()}</p>
        </div>
      </nav>
    </>
  );
}