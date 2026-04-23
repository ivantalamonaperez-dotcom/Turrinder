"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import img from "../Images/logo.png";
import imgLigues      from "../Images/ligues.png";
import imgDebates     from "../Images/debates.png";
import imgIdiomas     from "../Images/idiomas.png";
import imgModalidades from "../Images/modalidades.png";

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

/* ── HERO ── */
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

/* ── CAROUSEL ── */
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

/* ── AUTH PANEL ── */
.auth-panel{
  grid-area:right;
  display:flex;flex-direction:column;justify-content:center;
  padding:60px 56px;
  background:rgba(3,10,22,0.35);
  position:relative;overflow:hidden;
}
/* línea superior animada */
.auth-panel::before{
  content:'';position:absolute;top:0;left:10%;right:10%;height:1px;
  background:linear-gradient(90deg,transparent,rgba(84,199,248,0.25) 40%,rgba(84,199,248,0.25) 60%,transparent);
  animation:scanLine 4s ease-in-out infinite alternate;
}
@keyframes scanLine{from{opacity:0.4;left:10%;right:10%}to{opacity:1;left:20%;right:20%}}

/* entrada escalonada para los hijos */
.auth-panel > *{
  opacity:0;
  animation:authItemIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
}
.auth-panel > *:nth-child(1){animation-delay:0.15s}
.auth-panel > *:nth-child(2){animation-delay:0.25s}
.auth-panel > *:nth-child(3){animation-delay:0.35s}
@keyframes authItemIn{
  from{opacity:0;transform:translateY(18px)}
  to{opacity:1;transform:translateY(0)}
}

.auth-heading{
  font-family:'Syne',sans-serif;font-size:30px;font-weight:800;
  letter-spacing:-0.8px;color:var(--white-arg);margin-bottom:5px;line-height:1.1;
}
.auth-heading em{
  font-style:normal;
  background:linear-gradient(120deg,var(--sky) 0%,#c8f2ff 55%,var(--sky2) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.auth-sub{font-size:13.5px;color:var(--muted);margin-bottom:32px;line-height:1.65;font-weight:300;}

/* campos */
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:13px}
.label{font-size:9.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(143,212,255,0.28)}
.input-wrap{position:relative;}
.input{
  width:100%;background:rgba(84,199,248,0.035);
  border:1px solid rgba(84,199,248,0.1);
  border-radius:12px;padding:13px 16px;font-size:14.5px;color:var(--white-arg);
  font-family:'DM Sans',sans-serif;outline:none;
  transition:border-color 0.25s ease,background 0.25s ease,box-shadow 0.25s ease;
}
.input::placeholder{color:rgba(143,212,255,0.18)}
.input:focus{
  border-color:rgba(84,199,248,0.45);
  background:rgba(84,199,248,0.055);
  box-shadow:0 0 0 3px rgba(84,199,248,0.08),0 1px 12px rgba(84,199,248,0.06);
}
/* shimmer al enfocar */
.input-wrap::after{
  content:'';position:absolute;inset:0;border-radius:12px;
  background:linear-gradient(105deg,transparent 40%,rgba(84,199,248,0.06) 50%,transparent 60%);
  background-size:200% 100%;
  opacity:0;pointer-events:none;
  transition:opacity 0.3s;
}
.input-wrap:focus-within::after{opacity:1;animation:inputShimmer 1.2s ease forwards;}
@keyframes inputShimmer{
  from{background-position:200% 0}to{background-position:-200% 0}
}
.fields-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}

/* forgot */
.forgot-row{display:flex;justify-content:flex-end;margin-top:-6px;margin-bottom:14px;}
.forgot-btn{
  background:none;border:none;padding:0;
  font-size:12px;color:rgba(84,199,248,0.38);
  cursor:pointer;transition:color 0.2s;font-family:'DM Sans',sans-serif;
  position:relative;
}
.forgot-btn::after{
  content:'';position:absolute;bottom:-1px;left:0;right:0;height:1px;
  background:rgba(84,199,248,0.35);transform:scaleX(0);transform-origin:left;
  transition:transform 0.25s cubic-bezier(0.16,1,0.3,1);
}
.forgot-btn:hover{color:rgba(84,199,248,0.75);}
.forgot-btn:hover::after{transform:scaleX(1);}

