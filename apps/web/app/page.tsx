"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import img from "../Images/logo.png";

/* ─── TYPES ──────────────────────────────────────────────────── */
interface Profile {
  name: string;
  role: string;
  city: string;
  img: string;
  live: boolean;
  tag: string;
}



const recentNames = [
  "ValenStream de Córdoba","Lucía de Bs As","Martina de Rosario",
  "Agustín de Mendoza","Sofía de Montevideo","Diego de Santiago",
  "Camila de Lima","Nicolás de Bogotá",
];


const spAvatars = [
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/men/22.jpg",
  "https://randomuser.me/api/portraits/women/55.jpg",
  "https://randomuser.me/api/portraits/men/66.jpg",
];

const particleColors = ["#75bef8","#3b9eda","#54c7f8","#1a6fa8","#8fd4ff","#4ab5e8"];

/* ─── STYLES ─────────────────────────────────────────────────── */
const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Clash+Display:wght@500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --sky:#54c7f8;
  --sky2:#3b9eda;
  --sky3:#1a6fa8;
  --sky-deep:#0a3a5c;
  --sky-glow:rgba(84,199,248,0.38);
  --white-arg:#f5f8ff;
  --bg:#030a14;
  --bg2:#050f1e;
  --bg3:#081526;
  --glass:rgba(84,199,248,0.04);
  --glass-b:rgba(84,199,248,0.12);
  --glass-bh:rgba(84,199,248,0.25);
  --text:rgba(240,248,255,0.88);
  --muted:rgba(180,215,240,0.45);
  --subtle:rgba(84,199,248,0.07);
}
html,body{height:100%;background:var(--bg);color:var(--text);overflow-x:hidden}
body{font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}

body::before{
  content:'';position:fixed;inset:0;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  opacity:0.3;pointer-events:none;z-index:0;
}

.aurora{
  position:fixed;inset:0;z-index:0;
  background:
    radial-gradient(ellipse 75% 55% at 10% 15%,rgba(84,199,248,0.16) 0%,transparent 60%),
    radial-gradient(ellipse 55% 45% at 90% 80%,rgba(59,158,218,0.13) 0%,transparent 58%),
    radial-gradient(ellipse 40% 35% at 75% 10%,rgba(26,111,168,0.10) 0%,transparent 55%),
    radial-gradient(ellipse 50% 40% at 25% 92%,rgba(143,212,255,0.07) 0%,transparent 52%),
    radial-gradient(ellipse 35% 30% at 50% 50%,rgba(84,199,248,0.04) 0%,transparent 60%),
    radial-gradient(ellipse 60% 25% at 50% 30%,rgba(245,248,255,0.02) 0%,transparent 65%);
  animation:auroraAnim 20s ease-in-out infinite alternate;
}
@keyframes auroraAnim{
  0%{opacity:.7;transform:scale(1) rotate(0deg)}
  50%{opacity:1;transform:scale(1.05) rotate(0.4deg)}
  100%{opacity:.85;transform:scale(1.08) rotate(-0.25deg)}
}

.flag-stripe{
  position:fixed;
  top:0;left:0;right:0;
  height:3px;
  background:linear-gradient(90deg,
    var(--sky) 0%,var(--sky) 33%,
    rgba(245,248,255,0.9) 33%,rgba(245,248,255,0.9) 66%,
    var(--sky) 66%,var(--sky) 100%
  );
  z-index:200;
  opacity:0.7;
}

.page{
  position:relative;z-index:1;
  min-height:100vh;
  display:grid;
  grid-template-columns:1fr 1fr;
  grid-template-rows:auto 1fr auto;
  grid-template-areas:"nav nav" "left right" "strip strip";
}

