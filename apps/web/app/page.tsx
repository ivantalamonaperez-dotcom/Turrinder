"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/services/supabase.client";


import img from "../Images/logo.png";
import imgLigues      from "../Images/ligues.png";
import imgDebates     from "../Images/debates.png";
import imgIdiomas     from "../Images/idiomas.png";
import imgModalidades from "../Images/modalidades.png";
import BanModal from "../components/BanModal";

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
  grid-template-rows:1fr;
  grid-template-areas:"left right";
}

nav{ display:none; }
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

.logo-nav{
  display:flex;align-items:center;gap:14px;cursor:pointer;
  user-select:none;
  animation:fadeSlideUp 0.5s 0s both;
}
.logo-icon-wrap{position:relative;width:44px;height:44px;flex-shrink:0;}
.logo-icon-bg{
  position:absolute;inset:0;border-radius:13px;
  background:linear-gradient(145deg,rgba(84,199,248,0.18),rgba(59,158,218,0.08));
  border:1px solid rgba(84,199,248,0.28);backdrop-filter:blur(8px);
  box-shadow:0 0 0 1px rgba(84,199,248,0.06),0 4px 16px rgba(84,199,248,0.15),inset 0 1px 0 rgba(255,255,255,0.1);
  animation:iconHalo 3.5s ease-in-out infinite alternate;
}
@keyframes iconHalo{
  from{box-shadow:0 0 0 1px rgba(84,199,248,0.06),0 4px 16px rgba(84,199,248,0.15),inset 0 1px 0 rgba(255,255,255,0.1)}
  to  {box-shadow:0 0 0 1px rgba(84,199,248,0.14),0 6px 28px rgba(84,199,248,0.32),inset 0 1px 0 rgba(255,255,255,0.15)}
}
.logo-icon-img{
  position:absolute;inset:0;width:100%;height:100%;
  object-fit:contain;padding:6px;
  filter:drop-shadow(0 0 6px rgba(84,199,248,0.55)) brightness(1.08);
}
.logo-text-group{display:flex;flex-direction:column;gap:1px;line-height:1;}
.logo-wordmark{
  font-family:'Syne',sans-serif;font-size:20px;font-weight:800;
  letter-spacing:-0.8px;color:var(--white-arg);line-height:1;
}
.logo-wordmark em{
  font-style:normal;
  background:linear-gradient(120deg,var(--sky) 0%,#a8e6ff 55%,var(--sky2) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.logo-tagline{font-size:9px;font-weight:500;letter-spacing:2.8px;text-transform:uppercase;color:rgba(84,199,248,0.4);line-height:1;padding-left:1px;}
.logo-divider{width:1px;height:28px;background:linear-gradient(to bottom,transparent,rgba(84,199,248,0.25),transparent);flex-shrink:0;}
.logo-badge{
  display:flex;align-items:center;gap:5px;
  background:rgba(84,199,248,0.08);border:1px solid rgba(84,199,248,0.2);
  border-radius:100px;padding:3px 10px;font-size:9px;font-weight:700;
  letter-spacing:1.5px;color:rgba(143,212,255,0.8);text-transform:uppercase;
}
.logo-badge-dot{width:5px;height:5px;border-radius:50%;background:var(--sky);animation:skyPulse 2s infinite;}

.logo-hero{
  display:flex;flex-direction:row;align-items:center;gap:8px;
  margin-bottom:14px;margin-top:-40px;cursor:default;
  animation:fadeSlideUp 0.6s 0.05s both;
}
.logo-hero .logo-icon-wrap{width:120px;height:120px;flex-shrink:0;}
.logo-hero .logo-icon-bg{display:none;}
.logo-hero .logo-text-group{align-items:flex-start;}
.logo-hero .logo-wordmark{font-size:82px;letter-spacing:-4.5px;}
.logo-hero .logo-tagline{font-size:11px;letter-spacing:5px;margin-top:6px;}

.hero{
  grid-area:left;
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  padding:60px 52px;
  border-right:1px solid var(--glass-b);
  position:relative;overflow:hidden;
  text-align:center;
}
.hero-title{
  font-family:'Syne',sans-serif;
  font-size:clamp(14px,1.6vw,20px);
  font-weight:500;line-height:1.4;letter-spacing:0.2px;
  color:var(--muted);
  animation:fadeSlideUp 0.7s 0.2s both;
  max-width:320px;
}

.carousel-wrap{
  position:relative;width:100%;max-width:400px;
  margin:28px auto 0;
  display:flex;flex-direction:column;align-items:center;gap:16px;
  animation:fadeSlideUp 0.8s 0.35s both;
}
.carousel-stage{position:relative;width:270px;height:270px;display:flex;align-items:center;justify-content:center;}
.carousel-img{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  opacity:0;transform:translateY(18px) scale(0.92);
  transition:opacity 0.55s cubic-bezier(0.16,1,0.3,1),transform 0.55s cubic-bezier(0.16,1,0.3,1);
  pointer-events:none;
}
.carousel-img.active{opacity:1;transform:translateY(0) scale(1);animation:carouselFloat 4s ease-in-out infinite;}
.carousel-img img{width:240px;height:240px;object-fit:contain;filter:drop-shadow(0 12px 40px rgba(84,199,248,0.35)) brightness(1.05);}
@keyframes carouselFloat{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-14px) scale(1.03);}}
.carousel-glow{
  position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);
  width:140px;height:24px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(84,199,248,0.3) 0%,transparent 70%);
  filter:blur(10px);animation:glowBreath 4s ease-in-out infinite;
}
@keyframes glowBreath{0%,100%{opacity:0.4;width:110px}50%{opacity:0.8;width:150px}}
.carousel-label{display:flex;flex-direction:column;align-items:center;gap:5px;min-height:50px;}
.carousel-label-name{
  font-family:'Syne',sans-serif;font-size:24px;font-weight:900;letter-spacing:-1px;
  background:linear-gradient(135deg,var(--sky) 0%,#c8f2ff 50%,var(--sky2) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  opacity:0;transform:translateY(10px);
  transition:opacity 0.4s ease 0.15s,transform 0.4s ease 0.15s;
}
.carousel-label-name.visible{opacity:1;transform:translateY(0);}
.carousel-label-desc{font-size:12px;color:var(--muted);font-weight:300;opacity:0;transform:translateY(6px);transition:opacity 0.4s ease 0.25s,transform 0.4s ease 0.25s;}
.carousel-label-desc.visible{opacity:1;transform:translateY(0);}
.carousel-dots{display:flex;gap:7px;align-items:center;}
.carousel-dot{
  width:6px;height:6px;border-radius:50%;background:rgba(84,199,248,0.2);
  transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);cursor:pointer;
}
.carousel-dot.active{background:var(--sky);width:22px;border-radius:3px;box-shadow:0 0 8px rgba(84,199,248,0.6);}