/* btn principal */
.btn-primary{
  width:100%;padding:14px;
  background:linear-gradient(135deg,var(--sky) 0%,var(--sky2) 55%,var(--sky3) 100%);
  border:none;border-radius:12px;color:#02080f;
  font-family:'Syne',sans-serif;font-size:14.5px;font-weight:800;letter-spacing:0.2px;
  cursor:pointer;position:relative;overflow:hidden;
  transition:transform 0.25s cubic-bezier(0.16,1,0.3,1),box-shadow 0.25s cubic-bezier(0.16,1,0.3,1);
  box-shadow:0 6px 24px rgba(84,199,248,0.35);
}
.btn-primary::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.2),transparent 55%);
}
/* efecto ripple/glow al hover */
.btn-primary::after{
  content:'';position:absolute;inset:-1px;border-radius:13px;
  background:linear-gradient(135deg,var(--sky),var(--sky2));
  opacity:0;filter:blur(12px);z-index:-1;
  transition:opacity 0.3s;
}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(84,199,248,0.5);}
.btn-primary:hover::after{opacity:0.6;}
.btn-primary:active{transform:translateY(0);}
.btn-primary:disabled{opacity:0.45;cursor:not-allowed;transform:none;box-shadow:none;}

/* spinner inline */
.btn-spinner{
  width:16px;height:16px;border-radius:50%;
  border:2px solid rgba(2,8,15,0.3);border-top-color:#02080f;
  animation:spin 0.7s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* divider */
.divider{display:flex;align-items:center;gap:12px;margin:20px 0}
.divider-line{flex:1;height:1px;background:rgba(84,199,248,0.07)}
.divider-text{font-size:10.5px;color:rgba(143,212,255,0.2);letter-spacing:1px;white-space:nowrap;}

/* google */
.btn-google{
  width:100%;padding:13px;
  background:rgba(255,255,255,0.035);
  border:1px solid rgba(255,255,255,0.1);
  border-radius:12px;
  color:rgba(240,248,255,0.65);
  font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;
  cursor:pointer;
  transition:background 0.2s,border-color 0.2s,color 0.2s,transform 0.2s;
  display:flex;align-items:center;justify-content:center;gap:10px;
  position:relative;overflow:hidden;
}
.btn-google::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.04) 50%,transparent 70%);
  transform:translateX(-100%);
  transition:transform 0.5s ease;
}
.btn-google:hover{
  background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.22);
  color:rgba(240,248,255,0.9);transform:translateY(-1px);
}
.btn-google:hover::before{transform:translateX(100%);}
.btn-google:disabled{opacity:0.45;cursor:not-allowed;transform:none;}
.google-icon{width:18px;height:18px;flex-shrink:0;}

/* fila de abajo — ¿no tenés cuenta? + invitado */
.auth-footer{
  display:flex;align-items:center;justify-content:space-between;
  margin-top:22px;padding-top:18px;
  border-top:1px solid rgba(84,199,248,0.07);
  gap:12px;
  flex-wrap:wrap;
}
.auth-footer-link{
  font-size:12.5px;color:var(--muted);
}
.auth-footer-link button{
  background:none;border:none;
  color:rgba(84,199,248,0.65);cursor:pointer;
  font-size:12.5px;font-weight:600;
  font-family:'DM Sans',sans-serif;
  transition:color 0.2s;padding:0;
}
.auth-footer-link button:hover{color:var(--sky);}

.btn-guest{
  display:flex;align-items:center;gap:6px;
  background:none;border:none;padding:0;
  font-size:12.5px;color:rgba(143,212,255,0.3);
  cursor:pointer;font-family:'DM Sans',sans-serif;
  transition:color 0.2s;
}
.btn-guest:hover{color:rgba(143,212,255,0.6);}
.btn-guest .dot-sky{width:5px;height:5px;}