/* ── NAV ── */
nav{
  grid-area:nav;
  display:flex;align-items:center;justify-content:space-between;
  padding:22px 52px;
  border-bottom:1px solid var(--glass-b);
  background:rgba(3,10,20,0.65);
  backdrop-filter:blur(22px);
  position:sticky;top:3px;z-index:100;
}
.nav-stats{display:flex;align-items:center;gap:26px;}
.nav-stat{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);}
.dot-live{
  width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0;
  animation:livePulse 2s infinite;
}
@keyframes livePulse{
  0%{box-shadow:0 0 0 0 rgba(34,197,94,0.6)}
  70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}
  100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}
}
.dot-sky{
  width:7px;height:7px;border-radius:50%;background:var(--sky);flex-shrink:0;
  animation:skyPulse 2.2s infinite;
}
@keyframes skyPulse{
  0%{box-shadow:0 0 0 0 rgba(84,199,248,0.6)}
  70%{box-shadow:0 0 0 8px rgba(84,199,248,0)}
  100%{box-shadow:0 0 0 0 rgba(84,199,248,0)}
}
.nav-stat strong{color:var(--white-arg);font-weight:700;font-size:14px}

/* ══════════════════════════════════════
   LOGO — versión premium
══════════════════════════════════════ */

/* contenedor del logo en el nav */
.logo-nav{
  display:flex;align-items:center;gap:14px;cursor:pointer;
  user-select:none;
  animation:fadeSlideUp 0.5s 0s both;
}

/* ícono con marco glassmorphism + glow */
.logo-icon-wrap{
  position:relative;
  width:44px;height:44px;flex-shrink:0;
}
.logo-icon-bg{
  position:absolute;inset:0;
  border-radius:13px;
  background:linear-gradient(145deg,rgba(84,199,248,0.18),rgba(59,158,218,0.08));
  border:1px solid rgba(84,199,248,0.28);
  backdrop-filter:blur(8px);
  box-shadow:
    0 0 0 1px rgba(84,199,248,0.06),
    0 4px 16px rgba(84,199,248,0.15),
    inset 0 1px 0 rgba(255,255,255,0.1);
  animation:iconHalo 3.5s ease-in-out infinite alternate;
}
@keyframes iconHalo{
  from{box-shadow:0 0 0 1px rgba(84,199,248,0.06),0 4px 16px rgba(84,199,248,0.15),inset 0 1px 0 rgba(255,255,255,0.1)}
  to  {box-shadow:0 0 0 1px rgba(84,199,248,0.14),0 6px 28px rgba(84,199,248,0.32),inset 0 1px 0 rgba(255,255,255,0.15)}
}
.logo-icon-img{
  position:absolute;inset:0;
  width:100%;height:100%;
  object-fit:contain;
  padding:6px;
  filter:drop-shadow(0 0 6px rgba(84,199,248,0.55)) brightness(1.08);
}