@keyframes fadeSlideUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}

.auth-panel{
  grid-area:right;
  display:flex;flex-direction:column;justify-content:center;
  padding:60px 52px;
  background:rgba(3,10,22,0.35);
  animation:fadeSlideUp 0.9s 0.2s both;
}
.auth-heading{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;letter-spacing:-0.5px;color:var(--white-arg);margin-bottom:6px;}
.auth-sub{font-size:14px;color:var(--muted);margin-bottom:28px;line-height:1.6}

.field{display:flex;flex-direction:column;gap:7px;margin-bottom:15px}
.label{font-size:10px;font-weight:500;letter-spacing:1.8px;text-transform:uppercase;color:rgba(143,212,255,0.28)}
.input{
  width:100%;background:rgba(84,199,248,0.04);border:1px solid var(--glass-b);
  border-radius:13px;padding:14px 16px;font-size:15px;color:var(--white-arg);
  font-family:'DM Sans',sans-serif;outline:none;transition:all 0.2s ease;
}
.input::placeholder{color:rgba(143,212,255,0.2)}
.input:focus{border-color:rgba(84,199,248,0.5);background:rgba(84,199,248,0.06);box-shadow:0 0 0 3px rgba(84,199,248,0.1);}
.fields-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.btn-primary{
  width:100%;padding:15px;
  background:linear-gradient(135deg,var(--sky) 0%,var(--sky2) 50%,var(--sky3) 100%);
  border:none;border-radius:13px;color:#02080f;
  font-family:'Syne',sans-serif;font-size:15px;font-weight:800;letter-spacing:0.3px;
  cursor:pointer;margin-top:6px;position:relative;overflow:hidden;
  transition:all 0.25s cubic-bezier(0.16,1,0.3,1);
  box-shadow:0 8px 32px rgba(84,199,248,0.4);
}
.btn-primary::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.22),transparent 55%);}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 44px rgba(84,199,248,0.55)}
.btn-primary:active{transform:translateY(0)}

