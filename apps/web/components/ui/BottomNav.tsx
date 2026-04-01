"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function SideNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const tabs = [
    {
      path: "/discover",
      icon: "🔥",
      label: "Discover",
      desc: "Conocé gente nueva",
      accent: "#ff2d6b",
    },
    {
      path: "/chat",
      icon: "💬",
      label: "Chats",
      desc: "Tus conversaciones",
      accent: "#ff6b35",
    },
    {
      path: "/profile",
      icon: "👤",
      label: "Perfil",
      desc: "Tu cuenta",
      accent: "#ffc947",
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        /* ── Toggle button — always visible ── */
        .snav-toggle {
          position: fixed;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          z-index: 60;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: 36px;
          height: 72px;
          background: rgba(10,10,22,0.9);
          border: 1px solid rgba(255,255,255,0.07);
          border-left: none;
          border-radius: 0 14px 14px 0;
          cursor: pointer;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 4px 0 24px rgba(0,0,0,0.4), 0 0 16px rgba(255,45,107,0.08);
          transition: width 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          padding: 0;
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }

        .snav-toggle:hover {
          width: 40px;
          background: rgba(255,45,107,0.08);
          box-shadow: 4px 0 28px rgba(0,0,0,0.5), 0 0 24px rgba(255,45,107,0.18);
        }

        .snav-toggle-bar {
          width: 14px;
          height: 2px;
          border-radius: 2px;
          background: rgba(255,255,255,0.5);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: center;
        }

        .snav-toggle.is-open .snav-toggle-bar:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
          background: #ff2d6b;
        }
        .snav-toggle.is-open .snav-toggle-bar:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }
        .snav-toggle.is-open .snav-toggle-bar:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
          background: #ff2d6b;
        }

        /* Subtle glow pip on toggle showing active route */
        .snav-toggle-pip {
          position: absolute;
          top: 10px;
          right: 8px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ff2d6b;
          box-shadow: 0 0 6px #ff2d6b;
          animation: pipPulse 2s ease-in-out infinite;
        }

        @keyframes pipPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }

        /* ── Backdrop ── */
        .snav-backdrop {
          position: fixed;
          inset: 0;
          z-index: 55;
          background: rgba(0,0,0,0);
          pointer-events: none;
          transition: background 0.35s ease;
        }

        .snav-backdrop.visible {
          background: rgba(0,0,0,0.55);
          pointer-events: all;
        }

        /* ── Panel ── */
        .snav-panel {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 58;
          width: 280px;
          background: rgba(8,8,18,0.96);
          border-right: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          display: flex;
          flex-direction: column;
          padding: 0;
          transform: translateX(-100%);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 8px 0 60px rgba(0,0,0,0.6), 0 0 80px rgba(255,45,107,0.05);
          overflow: hidden;
        }

        .snav-panel.open {
          transform: translateX(0);
        }

        /* Decorative aurora inside panel */
        .snav-panel-aurora {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 40% at 20% 10%, rgba(255,45,107,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 90%, rgba(255,107,53,0.08) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        /* Thin gradient line on right edge */
        .snav-panel::after {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 1px;
          background: linear-gradient(to bottom,
            transparent 0%,
            rgba(255,45,107,0.3) 30%,
            rgba(255,107,53,0.2) 60%,
            transparent 100%
          );
          z-index: 1;
        }

        /* ── Panel header ── */
        .snav-header {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 36px 28px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .snav-logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ff2d6b 0%, #ff6b35 60%, #ffc947 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          box-shadow: 0 0 20px rgba(255,45,107,0.4), 0 0 40px rgba(255,45,107,0.15);
        }

        .snav-logo-text {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: white;
          line-height: 1;
        }

        .snav-logo-text span {
          background: linear-gradient(135deg, #ff2d6b, #ff6b35, #ffc947);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .snav-logo-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 1.8px;
          text-transform: uppercase;
          margin-top: 2px;
          font-weight: 300;
        }

        /* ── Nav items ── */
        .snav-items {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 24px 16px;
        }

        .snav-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: left;
          width: 100%;
          position: relative;
          overflow: hidden;
          /* stagger-in animation vars set inline */
          opacity: 0;
          transform: translateX(-16px);
        }

        .snav-panel.open .snav-item {
          animation: itemSlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes itemSlideIn {
          to { opacity: 1; transform: translateX(0); }
        }

        .snav-item:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.07);
          transform: translateX(4px);
        }

        .snav-item.active {
          background: rgba(255,45,107,0.08);
          border-color: rgba(255,45,107,0.18);
        }

        /* Shimmer on hover */
        .snav-item::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }

        .snav-item:hover::before { transform: translateX(100%); }

        .snav-item-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.25s ease;
        }

        .snav-item.active .snav-item-icon-wrap {
          background: var(--item-accent-bg);
          border-color: var(--item-accent-border);
          box-shadow: 0 0 16px var(--item-accent-glow);
        }

        .snav-item:hover .snav-item-icon-wrap {
          transform: scale(1.08) rotate(-3deg);
        }

        .snav-item-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .snav-item-label {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: rgba(255,255,255,0.75);
          transition: color 0.2s ease;
          line-height: 1;
        }

        .snav-item.active .snav-item-label {
          color: white;
        }

        .snav-item-desc {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 300;
          color: rgba(255,255,255,0.25);
          line-height: 1;
        }

        /* Active indicator dot */
        .snav-item-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--item-accent, #ff2d6b);
          box-shadow: 0 0 8px var(--item-accent, #ff2d6b);
          flex-shrink: 0;
          opacity: 0;
          transform: scale(0);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .snav-item.active .snav-item-dot {
          opacity: 1;
          transform: scale(1);
        }

        /* ── Footer inside panel ── */
        .snav-footer {
          position: relative;
          z-index: 2;
          padding: 20px 28px 32px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .snav-footer-line {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          color: rgba(255,255,255,0.1);
          letter-spacing: 0.4px;
          text-align: center;
        }

        /* ── Spacer so page content doesn't hide under toggle ── */
        .snav-page-offset {
          padding-left: 44px;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className={`snav-backdrop ${open ? "visible" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* Toggle button */}
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

      {/* Slide-out panel */}
      <nav className={`snav-panel ${open ? "open" : ""}`}>
        <div className="snav-panel-aurora" />

        {/* Header */}
        <div className="snav-header">
          <div className="snav-logo-icon">🔥</div>
          <div>
            <div className="snav-logo-text">Turr<span>inder</span></div>
            <div className="snav-logo-sub">Tinder meets OmeTV</div>
          </div>
        </div>

        {/* Nav items */}
        <div className="snav-items">
          {tabs.map((tab, i) => {
            const isActive = pathname === tab.path || pathname.startsWith(tab.path + "/");
            return (
              <button
                key={tab.path}
                className={`snav-item ${isActive ? "active" : ""}`}
                onClick={() => router.push(tab.path)}
                style={{
                  animationDelay: `${0.08 + i * 0.07}s`,
                  "--item-accent": tab.accent,
                  "--item-accent-bg": `${tab.accent}18`,
                  "--item-accent-border": `${tab.accent}30`,
                  "--item-accent-glow": `${tab.accent}40`,
                } as React.CSSProperties}
              >
                <div className="snav-item-icon-wrap">{tab.icon}</div>
                <div className="snav-item-text">
                  <span className="snav-item-label">{tab.label}</span>
                  <span className="snav-item-desc">{tab.desc}</span>
                </div>
                <div className="snav-item-dot" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="snav-footer">
          <p className="snav-footer-line">Turrinder © 2025</p>
        </div>
      </nav>
    </>
  );
}