/* texto del logo */
.logo-text-group{
  display:flex;flex-direction:column;gap:1px;
  line-height:1;
}
.logo-wordmark{
  font-family:'Syne',sans-serif;
  font-size:20px;
  font-weight:800;
  letter-spacing:-0.8px;
  color:var(--white-arg);
  line-height:1;
}
.logo-wordmark em{
  font-style:normal;
  background:linear-gradient(120deg,var(--sky) 0%,#a8e6ff 55%,var(--sky2) 100%);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
}
.logo-tagline{
  font-size:9px;
  font-weight:500;
  letter-spacing:2.8px;
  text-transform:uppercase;
  color:rgba(84,199,248,0.4);
  line-height:1;
  padding-left:1px;
}

/* divider vertical entre wordmark y badge */
.logo-divider{
  width:1px;height:28px;
  background:linear-gradient(to bottom,transparent,rgba(84,199,248,0.25),transparent);
  flex-shrink:0;
}

/* badge "BETA" */
.logo-badge{
  display:flex;align-items:center;gap:5px;
  background:rgba(84,199,248,0.08);
  border:1px solid rgba(84,199,248,0.2);
  border-radius:100px;
  padding:3px 10px;
  font-size:9px;
  font-weight:700;
  letter-spacing:1.5px;
  color:rgba(143,212,255,0.8);
  text-transform:uppercase;
}
.logo-badge-dot{
  width:5px;height:5px;border-radius:50%;
  background:var(--sky);
  animation:skyPulse 2s infinite;
}

/* ── HERO VERSION DEL LOGO (más grande) ── */
.logo-hero{
  display:flex;align-items:center;gap:18px;
  margin-bottom:34px;
  cursor:default;
  animation:fadeSlideUp 0.6s 0.05s both;
}
.logo-hero .logo-icon-wrap{width:62px;height:62px;}
.logo-hero .logo-icon-bg{border-radius:18px;}
.logo-hero .logo-wordmark{font-size:32px;letter-spacing:-1.5px;}
.logo-hero .logo-tagline{font-size:9.5px;letter-spacing:3.2px;margin-top:4px;}
.logo-hero .logo-badge{padding:4px 12px;font-size:9.5px;}
.logo-hero .logo-divider{height:38px;}

/* ── HERO ── */
.hero{
  align-items:flex-start;
  grid-area:left;
  display:flex;flex-direction:column;justify-content:center;
  padding:60px 52px;
  border-right:1px solid var(--glass-b);
  position:relative;overflow:hidden;
}

.hero-badge{
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(84,199,248,0.08);border:1px solid rgba(84,199,248,0.22);
  border-radius:100px;padding:6px 16px;width:fit-content;margin-bottom:30px;
  font-size:12px;color:rgba(143,212,255,0.95);font-weight:500;letter-spacing:0.6px;
  animation:fadeSlideUp 0.6s 0.15s both;
}

.hero-title{
  font-family:'Syne',sans-serif;
  font-size:clamp(40px,5.2vw,64px);
  font-weight:800;line-height:1.0;
  letter-spacing:-2px;
  margin-bottom:22px;
  animation:fadeSlideUp 0.7s 0.2s both;
}
.hero-title .line1{display:block;color:var(--white-arg)}
.hero-title .line2{
  display:block;
  background:linear-gradient(135deg,var(--sky) 0%,#8fd4ff 50%,var(--sky2) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}

.hero-sub{
  font-size:15.5px;color:var(--muted);line-height:1.75;max-width:420px;
  margin-bottom:36px;font-weight:300;
  animation:fadeSlideUp 0.7s 0.3s both;
}

.use-cases{
  display:grid;grid-template-columns:repeat(4,1fr);gap:30px;
  margin-bottom:10px;
  animation:fadeSlideUp 0.8s 0.35s both;
  
}
.uc-card{
  display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;
  padding:14px 10px;
  background:var(--glass);border:1px solid var(--glass-b);
  border-radius:16px;cursor:default;
  transition:all 0.25s ease;
}
.uc-card:hover{
  background:rgba(84,199,248,0.09);
  border-color:rgba(84,199,248,0.3);
  transform:translateY(-3px);
  box-shadow:0 8px 28px rgba(84,199,248,0.12);
}
.uc-icon{font-size:22px;line-height:1}
.uc-title{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:var(--white-arg);letter-spacing:0.3px}
.uc-desc{font-size:10px;color:var(--muted);line-height:1.4}

@keyframes fadeSlideUp{
  from{opacity:0;transform:translateY(26px)}
  to{opacity:1;transform:translateY(0)}
}

/* ── AUTH PANEL ── */
.auth-panel{
  grid-area:right;
  display:flex;flex-direction:column;justify-content:center;
  padding:60px 52px;
  background:rgba(3,10,22,0.35);
  animation:fadeSlideUp 0.9s 0.2s both;
}
.auth-heading{
  font-family:'Syne',sans-serif;font-size:28px;font-weight:800;
  letter-spacing:-0.5px;color:var(--white-arg);margin-bottom:6px;
}
.auth-sub{font-size:14px;color:var(--muted);margin-bottom:28px;line-height:1.6}

.field{display:flex;flex-direction:column;gap:7px;margin-bottom:15px}
.label{font-size:10px;font-weight:500;letter-spacing:1.8px;text-transform:uppercase;color:rgba(143,212,255,0.28)}
.input{
  width:100%;background:rgba(84,199,248,0.04);border:1px solid var(--glass-b);
  border-radius:13px;padding:14px 16px;font-size:15px;color:var(--white-arg);
  font-family:'DM Sans',sans-serif;outline:none;
  transition:all 0.2s ease;
}
.input::placeholder{color:rgba(143,212,255,0.2)}
.input:focus{
  border-color:rgba(84,199,248,0.5);
  background:rgba(84,199,248,0.06);
  box-shadow:0 0 0 3px rgba(84,199,248,0.1);
}
.fields-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.btn-primary{
  width:100%;padding:15px;
  background:linear-gradient(135deg,var(--sky) 0%,var(--sky2) 50%,var(--sky3) 100%);
  border:none;border-radius:13px;color:#02080f;
  font-family:'Syne',sans-serif;font-size:15px;font-weight:800;
  letter-spacing:0.3px;cursor:pointer;margin-top:6px;
  position:relative;overflow:hidden;
  transition:all 0.25s cubic-bezier(0.16,1,0.3,1);
  box-shadow:0 8px 32px rgba(84,199,248,0.4);
}
.btn-primary::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.22),transparent 55%);
}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 44px rgba(84,199,248,0.55)}
.btn-primary:active{transform:translateY(0)}