.divider{display:flex;align-items:center;gap:12px;margin:18px 0}
.divider-line{flex:1;height:1px;background:rgba(84,199,248,0.07)}
.divider-text{font-size:11px;color:rgba(143,212,255,0.18);letter-spacing:1px}

.forgot-link{
  display:block;text-align:right;margin-top:-8px;margin-bottom:4px;
  font-size:12px;color:rgba(84,199,248,0.5);
  background:none;border:none;cursor:pointer;
  font-family:'DM Sans',sans-serif;
  letter-spacing:0.2px;
  transition:color 0.2s ease;
  padding:0;
}
.forgot-link:hover{color:rgba(84,199,248,0.9);}

.btn-google{
  width:100%;padding:14px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.12);
  border-radius:13px;
  color:rgba(240,248,255,0.75);
  font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;
  cursor:pointer;transition:all 0.2s ease;
  display:flex;align-items:center;justify-content:center;gap:10px;
  margin-bottom:10px;
}
.btn-google:hover{background:rgba(255,255,255,0.09);border-color:rgba(255,255,255,0.25);color:rgba(240,248,255,0.95);}
.btn-google:disabled{opacity:0.5;cursor:not-allowed;}
.google-icon{width:18px;height:18px;flex-shrink:0;}

.terms-text{margin-top:28px;font-size:10px;color:rgba(143,212,255,0.18);text-align:center;letter-spacing:0.3px;line-height:1.8;}

