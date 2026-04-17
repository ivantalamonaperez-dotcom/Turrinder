"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import img from "../Images/logo.png";

/* ─── TYPES ──────────────────────────────────────────────────── */
interface Profile {
  name: string;
  age: number;
  city: string;
  img: string;
  live: boolean;
}

/* ─── DATA ───────────────────────────────────────────────────── */
const profiles: Profile[] = [
  { name: "Valentina", age: 23, city: "Córdoba",      img: "https://randomuser.me/api/portraits/women/43.jpg", live: true  },
  { name: "Lucía",     age: 26, city: "Buenos Aires", img: "https://randomuser.me/api/portraits/women/68.jpg", live: true  },
  { name: "Martina",   age: 22, city: "Rosario",      img: "https://randomuser.me/api/portraits/women/90.jpg", live: false },
  { name: "Agustín",   age: 28, city: "Mendoza",      img: "https://randomuser.me/api/portraits/men/32.jpg",   live: true  },
  { name: "Sofía",     age: 25, city: "Montevideo",   img: "https://randomuser.me/api/portraits/women/33.jpg", live: true  },
  { name: "Tomás",     age: 24, city: "Santiago",     img: "https://randomuser.me/api/portraits/men/75.jpg",   live: false },
];

const recentNames = [
  "Valentina de Córdoba","Lucía de Bs As","Martina de Rosario",
  "Agustín de Mendoza","Sofía de Montevideo","Diego de Santiago",
  "Camila de Lima","Nicolás de Bogotá",
];

const marqueeItems = [
  "📹 Video en vivo","💬 Chat en tiempo real","🔥 Matches al instante",
  "🌍 Usuarios de 47 países","⚡ Sin registro obligatorio","🎯 IA de matcheo",
  "📸 Perfiles verificados","🔒 100% privado","💫 Conexiones genuinas",
  "🎲 Modo aleatorio","❤️ +2M de matches","🚀 Lanzamiento 2025",
];

const spAvatars = [
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/men/22.jpg",
  "https://randomuser.me/api/portraits/women/55.jpg",
  "https://randomuser.me/api/portraits/men/66.jpg",
];

const particleColors = ["#ff2d6b","#ff6b35","#ffc947","#ff4488","#ff8c42","#e91e8c"];

/* ─── STYLES ─────────────────────────────────────────────────── */
const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Clash+Display:wght@500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --hot:#ff2d6b; --hot2:#ff6b35; --hot3:#ffc947;
  --hot-glow:rgba(255,45,107,0.45);
  --bg:#05050f; --bg2:#08081a; --bg3:#0d0d20;
  --glass:rgba(255,255,255,0.03);
  --glass-b:rgba(255,255,255,0.07);
  --text:rgba(255,255,255,0.85);
  --muted:rgba(255,255,255,0.32);
  --subtle:rgba(255,255,255,0.08);
}
html,body{height:100%;background:var(--bg);color:var(--text);overflow-x:hidden}
body{font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}

body::before{
  content:'';position:fixed;inset:0;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  opacity:0.35;pointer-events:none;z-index:0;
}

.aurora{
  position:fixed;inset:0;z-index:0;
  background:
    radial-gradient(ellipse 70% 55% at 15% 20%,rgba(255,45,107,0.18) 0%,transparent 60%),
    radial-gradient(ellipse 55% 45% at 85% 75%,rgba(255,107,53,0.13) 0%,transparent 58%),
    radial-gradient(ellipse 40% 40% at 70% 15%,rgba(255,68,136,0.09) 0%,transparent 55%),
    radial-gradient(ellipse 50% 35% at 30% 90%,rgba(255,201,71,0.06) 0%,transparent 52%),
    radial-gradient(ellipse 35% 30% at 50% 50%,rgba(255,45,107,0.05) 0%,transparent 60%);
  animation:auroraAnim 18s ease-in-out infinite alternate;
}
@keyframes auroraAnim{
  0%{opacity:.7;transform:scale(1) rotate(0deg)}
  50%{opacity:1;transform:scale(1.06) rotate(0.5deg)}
  100%{opacity:.85;transform:scale(1.1) rotate(-0.3deg)}
}

.page{
  position:relative;z-index:1;
  min-height:100vh;
  display:grid;
  grid-template-columns:1fr 1fr;
  grid-template-rows:auto 1fr auto;
  grid-template-areas:"nav nav" "left right" "strip strip";
}