.divider{display:flex;align-items:center;gap:12px;margin:18px 0}
.divider-line{flex:1;height:1px;background:rgba(84,199,248,0.07)}
.divider-text{font-size:11px;color:rgba(143,212,255,0.18);letter-spacing:1px}

.btn-ghost{
  width:100%;padding:14px;
  background:rgba(84,199,248,0.04);border:1px solid var(--glass-b);
  border-radius:13px;color:rgba(143,212,255,0.45);
  font-family:'DM Sans',sans-serif;font-size:14px;cursor:pointer;
  transition:all 0.2s ease;
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.btn-ghost:hover{
  background:rgba(84,199,248,0.09);
  color:rgba(143,212,255,0.8);
  border-color:rgba(84,199,248,0.25);
}

.social-proof{
  margin-top:18px;padding:14px 18px;
  background:var(--glass);border:1px solid var(--glass-b);
  border-radius:14px;display:flex;align-items:center;gap:14px;
}
.sp-avatars{display:flex}
.sp-av{width:30px;height:30px;border-radius:50%;border:2px solid var(--bg);overflow:hidden;margin-left:-8px;}
.sp-av:first-child{margin-left:0}
.sp-av img{width:100%;height:100%;object-fit:cover}
.sp-text{flex:1;font-size:12px;color:rgba(143,212,255,0.45);line-height:1.5}
.sp-text strong{color:rgba(200,235,255,0.75);font-weight:600}

.terms-text{margin-top:14px;font-size:10px;color:rgba(143,212,255,0.18);text-align:center;letter-spacing:0.3px;line-height:1.8;}

/* ── STRIP ── */
.strip{
  grid-area:strip;
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 52px;
  border-top:1px solid var(--glass-b);
  background:rgba(3,10,20,0.75);
  backdrop-filter:blur(22px);
}
.strip-left{display:flex;align-items:center;gap:24px}
.strip-stat{display:flex;flex-direction:column}
.strip-stat-num{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--white-arg);line-height:1;}
.strip-stat-num span{
  background:linear-gradient(135deg,var(--sky),var(--sky2));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.strip-stat-label{font-size:10px;color:var(--muted);letter-spacing:0.5px;margin-top:2px}
.strip-divider{width:1px;height:32px;background:var(--glass-b)}
.strip-features{display:flex;align-items:center;gap:20px}
.sf{display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(143,212,255,0.32)}
.sf-dot{width:6px;height:6px;border-radius:50%;background:var(--sky);opacity:0.65}
.strip-right{font-size:11px;color:rgba(143,212,255,0.14);letter-spacing:0.3px}

/* ── PARTICLES ── */
.particle{position:fixed;border-radius:50%;pointer-events:none;z-index:1;filter:blur(0.8px);}
@keyframes particleFloat{
  0%{transform:translate(0,0) scale(0.5);opacity:0}
  8%{opacity:var(--op,0.35)}
  50%{transform:translate(var(--dx,0),calc(var(--dy,0) * -0.5)) scale(1.2);opacity:var(--op,0.35)}
  92%{opacity:0.04}
  100%{transform:translate(var(--dx,0),var(--dy,0)) scale(0.3);opacity:0}
}
#particles{position:fixed;inset:0;pointer-events:none;z-index:1;}

/* ── MARQUEE ── */
.marquee-wrap{
  overflow:hidden;white-space:nowrap;
  border-bottom:1px solid var(--glass-b);
  background:rgba(3,10,20,0.55);padding:10px 0;position:relative;z-index:1;
}
.marquee-inner{display:inline-block;animation:marquee 32s linear infinite;}
.marquee-inner:hover{animation-play-state:paused}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.marquee-item{
  display:inline-flex;align-items:center;gap:6px;
  margin-right:44px;font-size:12px;color:rgba(143,212,255,0.28);letter-spacing:0.5px;
}
.marquee-item .m-dot{width:4px;height:4px;border-radius:50%;background:var(--sky);opacity:0.55;display:inline-block;}

@media(max-width:900px){
  .page{grid-template-columns:1fr;grid-template-areas:"nav""right""left""strip"}
  nav{padding:16px 24px}
  .nav-stats{gap:14px}
  .hero{padding:40px 24px;border-right:none;border-top:1px solid var(--glass-b)}
  .auth-panel{padding:40px 24px}
  .strip{padding:14px 24px;flex-direction:column;gap:12px;align-items:flex-start}
  .strip-features{flex-wrap:wrap;gap:12px}
  .use-cases{grid-template-columns:repeat(2,1fr)}
  .logo-hero .logo-wordmark{font-size:26px;}
}
@media(max-width:560px){
  .nav-stats{display:none}
  .hero-title{font-size:36px;letter-spacing:-1.5px}
  .fields-row{grid-template-columns:1fr}
  .use-cases{grid-template-columns:repeat(2,1fr)}
  .logo-hero{gap:13px;}
  .logo-hero .logo-icon-wrap{width:50px;height:50px;}
  .logo-hero .logo-wordmark{font-size:22px;}
  .logo-badge{display:none}
  .logo-divider{display:none}
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

/* ─── LOGO COMPONENT ─────────────────────────────────────────── */
function Logo({ variant = "nav" }: { variant?: "nav" | "hero" }) {
  const isHero = variant === "hero";
  return (
    <div className={isHero ? "logo-hero" : "logo-nav"}>
      {/* ícono con halo */}
      <div className="logo-icon-wrap">
        <div className="logo-icon-bg" />
        <img src={img.src} alt="Turrinder" className="logo-icon-img" />
      </div>

      {/* wordmark + tagline */}
      <div className="logo-text-group">
        <span className="logo-wordmark">
          Turr<em>inder</em>
        </span>
        <span className="logo-tagline">Conectá · Creá · Debatí</span>
      </div>

      


    </div>
  );
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
      background: "linear-gradient(135deg,#54c7f8,#3b9eda)",
      color: "#020d18", padding: "14px 28px", borderRadius: 100,
      fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800,
      boxShadow: "0 8px 36px rgba(84,199,248,0.5)",
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
    for (let i = 0; i < 22; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const size = 2 + Math.random() * 5;
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const op = 0.25 + Math.random() * 0.4;
      const dur = 18 + Math.random() * 20;
      const delay = Math.random() * 16;
      const dx = (Math.random() - 0.5) * 220;
      const startX = Math.random() * 100;
      p.style.cssText = `
        width:${size}px;height:${size}px;background:${color};
        box-shadow:0 0 ${size * 3.5}px ${color};
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
          <span style={{ color: "var(--muted)", fontSize: 13 }}>¿No tenés cuenta?{" "}</span>
          <button onClick={goToRegister} style={{ background:"none", border:"none", color:"#54c7f8", cursor:"pointer", fontWeight:700, fontSize:13 }}>
            Registrate
          </button>
        </div>
        <div className="divider-line" /><span className="divider-text">o</span><div className="divider-line" />
      </div>
      <button className="btn-ghost" onClick={() => onToast("Entrando como invitado... ⚡")}>
        <div className="dot-sky" />
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
          <input className="input" type="number" placeholder="25" min={18} max={99}
            onChange={(e) => { const v = Number(e.target.value); if (v < 18) e.target.value = "18"; }} />
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
      <button className="btn-primary" style={{ marginTop: 10 }} onClick={goToRegister}>
        Crear cuenta gratis →
      </button>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function Turrinder() {
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


  

  return (
    <>
      <style>{globalStyles}</style>
      <div className="flag-stripe" />
      <div className="aurora" />
      <Particles />

      

      <div className="page">
        {/* NAV — logo compacto */}
        

        {/* HERO — logo grande */}
        <section className="hero">
          <Logo variant="hero" />

          <h1 className="hero-title">
            <span className="line1">Tu espacio para</span>
            <span className="line2">conectar, crear y debatir.</span>
          </h1>

          <p className="hero-sub">
            Para streamers que quieren audiencia, debatistas que buscan ideas contrarias,
            comunidades que necesitan un lugar y personas que quieren conocer a otras personas reales.
            Turrinder es para todos.
          </p>

        <div className="use-cases">
  <div className="uc-card">
    <div className="uc-icon">🎙️</div>
    <div className="uc-title">Streamers</div>
    <div className="uc-desc">Hablá en vivo con tu audiencia</div>
  </div>

  <div className="uc-card">
    <div className="uc-icon">💬</div>
    <div className="uc-title">Debates</div>
    <div className="uc-desc">Discutí ideas con extraños</div>
  </div>

  <div className="uc-card">
    <div className="uc-icon">🤝</div>
    <div className="uc-title">Comunidad</div>
    <div className="uc-desc">Grupos y salas temáticas</div>
  </div>

  <div className="uc-card">
    <div className="uc-icon">❤️</div>
    <div className="uc-title">Conectar</div>
    <div className="uc-desc">Conocé gente nueva del mundo</div>
  </div>
</div>
          
        </section>

        {/* AUTH PANEL */}
        <section className="auth-panel">
          <h2 className="auth-heading">Empezá ahora</h2>
          <p className="auth-sub">En 60 segundos ya estás adentro — sin importar para qué venís.</p>

          <LoginForm onToast={setToast} />

          <div className="social-proof">
            <div className="sp-avatars">
              {spAvatars.map((src, i) => (
                <div key={i} className="sp-av">
                  <img src={src} alt="" loading="lazy" />
                </div>
              ))}
            </div>
            <div className="sp-text">
              <strong>{spCount.toLocaleString("es-AR")}</strong> personas se unieron hoy.<br />
              <span style={{ opacity: spVisible ? 1 : 0, transition: "opacity 0.4s" }}>
                {recentNames[spIdx]}
              </span> se unió hace 3 minutos.
            </div>
          </div>

          <div className="terms-text">
            Al continuar aceptás los términos de uso y la política de privacidad.<br />
            Turrinder © 2025 · Para mayores de 18 años · Plataforma para todos.
          </div>
        </section>

        
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}