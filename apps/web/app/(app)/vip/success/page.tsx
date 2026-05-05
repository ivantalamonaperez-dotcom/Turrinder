"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase.client";

// Componente interno separado — necesario para que Suspense funcione con useRouter
function VipSuccessContent() {
  const router       = useRouter();
  const [count,    setCount]    = useState(6);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // MP puede tardar unos segundos en procesar el webhook.
    // Hacemos polling liviano al perfil para confirmar que ya es VIP.
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

        .vs { min-height: 100dvh; background: #030a14; display: flex; align-items: center; justify-content: center; padding: 32px; position: relative; overflow: hidden; font-family: 'DM Sans', sans-serif; }
        .vs::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,195,0,0.11) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(84,199,248,0.06) 0%, transparent 55%); pointer-events: none; }

        .vs-card { position: relative; z-index: 1; max-width: 420px; width: 100%; background: linear-gradient(160deg, #05101e 0%, #020a16 100%); border: 1px solid rgba(255,195,0,0.2); border-radius: 28px; padding: 52px 36px; text-align: center; box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 60px rgba(255,195,0,0.06); animation: cardIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .vs-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,195,0,0.5), transparent); border-radius: 28px 28px 0 0; }
        @keyframes cardIn { from { opacity: 0; transform: translateY(28px) scale(0.95); } to { opacity: 1; transform: none; } }

        .vs-crown { font-size: 54px; display: block; margin-bottom: 18px; filter: drop-shadow(0 0 24px rgba(255,195,0,0.7)); animation: crownIn 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.2s both; }
        @keyframes crownIn { from { opacity: 0; transform: scale(0.3) rotate(-20deg); } to { opacity: 1; transform: none; } }

        .vs-title { font-family: 'Syne', sans-serif; font-size: 30px; font-weight: 900; letter-spacing: -1px; color: #f5f8ff; margin-bottom: 10px; line-height: 1.1; }
        .vs-title .gold { background: linear-gradient(135deg, #ffd700, #ffb800, #ff9500); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .vs-sub { font-size: 14px; color: rgba(180,215,240,0.45); line-height: 1.6; margin-bottom: 30px; }

        .vs-status { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 100px; font-size: 12px; font-weight: 600; margin-bottom: 28px; }
        .vs-status.checking { background: rgba(84,199,248,0.08); border: 1px solid rgba(84,199,248,0.2); color: rgba(84,199,248,0.7); }
        .vs-status.ok       { background: rgba(34,197,94,0.08);  border: 1px solid rgba(34,197,94,0.2);  color: #4ade80; }
        .vs-dot { width: 7px; height: 7px; border-radius: 50%; animation: blink 1.2s ease-in-out infinite; }
        .vs-status.checking .vs-dot { background: #54c7f8; }
        .vs-status.ok       .vs-dot { background: #4ade80; animation: none; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .vs-perks { display: flex; flex-direction: column; gap: 9px; margin-bottom: 32px; text-align: left; }
        .vs-perk { display: flex; align-items: center; gap: 11px; padding: 11px 14px; background: rgba(255,195,0,0.04); border: 1px solid rgba(255,195,0,0.10); border-radius: 12px; }
        .vs-perk-icon { font-size: 17px; flex-shrink: 0; }
        .vs-perk-text { font-size: 13px; color: rgba(240,248,255,0.7); }

        .vs-btn { width: 100%; padding: 15px; background: linear-gradient(135deg, #ffd700, #ffb800, #ff9500); border: none; border-radius: 14px; color: #1a0800; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; cursor: pointer; margin-bottom: 12px; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 6px 24px rgba(255,195,0,0.35); }
        .vs-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(255,195,0,0.5); }
        .vs-redirect { font-size: 11px; color: rgba(180,215,240,0.25); }
        .vs-redirect strong { color: rgba(255,195,0,0.55); }
      `}</style>

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

          <button className="vs-btn" onClick={() => router.push("/profile")}>
            Ir a mi perfil ✦
          </button>
          <p className="vs-redirect">Redirigiendo en <strong>{count}s</strong>...</p>
        </div>
      </div>
    </>
  );
}

// Suspense es obligatorio cuando hay hooks de navegación en páginas estáticas de Next.js
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