nav{
  grid-area:nav;
  display:flex;align-items:center;justify-content:space-between;
  padding:20px 48px;
  border-bottom:1px solid var(--glass-b);
  background:rgba(5,5,15,0.6);
  backdrop-filter:blur(20px);
  position:sticky;top:0;z-index:100;
}
.nav-logo{display:flex;align-items:center;gap:12px;cursor:pointer;}
.nav-logo-icon{
  width:40px;
  height:40px;
  object-fit:contain;
  border-radius:10px;
}
@keyframes iconPulse{
  from{box-shadow:0 0 18px rgba(255,45,107,0.4),0 0 36px rgba(255,45,107,0.12)}
  to  {box-shadow:0 0 36px rgba(255,45,107,0.7),0 0 70px rgba(255,45,107,0.25)}
}
.nav-logo-name{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;}
.nav-logo-name span{
  background:linear-gradient(135deg,var(--hot),var(--hot2),var(--hot3));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.nav-stats{display:flex;align-items:center;gap:24px;}
.nav-stat{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);}
.dot-live{width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0;animation:livePulse 2s infinite;}
@keyframes livePulse{
  0%{box-shadow:0 0 0 0 rgba(34,197,94,0.6)}
  70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}
  100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}
}
.dot-live.orange{background:#f97316;animation:livePulseO 2s infinite}
@keyframes livePulseO{
  0%{box-shadow:0 0 0 0 rgba(249,115,22,0.6)}
  70%{box-shadow:0 0 0 8px rgba(249,115,22,0)}
  100%{box-shadow:0 0 0 0 rgba(249,115,22,0)}
}
.nav-stat strong{color:white;font-weight:700;font-size:14px}

.hero{
  grid-area:left;
  display:flex;flex-direction:column;justify-content:center;
  padding:56px 48px;
  border-right:1px solid var(--glass-b);
  position:relative;overflow:hidden;
}
.hero-badge{
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(255,45,107,0.08);border:1px solid rgba(255,45,107,0.2);
  border-radius:100px;padding:6px 14px;width:fit-content;margin-bottom:28px;
  font-size:12px;color:rgba(255,100,150,0.9);font-weight:500;letter-spacing:0.5px;
  animation:fadeSlideUp 0.6s 0.1s both;
}
.hero-title{
  font-family:'Syne',sans-serif;
  font-size:clamp(42px,5.5vw,68px);
  font-weight:800;line-height:1.0;
  letter-spacing:-2px;
  margin-bottom:22px;
  animation:fadeSlideUp 0.7s 0.2s both;
}
.hero-title .line1{display:block;color:white}
.hero-title .line2{
  display:block;
  background:linear-gradient(135deg,var(--hot) 0%,var(--hot2) 50%,var(--hot3) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.hero-sub{
  font-size:16px;color:var(--muted);line-height:1.7;max-width:400px;
  margin-bottom:40px;font-weight:300;
  animation:fadeSlideUp 0.7s 0.3s both;
}

.card-stack{position:relative;width:320px;height:200px;margin-bottom:44px;animation:fadeSlideUp 0.8s 0.4s both;}
.profile-card{
  position:absolute;border-radius:22px;overflow:hidden;
  border:1px solid rgba(255,255,255,0.1);
  box-shadow:0 20px 60px rgba(0,0,0,0.6);
  cursor:pointer;transition:transform 0.3s ease;
}
.profile-card:hover{transform:scale(1.03)!important}
.pc1{width:130px;height:185px;top:0;left:0;z-index:3;transform:rotate(-3deg)}
.pc2{width:130px;height:185px;top:10px;left:105px;z-index:2;transform:rotate(1.5deg)}
.pc3{width:115px;height:165px;top:20px;left:200px;z-index:1;transform:rotate(5deg)}
.profile-card img{width:100%;height:100%;object-fit:cover;display:block}
.pc-overlay{
  position:absolute;inset:0;
  background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 55%);
  display:flex;flex-direction:column;justify-content:flex-end;padding:10px;
}
.pc-name{font-size:13px;font-weight:700;color:white;line-height:1.2}
.pc-age{font-size:11px;color:rgba(255,255,255,0.55)}
.pc-live-badge{
  position:absolute;top:8px;left:8px;
  background:rgba(255,45,107,0.9);border-radius:100px;
  padding:2px 8px;font-size:10px;font-weight:700;color:white;letter-spacing:0.5px;
  display:flex;align-items:center;gap:4px;
}
.pc-live-dot{width:5px;height:5px;border-radius:50%;background:white;animation:livePulse 1.5s infinite}

.feat-pills{display:flex;gap:10px;flex-wrap:wrap;animation:fadeSlideUp 0.8s 0.5s both;}
.fp{
  display:flex;align-items:center;gap:7px;
  background:var(--glass);border:1px solid var(--glass-b);
  border-radius:100px;padding:8px 14px;
  font-size:12px;color:rgba(255,255,255,0.5);
  transition:all 0.2s;cursor:default;
}
.fp:hover{background:rgba(255,45,107,0.07);border-color:rgba(255,45,107,0.2);color:rgba(255,180,200,0.8)}
.fp-icon{font-size:14px}

@keyframes fadeSlideUp{
  from{opacity:0;transform:translateY(24px)}
  to{opacity:1;transform:translateY(0)}
}

.auth-panel{
  grid-area:right;
  display:flex;flex-direction:column;justify-content:center;
  padding:56px 48px;
  background:rgba(5,5,18,0.3);
  animation:fadeSlideUp 0.9s 0.2s both;
}
.auth-heading{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;letter-spacing:-0.5px;color:white;margin-bottom:6px;}
.auth-sub{font-size:14px;color:var(--muted);margin-bottom:28px;line-height:1.6}

.tabs{
  display:flex;gap:4px;
  background:rgba(255,255,255,0.03);border:1px solid var(--glass-b);
  border-radius:16px;padding:4px;margin-bottom:28px;
}
.tab{
  flex:1;padding:11px;border:none;border-radius:13px;
  font-family:'Syne',sans-serif;font-size:13px;font-weight:700;
  letter-spacing:0.3px;cursor:pointer;
  transition:all 0.25s cubic-bezier(0.16,1,0.3,1);
  color:var(--muted);background:transparent;
}
.tab.active{background:linear-gradient(135deg,var(--hot),#c9193e);color:white;box-shadow:0 4px 18px rgba(255,45,107,0.4);}
.tab:not(.active):hover{color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.04)}

.field{display:flex;flex-direction:column;gap:7px;margin-bottom:16px}
.label{font-size:10px;font-weight:500;letter-spacing:1.6px;text-transform:uppercase;color:rgba(255,255,255,0.22)}
.input{
  width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--glass-b);
  border-radius:13px;padding:14px 16px;font-size:15px;color:white;
  font-family:'DM Sans',sans-serif;outline:none;
  transition:all 0.2s ease;
}
.input::placeholder{color:rgba(255,255,255,0.15)}
.input:focus{border-color:rgba(255,45,107,0.5);background:rgba(255,45,107,0.04);box-shadow:0 0 0 3px rgba(255,45,107,0.1);}
.fields-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.btn-primary{
  width:100%;padding:15px;
  background:linear-gradient(135deg,var(--hot) 0%,#c9193e 100%);
  border:none;border-radius:13px;color:white;
  font-family:'Syne',sans-serif;font-size:15px;font-weight:700;
  letter-spacing:0.3px;cursor:pointer;margin-top:6px;
  position:relative;overflow:hidden;
  transition:all 0.25s cubic-bezier(0.16,1,0.3,1);
  box-shadow:0 8px 28px rgba(255,45,107,0.4);
}
.btn-primary::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.15),transparent 50%);}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(255,45,107,0.55)}
.btn-primary:active{transform:translateY(0)}

