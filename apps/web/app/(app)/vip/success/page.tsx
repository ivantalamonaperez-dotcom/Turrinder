"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase.client";

const DISCORD_INVITE = "https://discord.gg/jXkEpvCvRD";

function VipSuccessContent() {
  const router       = useRouter();
  const [count,    setCount]    = useState(10);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const checkVip = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "vip") setVerified(true);
    };

    checkVip();
    const poll = setInterval(checkVip, 2000);

    const countdown = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(countdown);
          clearInterval(poll);
          router.push("/profile");
        }
        return c - 1;
      });
    }, 1000);

    return () => { clearInterval(poll); clearInterval(countdown); };
  }, [router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        .vs {
          min-height: 100dvh;
          background: #030a14;
          display: flex; align-items: center; justify-content: center;
          padding: 32px; position: relative; overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .vs::before {
          content: ''; position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,195,0,0.11) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 80%, rgba(84,199,248,0.06) 0%, transparent 55%);
          pointer-events: none;
        }

        /* Partículas de fondo */
        .vs-particles {
          position: absolute; inset: 0; pointer-events: none; overflow: hidden;
        }
        .vs-particle {
          position: absolute; border-radius: 50%;
          background: rgba(255,195,0,0.15);
          animation: floatUp linear infinite;
        }
        @keyframes floatUp {
          0%   { transform: translateY(110vh) scale(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(-10vh) scale(1); opacity: 0; }
        }

        .vs-card {
          position: relative; z-index: 1;
          max-width: 440px; width: 100%;
          background: linear-gradient(160deg, #05101e 0%, #020a16 100%);
          border: 1px solid rgba(255,195,0,0.2);
          border-radius: 28px; padding: 44px 32px 36px;
          text-align: center;
          box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 60px rgba(255,195,0,0.06);
          animation: cardIn 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        .vs-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,195,0,0.5), transparent);
          border-radius: 28px 28px 0 0;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.95); }
          to   { opacity: 1; transform: none; }
        }

        .vs-crown {
          font-size: 54px; display: block; margin-bottom: 18px;
          filter: drop-shadow(0 0 24px rgba(255,195,0,0.7));
          animation: crownIn 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.2s both;
        }
        @keyframes crownIn {
          from { opacity: 0; transform: scale(0.3) rotate(-20deg); }
          to   { opacity: 1; transform: none; }
        }

        .vs-title {
          font-family: 'Syne', sans-serif;
          font-size: 30px; font-weight: 900; letter-spacing: -1px;
          color: #f5f8ff; margin-bottom: 10px; line-height: 1.1;
        }
        .vs-title .gold {
          background: linear-gradient(135deg, #ffd700, #ffb800, #ff9500);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .vs-sub {
          font-size: 14px; color: rgba(180,215,240,0.45); line-height: 1.6; margin-bottom: 24px;
        }

        .vs-status {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 100px;
          font-size: 12px; font-weight: 600; margin-bottom: 24px;
        }
        .vs-status.checking {
          background: rgba(84,199,248,0.08); border: 1px solid rgba(84,199,248,0.2); color: rgba(84,199,248,0.7);
        }
        .vs-status.ok {
          background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); color: #4ade80;
        }
        .vs-dot { width: 7px; height: 7px; border-radius: 50%; animation: blink 1.2s ease-in-out infinite; }
        .vs-status.checking .vs-dot { background: #54c7f8; }
        .vs-status.ok       .vs-dot { background: #4ade80; animation: none; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .vs-perks {
          display: flex; flex-direction: column; gap: 9px;
          margin-bottom: 24px; text-align: left;
        }
        .vs-perk {
          display: flex; align-items: center; gap: 11px;
          padding: 11px 14px;
          background: rgba(255,195,0,0.04);
          border: 1px solid rgba(255,195,0,0.10);
          border-radius: 12px;
        }
        .vs-perk-icon { font-size: 17px; flex-shrink: 0; }
        .vs-perk-text { font-size: 13px; color: rgba(240,248,255,0.7); }

        /* ── DISCORD BANNER ── */
        .vs-discord-banner {
          position: relative; overflow: hidden;
          margin-bottom: 20px;
          padding: 18px 18px 18px 20px;
          background: linear-gradient(135deg, rgba(88,101,242,0.12) 0%, rgba(88,101,242,0.06) 100%);
          border: 1px solid rgba(88,101,242,0.32);
          border-radius: 18px;
          text-align: left;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          display: flex; align-items: center; gap: 16px;
        }
        .vs-discord-banner::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(114,137,218,0.5), transparent);
        }
        .vs-discord-banner::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(114,137,218,0.06) 50%, transparent 60%);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .vs-discord-banner:hover { border-color: rgba(88,101,242,0.6); background: linear-gradient(135deg, rgba(88,101,242,0.18) 0%, rgba(88,101,242,0.09) 100%); transform: translateY(-2px); box-shadow: 0 12px 32px rgba(88,101,242,0.18); }
        .vs-discord-banner:hover::after { transform: translateX(200%); }

        .vs-discord-icon {
          flex-shrink: 0;
          width: 44px; height: 44px;
          background: rgba(88,101,242,0.15);
          border: 1px solid rgba(88,101,242,0.3);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .vs-discord-banner:hover .vs-discord-icon { transform: scale(1.12) rotate(-5deg); }

        .vs-discord-body { flex: 1; min-width: 0; }
        .vs-discord-title {
          font-family: 'Syne', sans-serif;
          font-size: 14px; font-weight: 800; letter-spacing: -0.2px;
          background: linear-gradient(135deg, #b9beff, #7289da);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          margin-bottom: 3px;
        }
        .vs-discord-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; color: rgba(180,215,240,0.4); line-height: 1.4;
        }
        .vs-discord-sub strong { color: rgba(114,137,218,0.8); font-weight: 600; }

        .vs-discord-arrow {
          flex-shrink: 0;
          width: 28px; height: 28px;
          background: rgba(88,101,242,0.12);
          border: 1px solid rgba(88,101,242,0.22);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: rgba(114,137,218,0.7);
          font-size: 13px;
          transition: all 0.2s ease;
        }
        .vs-discord-banner:hover .vs-discord-arrow {
          background: rgba(88,101,242,0.22); color: #7289da;
          transform: translateX(2px);
        }

        /* Badge "Reclamá tu rol" */
        .vs-discord-badge {
          position: absolute; top: -1px; right: 14px;
          padding: 3px 10px;
          background: linear-gradient(135deg, #5865f2, #7289da);
          border-radius: 0 0 10px 10px;
          font-family: 'Syne', sans-serif;
          font-size: 8px; font-weight: 800; letter-spacing: 1.2px;
          color: #fff; text-transform: uppercase;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(88,101,242,0.4);
        }

        .vs-btn {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, #ffd700, #ffb800, #ff9500);
          border: none; border-radius: 14px;
          color: #1a0800; font-family: 'Syne', sans-serif;
          font-size: 15px; font-weight: 800;
          cursor: pointer; margin-bottom: 12px;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 6px 24px rgba(255,195,0,0.35);
        }
        .vs-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(255,195,0,0.5); }

        .vs-redirect {
          font-size: 11px; color: rgba(180,215,240,0.25);
        }
        .vs-redirect strong { color: rgba(255,195,0,0.55); }
      `}</style>

      {/* Partículas decorativas */}
      <div className="vs-particles" aria-hidden="true">
        {[
          { w: 6,  l: "15%", d: "8s",  del: "0s"   },
          { w: 4,  l: "25%", d: "11s", del: "2s"   },
          { w: 8,  l: "40%", d: "9s",  del: "4s"   },
          { w: 5,  l: "55%", d: "13s", del: "1s"   },
          { w: 7,  l: "70%", d: "10s", del: "3s"   },
          { w: 4,  l: "82%", d: "12s", del: "5s"   },
          { w: 6,  l: "92%", d: "8.5s",del: "0.5s" },
        ].map((p, i) => (
          <div key={i} className="vs-particle" style={{
            width: p.w, height: p.w,
            left: p.l, bottom: "-20px",
            animationDuration: p.d,
            animationDelay: p.del,
          }} />
        ))}
      </div>

      <div className="vs">
        <div className="vs-card">
          <span className="vs-crown">👑</span>
          <div className="vs-title">¡Bienvenido al<br /><span className="gold">VIP Club!</span></div>
          <p className="vs-sub">Tu pago fue aprobado. Ahora tenés acceso a todos los beneficios exclusivos.</p>

          <div className={`vs-status ${verified ? "ok" : "checking"}`}>
            <div className="vs-dot" />
            {verified ? "VIP activado en tu perfil ✓" : "Verificando pago..."}
          </div>

          <div className="vs-perks">
            {[
              { icon: "🚫", text: "Sin anuncios — experiencia limpia" },
              { icon: "❤️", text: "Likes ilimitados" },
              { icon: "🔒", text: "Crear salas privadas" },
              { icon: "⭐", text: "Badge VIP en tu perfil" },
            ].map(p => (
              <div key={p.text} className="vs-perk">
                <span className="vs-perk-icon">{p.icon}</span>
                <span className="vs-perk-text">{p.text}</span>
              </div>
            ))}
          </div>

          {/* ── Banner Discord ── */}
          <div
            className="vs-discord-banner"
            role="link"
            tabIndex={0}
            onClick={() => window.open(DISCORD_INVITE, "_blank", "noopener,noreferrer")}
            onKeyDown={e => e.key === "Enter" && window.open(DISCORD_INVITE, "_blank", "noopener,noreferrer")}
            aria-label="Unirse al Discord de Turrinder para reclamar el rol VIP"
          >
            <div className="vs-discord-badge">¡Reclamá tu rol!</div>

            <div className="vs-discord-icon">
              {/* SVG Discord */}
              <svg viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 24, height: 24 }}>
                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C7.41766 50.6984 14.2196 53.8667 20.8922 55.9637C20.9846 55.9921 21.0825 55.9583 21.1413 55.8822C22.7143 53.7559 24.1215 51.5168 25.3294 49.1626C25.3908 49.0436 25.3322 48.9019 25.2063 48.8564C23.0161 48.0394 20.9273 47.0412 18.9157 45.9066C18.7756 45.8279 18.7645 45.6294 18.8941 45.5351C19.3065 45.2243 19.7189 44.9022 20.1146 44.5773C20.1789 44.5238 20.2681 44.5125 20.3437 44.5464C32.1484 49.9712 44.7899 49.9712 56.4567 44.5464C56.5323 44.5097 56.6215 44.521 56.6886 44.5745C57.0843 44.8994 57.4967 45.2243 57.9119 45.5351C58.0415 45.6294 58.0332 45.8279 57.8931 45.9066C55.8815 47.0638 53.7927 48.0394 51.5997 48.8536C51.4739 48.8992 51.418 49.0436 51.4794 49.1626C52.7121 51.5139 54.1193 53.7531 55.6618 55.8794C55.7178 55.9583 55.8185 55.9921 55.9109 55.9637C62.6111 53.8667 69.413 50.6984 76.4449 45.5576C76.4981 45.5182 76.5317 45.459 76.5373 45.3942C78.0432 30.0791 74.0539 16.7757 66.1392 4.9823C66.1197 4.9429 66.0861 4.9147 66.0469 4.8978H60.1045ZM25.5141 37.3591C22.1968 37.3591 19.4745 34.3312 19.4745 30.6032C19.4745 26.8752 22.1413 23.8474 25.5141 23.8474C28.9121 23.8474 31.6067 26.9009 31.5539 30.6032C31.5539 34.3312 28.887 37.3591 25.5141 37.3591ZM50.4986 37.3591C47.1754 37.3591 44.4531 34.3312 44.4531 30.6032C44.4531 26.8752 47.1199 23.8474 50.4986 23.8474C53.8981 23.8474 56.5927 26.9009 56.5399 30.6032C56.5399 34.3312 53.8981 37.3591 50.4986 37.3591Z" fill="#7289da"/>
              </svg>
            </div>

            <div className="vs-discord-body">
              <div className="vs-discord-title">Reclamá tu rol VIP en Discord</div>
              <div className="vs-discord-sub">
                Unite a nuestra comunidad y usá el botón de <strong>reclamar VIP</strong> con tu ID de perfil.
              </div>
            </div>

            <div className="vs-discord-arrow">→</div>
          </div>

          <button className="vs-btn" onClick={() => router.push("/profile")}>
            Ir a mi perfil ✦
          </button>
          <p className="vs-redirect">Redirigiendo en <strong>{count}s</strong>...</p>
        </div>
      </div>
    </>
  );
}

export default function VipSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#030a14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(255,195,0,0.2)", borderTopColor: "#ffd700", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <VipSuccessContent />
    </Suspense>
  );
}