.strip{ display:none; }
.strip-left{display:flex;align-items:center;gap:24px}
.strip-stat{display:flex;flex-direction:column}
.strip-stat-num{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--white-arg);line-height:1;}
.strip-stat-num span{background:linear-gradient(135deg,var(--sky),var(--sky2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.strip-stat-label{font-size:10px;color:var(--muted);letter-spacing:0.5px;margin-top:2px}
.strip-divider{width:1px;height:32px;background:var(--glass-b)}
.strip-features{display:flex;align-items:center;gap:20px}
.sf{display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(143,212,255,0.32)}
.sf-dot{width:6px;height:6px;border-radius:50%;background:var(--sky);opacity:0.65}
.strip-right{font-size:11px;color:rgba(143,212,255,0.14);letter-spacing:0.3px}

.particle{position:fixed;border-radius:50%;pointer-events:none;z-index:1;}
@keyframes particleFloat{
  0%  {transform:translate(0,0) scale(0.6);opacity:0}
  4%  {opacity:var(--op,0.5)}
  50% {transform:translate(var(--dx,0),calc(var(--dy,0)*0.5)) scale(1.3);opacity:var(--op,0.5)}
  90% {opacity:0.05}
  100%{transform:translate(var(--dx,0),var(--dy,0)) scale(0.2);opacity:0}
}
@keyframes particleFloatB{
  0%  {transform:translate(0,0) scale(0.4);opacity:0}
  5%  {opacity:var(--op,0.35)}
  48% {transform:translate(calc(var(--dx,0)*1.3),calc(var(--dy,0)*0.48)) scale(1.1);opacity:var(--op,0.35)}
  88% {opacity:0.03}
  100%{transform:translate(var(--dx,0),var(--dy,0)) scale(0.1);opacity:0}
}
#particles{position:fixed;inset:0;pointer-events:none;z-index:1;}

.logo-mobile-auth{
  display:none;
  flex-direction:column;align-items:center;gap:6px;
  margin-bottom:30px;
  animation:fadeSlideUp 0.5s 0s both;
}
.logo-mobile-auth .logo-icon-wrap{ width:96px;height:96px;margin-bottom:6px; }
.logo-mobile-auth .logo-icon-bg{ display:none; }
.logo-mobile-auth .logo-icon-img{
  padding:0;
  filter:drop-shadow(0 0 18px rgba(84,199,248,0.65)) brightness(1.1);
}
.logo-mobile-auth .logo-wordmark{
  font-family:'Syne',sans-serif;font-size:42px;font-weight:800;
  letter-spacing:-2px;color:var(--white-arg);line-height:1;
}
.logo-mobile-auth .logo-wordmark em{
  font-style:normal;
  background:linear-gradient(120deg,var(--sky) 0%,#a8e6ff 55%,var(--sky2) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.logo-mobile-auth .logo-tagline{
  font-size:8px;font-weight:500;letter-spacing:3px;
  text-transform:uppercase;color:rgba(84,199,248,0.35);
  line-height:1;padding-left:1px;
}

@media(max-width:900px){
  .page{ grid-template-columns:1fr; grid-template-areas:"right"; }
  .hero{ display:none; }
  .auth-panel{ padding:60px 28px 60px;min-height:100vh;justify-content:flex-start;padding-top:56px; }
  .logo-mobile-auth{ display:flex; }
}

@media(max-width:560px){
  .auth-panel{ padding:48px 20px 80px; }
  .logo-mobile-auth .logo-icon-wrap{width:80px;height:80px;}
  .logo-mobile-auth .logo-wordmark{font-size:36px;letter-spacing:-1.8px;}
  .logo-mobile-auth .logo-tagline{font-size:7px;letter-spacing:2.8px;}
  .auth-heading{font-size:24px;}
  .auth-sub{font-size:13px;margin-bottom:22px;}
  .fields-row{grid-template-columns:1fr}
  .input{padding:13px 15px;font-size:15px;border-radius:12px;}
  .btn-primary{padding:15px;font-size:15px;border-radius:12px;}
  .btn-google{padding:13px;font-size:14px;border-radius:12px;}
  .toast-wrap{ bottom:100px !important; }
  .strip{display:none}
}

@supports(padding-bottom:env(safe-area-inset-bottom)){
  @media(max-width:560px){
    .auth-panel{ padding-bottom:calc(80px + env(safe-area-inset-bottom)); }
  }
}

@media(hover:none){
  .btn-primary:hover{ transform:none; box-shadow:0 8px 32px rgba(84,199,248,0.4); }
  .btn-google:hover{ background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.12); }
  button{ -webkit-tap-highlight-color:transparent; }
  .btn-primary:active{ transform:scale(0.98); opacity:0.9; }
  .btn-google:active{ transform:scale(0.98); opacity:0.9; }
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

/* ─── HERO CAROUSEL ──────────────────────────────────────────── */
const carouselSlides = [
  { img: imgLigues,      name: "Ligues",      desc: "Conocé gente nueva en tiempo real" },
  { img: imgDebates,     name: "Debates",     desc: "Discutí ideas con cualquier persona" },
  { img: imgModalidades, name: "Modalidades", desc: "Elegí cómo querés conectar" },
  { img: imgIdiomas,     name: "Idiomas",     desc: "Practicá con hablantes nativos" },
];

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [labelVisible, setLabelVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setLabelVisible(false);
      setTimeout(() => {
        setCurrent(c => (c + 1) % carouselSlides.length);
        setLabelVisible(true);
      }, 350);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const slide = carouselSlides[current];

  return (
    <div className="carousel-wrap">
      <div className="carousel-stage">
        {carouselSlides.map((s, i) => (
          <div key={i} className={`carousel-img ${i === current ? "active" : ""}`}>
            <img src={(s.img as any).src ?? s.img} alt={s.name} />
          </div>
        ))}
        <div className="carousel-glow" />
      </div>
      <div className="carousel-label">
        <div className={`carousel-label-name ${labelVisible ? "visible" : ""}`}>{slide.name}</div>
        <div className={`carousel-label-desc ${labelVisible ? "visible" : ""}`}>{slide.desc}</div>
      </div>
      <div className="carousel-dots">
        {carouselSlides.map((_, i) => (
          <div
            key={i}
            className={`carousel-dot ${i === current ? "active" : ""}`}
            onClick={() => { setLabelVisible(false); setTimeout(() => { setCurrent(i); setLabelVisible(true); }, 200); }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── LOGO ───────────────────────────────────────────────────── */
function Logo({ variant = "nav" }: { variant?: "nav" | "hero" | "mobile-auth" }) {
  const isHero = variant === "hero";
  const isMobileAuth = variant === "mobile-auth";
  return (
    <div className={isHero ? "logo-hero" : isMobileAuth ? "logo-mobile-auth" : "logo-nav"}>
      <div className="logo-icon-wrap">
        <div className="logo-icon-bg" />
        <img src={(img as any).src ?? img} alt="Turrinder" className="logo-icon-img" />
      </div>
      <div className="logo-text-group">
        <span className="logo-wordmark">Turr<em>inder</em></span>
        {isMobileAuth && <span className="logo-tagline">connect · debate · grow</span>}
      </div>
    </div>
  );
}

/* ─── GOOGLE ICON ────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

/* ─── TOAST ──────────────────────────────────────────────────── */
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
    <div className="toast-wrap" style={{
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

/* ─── PARTICLES ──────────────────────────────────────────────── */
function Particles() {
  useEffect(() => {
    const container = document.getElementById("particles");
    if (!container) return;
    const COUNT = 30;
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const size = 1.5 + Math.random() * 5;
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      const op = 0.3 + Math.random() * 0.45;
      const dur = 12 + Math.random() * 14;
      const delay = i < 30 ? Math.random() * 2 : 2 + Math.random() * 6;
      const dx = (Math.random() - 0.5) * 260;
      const startX = Math.random() * 100;
      const anim = i % 3 === 0 ? "particleFloatB" : "particleFloat";
      const blur = size > 4 ? `blur(${(size * 0.3).toFixed(1)}px)` : "none";
      p.style.cssText = `
        width:${size}px;height:${size}px;background:${color};
        box-shadow:0 0 ${size * 4}px ${color},0 0 ${size * 8}px ${color}40;
        left:${startX}%;bottom:-2%;
        filter:${blur};
        --op:${op};--dx:${dx}px;--dy:-112vh;
        animation:${anim} ${dur}s ${delay}s linear infinite;
      `;
      container.appendChild(p);
    }
    return () => { if (container) container.innerHTML = ""; };
  }, []);
  return <div id="particles" />;
}

/* ─── LOGIN FORM ─────────────────────────────────────────────── */
function LoginForm({ onToast }: { onToast: (msg: string) => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [banModal, setBanModal] = useState(false);
  const router = useRouter();

  const getSupabase = async () => {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  };

    const handleLogin = async () => {
    if (!email || !pass) { onToast("Completá todos los campos ✌️"); return; }
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
      onToast("Email o contraseña incorrectos ❌");
      setLoading(false);
      return;
    }

    const banRes = await fetch("/api/check-ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: data.user.id }),
    });
    const banData = await banRes.json();

    if (banData.banned) {
      await supabase.auth.signOut();
      setLoading(false);
      setBanModal(true);
      return;
    }

    await fetch("/api/log-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: data.user.id, method: "email" }),
    });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("id", data.user.id)
      .single();

    if (!profile || !profile.name) {
      onToast("Completá tu perfil para continuar 📝");
      setTimeout(() => router.push("/auth/register?from=google"), 1000);
    } else {
      onToast("¡Bienvenido/a! Redirigiendo... 🚀");
      setTimeout(() => router.push("/profile"), 1200);
    }
  };

 const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      onToast("Error al conectar con Google ❌");
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <button className="btn-google" onClick={handleGoogleLogin} disabled={googleLoading}>
        <GoogleIcon />
        {googleLoading ? "Conectando con Google..." : "Continuar con Google"}
      </button>

      <div className="divider">
        <div className="divider-line" />
        <span className="divider-text">o con email</span>
        <div className="divider-line" />
      </div>

      <div className="field">
        <label className="label">Email</label>
        <input
          className="input" type="email" placeholder="tu@email.com"
          value={email} onChange={e => setEmail(e.target.value)}
          autoComplete="email" inputMode="email"
        />
      </div>
      <div className="field">
        <label className="label">Contraseña</label>
        <input
          className="input" type="password" placeholder="••••••••"
          value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          autoComplete="current-password"
        />
      </div>

      <button className="forgot-link" onClick={() => router.push("/auth/forgot-password")} type="button">
        ¿Olvidaste tu contraseña?
      </button>

      <button className="btn-primary" onClick={handleLogin} disabled={loading}
        style={{ opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", marginTop: 14 }}>
        {loading ? "Ingresando..." : "Iniciar sesión →"}
      </button>

      <div style={{ marginTop: 20, textAlign: "center" }}>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>¿No tenés cuenta?{" "}</span>
        <button onClick={() => router.push("/auth/register")}
          style={{ background: "none", border: "none", color: "#54c7f8", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
          Registrate
        </button>
      </div>

      {banModal && <BanModal onClose={() => setBanModal(false)} />}
    </div>
  );
}

/* ─── BANNED DETECTOR ────────────────────────────────────────── */
function BannedDetector({ onBanned }: { onBanned: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("banned") === "true") {
      onBanned();
    }
  }, [searchParams, onBanned]);
  return null;
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function Turrinder() {
  const [toast, setToast] = useState<string | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const onlineCount = useFluctuate(8342, 120);
  const videoCount = useFluctuate(1204, 60);
  const s1 = useCountUp(284700, "+", stripRef);
  const s2 = useCountUp(1820000, "+", stripRef);
  const s3 = useCountUp(430000, "+", stripRef);

  return (
    <>
      <style>{globalStyles}</style>

      {/* Suspense requerido por useSearchParams */}
      <Suspense fallback={null}>
        <BannedDetector onBanned={() => setShowBanModal(true)} />
      </Suspense>

      <div className="flag-stripe" />
      <div className="aurora" />
      <Particles />

      <div className="page">
        <nav>
          <Logo variant="nav" />
          <div className="nav-stats">
            <div className="nav-stat"><div className="dot-live" /><strong>{onlineCount}</strong> en línea</div>
            <div className="nav-stat"><div className="dot-sky" /><strong>{videoCount}</strong> en videocall</div>
          </div>
        </nav>

        <section className="hero">
          <Logo variant="hero" />
          <h1 className="hero-title">El lugar donde streamers, debatistas y personas reales se encuentran.</h1>
          <HeroCarousel />
        </section>

        <section className="auth-panel">
          <Logo variant="mobile-auth" />
          <h2 className="auth-heading">Empezá ahora</h2>
          <p className="auth-sub">En 60 segundos ya estás adentro — sin importar para qué venís.</p>
          <LoginForm onToast={setToast} />
          <div className="terms-text">
            Al continuar aceptás los términos de uso y la política de privacidad.<br />
            Turrinder © 2025 · Para mayores de 18 años · Plataforma para todos.
          </div>
        </section>

        <div className="strip" ref={stripRef}>
          <div className="strip-left">
            <div className="strip-stat">
              <div className="strip-stat-num"><span>{s1}</span></div>
              <div className="strip-stat-label">usuarios registrados</div>
            </div>
            <div className="strip-divider" />
            <div className="strip-stat">
              <div className="strip-stat-num"><span>{s2}</span></div>
              <div className="strip-stat-label">mensajes enviados</div>
            </div>
            <div className="strip-divider" />
            <div className="strip-stat">
              <div className="strip-stat-num"><span>{s3}</span></div>
              <div className="strip-stat-label">videocalls realizadas</div>
            </div>
          </div>
          <div className="strip-features">
            <div className="sf"><div className="sf-dot" />Ligues</div>
            <div className="sf"><div className="sf-dot" />Debates</div>
            <div className="sf"><div className="sf-dot" />Idiomas</div>
            <div className="sf"><div className="sf-dot" />Modalidades</div>
          </div>
          <div className="strip-right">Turrinder © 2025</div>
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {showBanModal && <BanModal onClose={() => setShowBanModal(false)} />}
    </>
  );
}