.divider{display:flex;align-items:center;gap:12px;margin:18px 0}
.divider-line{flex:1;height:1px;background:rgba(255,255,255,0.05)}
.divider-text{font-size:11px;color:rgba(255,255,255,0.15);letter-spacing:1px}

.btn-ghost{
  width:100%;padding:14px;
  background:rgba(255,255,255,0.03);border:1px solid var(--glass-b);
  border-radius:13px;color:rgba(255,255,255,0.4);
  font-family:'DM Sans',sans-serif;font-size:14px;cursor:pointer;
  transition:all 0.2s ease;
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.btn-ghost:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.12)}

.social-proof{
  margin-top:20px;padding:14px 18px;
  background:var(--glass);border:1px solid var(--glass-b);
  border-radius:14px;display:flex;align-items:center;gap:14px;
}
.sp-avatars{display:flex}
.sp-av{width:30px;height:30px;border-radius:50%;border:2px solid var(--bg);overflow:hidden;margin-left:-8px;}
.sp-av:first-child{margin-left:0}
.sp-av img{width:100%;height:100%;object-fit:cover}
.sp-text{flex:1;font-size:12px;color:rgba(255,255,255,0.4);line-height:1.5}
.sp-text strong{color:rgba(255,255,255,0.75);font-weight:600}