.terms-text{margin-top:16px;font-size:10px;color:rgba(143,212,255,0.14);text-align:center;letter-spacing:0.3px;line-height:1.9;}

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
.strip-stat-num span{background:linear-gradient(135deg,var(--sky),var(--sky2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
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

@media(max-width:900px){
  .page{grid-template-columns:1fr;grid-template-areas:"nav""right""left""strip"}
  nav{padding:16px 24px}
  .nav-stats{gap:14px}
  .hero{padding:40px 24px;border-right:none;border-top:1px solid var(--glass-b)}
  .auth-panel{padding:40px 24px}
  .strip{padding:14px 24px;flex-direction:column;gap:12px;align-items:flex-start}
  .strip-features{flex-wrap:wrap;gap:12px}
  .logo-hero .logo-wordmark{font-size:38px;}
}
@media(max-width:560px){
  .nav-stats{display:none}
  .fields-row{grid-template-columns:1fr}
  .logo-hero .logo-icon-wrap{width:64px;height:64px;}
  .logo-hero .logo-wordmark{font-size:30px;}
  .logo-badge{display:none}
  .logo-divider{display:none}
  .carousel-stage{width:170px;height:170px;}
  .carousel-img img{width:150px;height:150px;}
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
        <div className={`carousel-label-name ${labelVisible ? "visible" : ""}`}>
          {slide.name}
        </div>
        <div className={`carousel-label-desc ${labelVisible ? "visible" : ""}`}>
          {slide.desc}
        </div>
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

/* ─── LOGO COMPONENT ─────────────────────────────────────────── */
function Logo({ variant = "nav" }: { variant?: "nav" | "hero" }) {
  const isHero = variant === "hero";
  return (
    <div className={isHero ? "logo-hero" : "logo-nav"}>
      <div className="logo-icon-wrap">
        <div className="logo-icon-bg" />
        <img src={img.src} alt="Turrinder" className="logo-icon-img" />
      </div>
      <div className="logo-text-group">
        <span className="logo-wordmark">
          Turr<em>inder</em>
        </span>
      </div>
    </div>
  );
}

/* ─── GOOGLE ICON SVG ────────────────────────────────────────── */
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

/* ─── LOGIN FORM ─────────────────────────────────────────────── */
function LoginForm({ onToast }: { onToast: (msg: string) => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
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
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      onToast("Email o contraseña incorrectos ❌");
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles").select("id, name").eq("id", data.user.id).single();
    if (!profile || !profile.name) {
      onToast("Completá tu perfil para continuar 📝");
      setTimeout(() => router.push("/auth/register?from=google"), 1000);
    } else {
      onToast("¡Bienvenido/a! 🚀");
      setTimeout(() => router.push("/discover"), 1200);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { onToast("Error al conectar con Google ❌"); setGoogleLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { onToast("Ingresá tu email primero 📧"); return; }
    setForgotLoading(true);
    const supabase = await getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setForgotLoading(false);
    if (error) { onToast("No se pudo enviar el email ❌"); }
    else { onToast("Revisá tu bandeja de entrada 📬"); }
  };

  return (
    <div>
      <button className="btn-google" onClick={handleGoogleLogin} disabled={googleLoading}>
        <GoogleIcon />
        {googleLoading ? "Conectando..." : "Continuar con Google"}
      </button>

      <div className="divider">
        <div className="divider-line" />
        <span className="divider-text">o con email</span>
        <div className="divider-line" />
      </div>

      <div className="field">
        <label className="label">Email</label>
        <div className="input-wrap">
          <input className="input" type="email" placeholder="tu@email.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label className="label">Contraseña</label>
        <div className="input-wrap">
          <input className="input" type="password" placeholder="••••••••"
            value={pass} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
      </div>

      <div className="forgot-row">
        <button className="forgot-btn" onClick={handleForgotPassword} disabled={forgotLoading}>
          {forgotLoading ? "Enviando..." : "¿Olvidaste tu contraseña?"}
        </button>
      </div>

      <button className="btn-primary" onClick={handleLogin} disabled={loading}>
        {loading && <span className="btn-spinner" />}
        {loading ? "Ingresando..." : "Iniciar sesión →"}
      </button>

      <div className="auth-footer">
        <span className="auth-footer-link">
          ¿No tenés cuenta?{" "}
          <button onClick={() => router.push("/auth/register")}>Registrate</button>
        </span>
        <button className="btn-guest" onClick={() => {
          onToast("Entrando como invitado... ⚡");
          setTimeout(() => router.push("/discover"), 1000);
        }}>
          <div className="dot-sky" />
          Entrar sin cuenta
        </button>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
export default function Turrinder() {
  const [toast, setToast] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const onlineCount = useFluctuate(8342, 120);
  const videoCount = useFluctuate(1204, 60);
  const s1 = useCountUp(284700, "+", stripRef);
  const s2 = useCountUp(1820000, "+", stripRef);
  const s3 = useCountUp(430000, "+", stripRef);

  return (
    <>
      <style>{globalStyles}</style>
      <div className="flag-stripe" />
      <div className="aurora" />
      <Particles />

      <div className="page">
        <section className="hero">
          <Logo variant="hero" />
          <h1 className="hero-title">
            El lugar donde streamers, debatistas y personas reales se encuentran.
          </h1>
          <HeroCarousel />
        </section>

        <section className="auth-panel">
          <h2 className="auth-heading">Empezá <em>ahora</em></h2>
          <p className="auth-sub">En 60 segundos ya estás adentro.</p>

          <LoginForm onToast={setToast} />

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