.terms-text{margin-top:14px;font-size:10px;color:rgba(255,255,255,0.15);text-align:center;letter-spacing:0.3px;line-height:1.8;}

.reg-perks{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.reg-perk{
  display:flex;align-items:center;gap:12px;
  padding:12px 16px;
  background:var(--glass);border:1px solid var(--glass-b);
  border-radius:12px;font-size:13px;color:rgba(255,255,255,0.5);
}
.reg-perk-icon{font-size:18px;flex-shrink:0}

.strip{
  grid-area:strip;
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 48px;
  border-top:1px solid var(--glass-b);
  background:rgba(5,5,15,0.7);
  backdrop-filter:blur(20px);
}
.strip-left{display:flex;align-items:center;gap:24px}
.strip-stat{display:flex;flex-direction:column}
.strip-stat-num{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:white;line-height:1;}
.strip-stat-num span{
  background:linear-gradient(135deg,var(--hot),var(--hot2));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.strip-stat-label{font-size:10px;color:var(--muted);letter-spacing:0.5px;margin-top:2px}
.strip-divider{width:1px;height:32px;background:var(--glass-b)}
.strip-features{display:flex;align-items:center;gap:20px}
.sf{display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(255,255,255,0.3)}
.sf-dot{width:6px;height:6px;border-radius:50%;background:var(--hot);opacity:0.7}
.strip-right{font-size:11px;color:rgba(255,255,255,0.12);letter-spacing:0.3px}

.particle{position:fixed;border-radius:50%;pointer-events:none;z-index:1;filter:blur(0.5px);}
@keyframes particleFloat{
  0%{transform:translate(0,0) scale(0.5);opacity:0}
  8%{opacity:var(--op,0.4)}
  50%{transform:translate(var(--dx,0),calc(var(--dy,0) * -0.5)) scale(1.2);opacity:var(--op,0.4)}
  92%{opacity:0.05}
  100%{transform:translate(var(--dx,0),var(--dy,0)) scale(0.3);opacity:0}
}

.marquee-wrap{
  overflow:hidden;white-space:nowrap;
  border-bottom:1px solid var(--glass-b);
  background:rgba(5,5,15,0.5);padding:10px 0;position:relative;z-index:1;
}
.marquee-inner{display:inline-block;animation:marquee 30s linear infinite;}
.marquee-inner:hover{animation-play-state:paused}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.marquee-item{
  display:inline-flex;align-items:center;gap:6px;
  margin-right:40px;font-size:12px;color:rgba(255,255,255,0.2);letter-spacing:0.5px;
}
.marquee-item .m-dot{width:4px;height:4px;border-radius:50%;background:var(--hot);opacity:0.6;display:inline-block}

#particles{position:fixed;inset:0;pointer-events:none;z-index:1;}

@media(max-width:900px){
  .page{grid-template-columns:1fr;grid-template-areas:"nav""right""left""strip"}
  nav{padding:16px 24px}
  .nav-stats{gap:14px}
  .hero{padding:40px 24px;border-right:none;border-top:1px solid var(--glass-b)}
  .auth-panel{padding:40px 24px}
  .strip{padding:14px 24px;flex-direction:column;gap:12px;align-items:flex-start}
  .strip-features{flex-wrap:wrap;gap:12px}
}
@media(max-width:560px){
  .nav-stats{display:none}
  .hero-title{font-size:36px;letter-spacing:-1.5px}
  .card-stack{width:100%;height:160px}
  .pc1{width:110px;height:155px}
  .pc2{width:110px;height:155px}
  .pc3{width:95px;height:140px}
  .fields-row{grid-template-columns:1fr}
}
`;

/* ─── HOOKS ──────────────────────────────────────────────────── */
function useCountUp(target: number, suffix = "", triggerRef: React.RefObject<Element | null>) {
  const [value, setValue] = useState("0");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const start = performance.now();
          const duration = 2200;
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(ease * target).toLocaleString("es-AR") + suffix);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (triggerRef.current) observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [target, suffix, triggerRef]);
  return value;
}

function useFluctuate(base: number, range: number) {
  const [value, setValue] = useState(base);
  useEffect(() => {
    const interval = setInterval(() => {
      setValue(base + Math.floor((Math.random() - 0.5) * range * 2));
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [base, range]);
  return value.toLocaleString("es-AR");
}

/* ─── COMPONENTS ─────────────────────────────────────────────── */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%",
      transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(10px)",
      background: "linear-gradient(135deg,#ff2d6b,#c9193e)",
      color: "white", padding: "14px 24px", borderRadius: 100,
      fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700,
      boxShadow: "0 8px 32px rgba(255,45,107,0.5)",
      zIndex: 9999, whiteSpace: "nowrap",
      opacity: visible ? 1 : 0,
      transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
    }}>
      {message}
    </div>
  );
}

function Particles() {
  useEffect(() => {
    const container = document.getElementById("particles");
    if (!container) return;
    for (let i = 0; i < 20; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const size = 2 + Math.random() * 5;
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const op = 0.3 + Math.random() * 0.5;
      const dur = 16 + Math.random() * 18;
      const delay = Math.random() * 15;
      const dx = (Math.random() - 0.5) * 200;
      const startX = Math.random() * 100;
      p.style.cssText = `
        width:${size}px;height:${size}px;background:${color};
        box-shadow:0 0 ${size * 3}px ${color};
        left:${startX}%;bottom:-2%;
        --op:${op};--dx:${dx}px;--dy:-110vh;
        animation:particleFloat ${dur}s ${delay}s linear infinite;
      `;
      container.appendChild(p);
    }
    return () => { if (container) container.innerHTML = ""; };
  }, []);
  return <div id="particles" />;
}

function ProfileCard({ profile, className }: { profile: Profile; className: string }) {
  return (
    <div className={`profile-card ${className}`}>
      {profile.live && (
        <div className="pc-live-badge">
          <div className="pc-live-dot" />
          LIVE
        </div>
      )}
      <img
        src={profile.img}
        alt={profile.name}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><rect width='200' height='300' fill='%231a1a2e'/><text x='50%' y='50%' text-anchor='middle' fill='%23ff2d6b' font-size='40'>👤</text></svg>";
        }}
      />
      <div className="pc-overlay">
        <div className="pc-name">{profile.name}, {profile.age}</div>
        <div className="pc-age">{profile.city}</div>
      </div>
    </div>
  );
}

function LoginForm({ onToast }: { onToast: (msg: string) => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !pass) { onToast("Completá todos los campos ✌️"); return; }
    setLoading(true);
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      onToast("Email o contraseña incorrectos ❌");
      setLoading(false);
      return;
    }
    onToast("¡Bienvenido/a! Redirigiendo... 🚀");
    setTimeout(() => router.push("/discover"), 1200);
  };

  const goToRegister = () => {
  router.push("/auth/register");
  };
  
  return (
    
    <div>
      <div className="field">
        <label className="label">Email</label>
        <input className="input" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">Contraseña</label>
        <input className="input" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()} />
      </div>
      <button className="btn-primary" onClick={handleLogin} disabled={loading}
        style={{ opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? "Ingresando..." : "Iniciar sesión →"}
      </button>
      <div className="divider">
        <div style={{ marginTop: 16, textAlign: "center" }}>
  <span style={{ color: "var(--muted)", fontSize: 13 }}>
    ¿No tenés cuenta?{" "}
  </span>
  <button
    onClick={goToRegister}
    style={{
      background: "none",
      border: "none",
      color: "#ff2d6b",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 13,
    }}
  >
    Registrate
  </button>
</div>
        <div className="divider-line" /><span className="divider-text">o</span><div className="divider-line" />
      </div>
      <button className="btn-ghost" onClick={() => onToast("Entrando como invitado... ⚡")}>
        <div className="dot-live" />
        Entrar como invitado (sin cuenta)
      </button>
    </div>
  );
}

function RegisterForm({ goToRegister }: { goToRegister: () => void }) {
  return (
    <div>
      <div className="fields-row">
        <div className="field">
          <label className="label">Nombre</label>
          <input className="input" type="text" placeholder="Tu nombre" />
        </div>
        <div className="field">
          <label className="label">Edad</label>
          <input
  className="input"
  type="number"
  placeholder="25"
  min={18}
  max={99}
  onChange={(e) => {
    const value = Number(e.target.value);
    if (value < 18) e.target.value = "18";
  }}
/>
        </div>
      </div>

      <div className="field">
        <label className="label">Email</label>
        <input className="input" type="email" placeholder="tu@email.com" />
      </div>

      <div className="field">
        <label className="label">Contraseña</label>
        <input className="input" type="password" placeholder="Mínimo 6 caracteres" />
      </div>

      

      <button
  className="btn-primary"
  style={{ marginTop: 10 }}
  onClick={goToRegister}
>
        Crear cuenta gratis →
      </button>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function Turrinder() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [toast, setToast] = useState<string | null>(null);
  const [spIdx, setSpIdx] = useState(0);
  const [spCount, setSpCount] = useState(2847);
  const [spVisible, setSpVisible] = useState(true);
  const stripRef = useRef<HTMLDivElement>(null);

  const onlineCount = useFluctuate(8342, 120);
  const videoCount = useFluctuate(1204, 60);
  const s1 = useCountUp(284700, "+", stripRef);
  const s2 = useCountUp(1820000, "+", stripRef);
  const s3 = useCountUp(430000, "+", stripRef);

  

  

  // Social proof ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setSpVisible(false);
      setTimeout(() => {
        setSpIdx(i => (i + 1) % recentNames.length);
        setSpCount(c => c + Math.floor(Math.random() * 3 + 1));
        setSpVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const marqueeText = [...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems]
    .map(t => `<span class="marquee-item"><span class="m-dot"></span>${t}</span>`)
    .join("");

  return (
    <>
      <style>{globalStyles}</style>
      <div className="aurora" />
      <Particles />

      <div className="page">
        {/* NAV */}
        <nav>
          <div className="nav-logo">
            <img src={img.src} className="nav-logo-icon" />
            <div className="nav-logo-name">Turr<span>inder</span></div>
          </div>
          <div className="nav-stats">
            <div className="nav-stat">
              <div className="dot-live" />
              <strong>{onlineCount}</strong>&nbsp;online ahora
            </div>
            <div className="nav-stat">
              <div className="dot-live orange" />
              <strong>{videoCount}</strong>&nbsp;en video
            </div>
            <div className="nav-stat" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>🌍</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}><strong style={{ color: "white" }}>47</strong> países</span>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-badge">
            <div className="dot-live" />
            En vivo · <span>238 matches en la última hora</span>
          </div>
          <h1 className="hero-title">
            <span className="line1">Swipe. Matcheá.</span>
            <span className="line2">Hablá en vivo.</span>
          </h1>
          <p className="hero-sub">
            Descubrí una nueva forma de conectar: perfiles reales, conversaciones en vivo y matches que pasan al instante.
          </p>

          <div className="card-stack">
            <ProfileCard profile={profiles[0]} className="pc1" />
            <ProfileCard profile={profiles[1]} className="pc2" />
            <ProfileCard profile={profiles[2]} className="pc3" />
          </div>
        </section>

        {/* AUTH PANEL */}
        <section className="auth-panel">
          <h2 className="auth-heading">Empezá ahora</h2>
          <p className="auth-sub">En 60 segundos ya estás conociendo gente.</p>

          

          {tab === "login"
            ? <LoginForm onToast={setToast} />
            : <RegisterForm goToRegister={goToRegister} />
          }

          <div className="social-proof">
            <div className="sp-avatars">
              {spAvatars.map((src, i) => (
                <div key={i} className="sp-av">
                  <img src={src} alt="" loading="lazy" />
                </div>
              ))}
            </div>
            <div className="sp-text">
              <strong>{spCount.toLocaleString("es-AR")}</strong> personas se registraron hoy.<br />
              <span style={{ opacity: spVisible ? 1 : 0, transition: "opacity 0.4s" }}>
                {recentNames[spIdx]}
              </span> se unió hace 3 minutos.
            </div>
          </div>

          <div className="terms-text">
            Al continuar aceptás los términos de uso y la política de privacidad.<br />
            Turrinder © 2025 · Para mayores de 18 años.
          </div>
        </section>

        

      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}