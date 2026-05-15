"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import img from "../../../../Images/logo.png";
import { supabase } from "@/services/supabase.client";

const LOOKING_FOR = [
  { id:"friends", label:"Amigos",    emoji:"👋", desc:"Sin presiones" },
  { id:"dates",   label:"Citas",     emoji:"❤️", desc:"Algo especial" },
  { id:"chat",    label:"Charlar",   emoji:"💬", desc:"Ideas genuinas" },
  { id:"debate",  label:"Debates",   emoji:"🔥", desc:"Perspectivas" },
  { id:"network", label:"Network",   emoji:"🤝", desc:"Crecer juntos" },
  { id:"stream",  label:"Streams",   emoji:"🎙️", desc:"Audiencia" },
];

const GENDERS = ["Hombre","Mujer","No binario","Prefiero no decir"];

type Photo = { file: File; url: string };

function pwStrength(p: string) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 6)  s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
const STR_LBL = ["","Débil","Regular","Buena","Fuerte","Muy fuerte"];
const STR_CLR = ["","#ff4466","#ff8800","#f5c518","#44cc88","#00e676"];

// ─── CSS ─────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Clash+Display:wght@500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --sky:#54c7f8;
  --sky2:#3b9eda;
  --sky3:#1a6fa8;
  --bg:#030a14;
  --bg2:#050f1e;
  --card-bg:rgba(8,18,38,0.92);
  --text:rgba(240,248,255,0.92);
  --muted:rgba(180,215,240,0.5);
  --w:#f5f8ff;
}
html,body{height:100%;overflow-x:hidden}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}

.rg-bg{position:fixed;inset:0;z-index:0;background:var(--bg);overflow:hidden;}
.rg-bg-grid{
  position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(84,199,248,0.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(84,199,248,0.04) 1px,transparent 1px);
  background-size:60px 60px;
  mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%);
}
.rg-blob{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
.rg-blob-1{width:700px;height:700px;background:radial-gradient(circle,rgba(84,199,248,0.12) 0%,transparent 70%);top:-200px;left:-200px;animation:blobFloat1 20s ease-in-out infinite alternate;}
.rg-blob-2{width:500px;height:500px;background:radial-gradient(circle,rgba(59,158,218,0.09) 0%,transparent 70%);bottom:-150px;right:-150px;animation:blobFloat2 26s ease-in-out infinite alternate;}
.rg-blob-3{width:300px;height:300px;background:radial-gradient(circle,rgba(26,111,168,0.07) 0%,transparent 70%);top:50%;left:60%;animation:blobFloat3 18s ease-in-out infinite alternate;}
@keyframes blobFloat1{from{transform:translate(0,0)}to{transform:translate(80px,100px) scale(1.1)}}
@keyframes blobFloat2{from{transform:translate(0,0)}to{transform:translate(-60px,-80px) scale(1.08)}}
@keyframes blobFloat3{from{transform:translate(0,0)}to{transform:translate(-40px,60px)}}

.rg-root{position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 24px;}
.rg-inner{display:flex;align-items:center;gap:0;width:100%;max-width:960px;}

.rg-left{flex:1 1 0;display:flex;flex-direction:column;justify-content:center;padding:0 48px 0 0;min-width:0;}
.rg-logo{display:flex;align-items:center;gap:12px;margin-bottom:32px;}
.rg-logo-icon{width:38px;height:38px;border-radius:10px;overflow:hidden;border:1px solid rgba(84,199,248,0.22);display:flex;align-items:center;justify-content:center;}
.rg-logo-icon img{width:100%;height:100%;object-fit:contain;}
.rg-logo-wordmark{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.7px;color:var(--w);}
.rg-logo-wordmark em{font-style:normal;background:linear-gradient(120deg,var(--sky),#a8e6ff 55%,var(--sky2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}

.rg-hero-badge{display:inline-flex;align-items:center;gap:7px;padding:5px 16px;margin-bottom:22px;background:rgba(84,199,248,0.07);border:1px solid rgba(84,199,248,0.18);border-radius:100px;font-size:11px;font-weight:600;letter-spacing:.5px;color:rgba(143,212,255,.8);}
.rg-live-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;animation:livePulse 2s infinite;}
@keyframes livePulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.7)}70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
.rg-hero-title{font-family:'Syne',sans-serif;font-size:clamp(30px,3.2vw,50px);font-weight:800;letter-spacing:-1.5px;line-height:1.06;color:var(--w);margin-bottom:18px;}
.rg-hero-title span{background:linear-gradient(135deg,var(--sky) 0%,#8fd4ff 50%,var(--sky2) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.rg-hero-sub{font-size:15px;color:var(--muted);font-weight:300;line-height:1.75;max-width:400px;margin-bottom:48px;}
.rg-features{display:flex;flex-direction:column;gap:14px;}
.rg-feat{display:flex;align-items:center;gap:14px;}
.rg-feat-icon{width:38px;height:38px;border-radius:10px;flex-shrink:0;background:rgba(84,199,248,0.06);border:1px solid rgba(84,199,248,0.12);display:flex;align-items:center;justify-content:center;font-size:17px;}
.rg-feat-text{font-size:13.5px;color:rgba(180,215,240,0.6);font-weight:400;line-height:1.4;}
.rg-feat-text strong{color:rgba(200,235,255,0.85);font-weight:600;}

.rg-divider-v{width:1px;background:linear-gradient(to bottom,transparent,rgba(84,199,248,0.1) 20%,rgba(84,199,248,0.1) 80%,transparent);flex-shrink:0;align-self:stretch;margin:0 0;}
.rg-right{flex:0 0 380px;}

.rg-card{width:100%;background:var(--card-bg);border:1px solid rgba(84,199,248,0.12);border-radius:22px;padding:26px 26px 22px;position:relative;overflow:hidden;backdrop-filter:blur(32px);box-shadow:0 0 0 1px rgba(84,199,248,0.06),0 24px 60px rgba(3,10,20,0.8),0 8px 24px rgba(84,199,248,0.06);animation:cardAppear .5s cubic-bezier(0.34,1.15,0.64,1) both;}
@keyframes cardAppear{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.rg-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(84,199,248,0.35),transparent);pointer-events:none;}

/* Google banner en card */
.rg-google-banner{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;margin-bottom:20px;
  background:rgba(66,133,244,0.08);
  border:1px solid rgba(66,133,244,0.2);
  border-radius:11px;
  font-size:12px;color:rgba(180,215,240,0.7);
  line-height:1.4;
}
.rg-google-banner svg{flex-shrink:0;}

.rg-card-badge{display:flex;align-items:center;gap:8px;margin-bottom:22px;}
.rg-card-badge-icon{width:34px;height:34px;border-radius:9px;background:linear-gradient(145deg,rgba(84,199,248,0.14),rgba(59,158,218,0.05));border:1px solid rgba(84,199,248,0.22);display:flex;align-items:center;justify-content:center;font-size:16px;}
.rg-card-badge-text{font-size:13px;font-weight:700;color:rgba(143,212,255,0.6);font-family:'Syne',sans-serif;}
.rg-card-badge-sub{font-size:10px;color:rgba(84,199,248,0.3);letter-spacing:.3px;}

.rg-chips{display:flex;gap:0;margin-bottom:24px;}
.rg-chip{flex:1;text-align:center;padding:7px 4px;font-size:11px;font-weight:700;color:rgba(84,199,248,0.28);letter-spacing:.2px;background:rgba(84,199,248,0.03);border:1px solid rgba(84,199,248,0.1);cursor:default;transition:all .25s;font-family:'Syne',sans-serif;}
.rg-chip:first-child{border-radius:8px 0 0 8px;border-right:none;}
.rg-chip:last-child{border-radius:0 8px 8px 0;border-left:none;}
.rg-chip:not(:first-child):not(:last-child){border-left:none;}
.rg-chip.c-done{background:rgba(84,199,248,0.08);color:rgba(84,199,248,.55);}
.rg-chip.c-active{background:linear-gradient(135deg,rgba(84,199,248,0.16),rgba(59,158,218,0.1));border-color:rgba(84,199,248,0.4);color:var(--sky);box-shadow:inset 0 0 0 1px rgba(84,199,248,0.08);z-index:1;}

.rg-prog-wrap{height:2px;background:rgba(84,199,248,0.07);border-radius:100px;margin-bottom:26px;overflow:hidden;}
.rg-prog-fill{height:100%;border-radius:100px;background:linear-gradient(90deg,var(--sky),var(--sky2));transition:width .5s cubic-bezier(.4,0,.2,1);}

.rg-h2{font-family:'Syne',sans-serif;font-size:clamp(20px,2vw,24px);font-weight:800;letter-spacing:-0.6px;line-height:1.1;color:var(--w);margin-bottom:6px;}
.rg-h2 em{font-style:normal;background:linear-gradient(135deg,var(--sky),#a8e6ff 55%,var(--sky2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.rg-p{font-size:12.5px;color:var(--muted);line-height:1.6;font-weight:300;margin-bottom:20px;}

.rg-fields{display:flex;flex-direction:column;gap:12px;margin-bottom:16px;}
.rg-field{display:flex;flex-direction:column;gap:5px;}
.rg-label{font-size:9.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(84,199,248,0.35);display:flex;align-items:center;gap:6px;}
.rg-req{color:var(--sky);font-size:12px;line-height:1;}
.rg-badge-opt{font-size:8px;letter-spacing:1px;text-transform:uppercase;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(84,199,248,0.06);border:1px solid rgba(84,199,248,0.12);color:rgba(84,199,248,0.25);}
.rg-iw{position:relative;}
.rg-input{width:100%;background:rgba(84,199,248,0.04);border:1.5px solid rgba(84,199,248,0.1);border-radius:12px;padding:11px 15px;font-size:13.5px;font-family:'Inter',sans-serif;font-weight:400;color:var(--w);outline:none;transition:border-color .2s,box-shadow .2s,background .2s;-webkit-appearance:none;line-height:1.5;}
.rg-input::placeholder{color:rgba(84,199,248,0.16);font-size:13px;}
.rg-input:focus{border-color:rgba(84,199,248,0.45);background:rgba(84,199,248,0.06);box-shadow:0 0 0 3px rgba(84,199,248,0.08);}
.rg-input.has-icon{padding-right:44px;}
textarea.rg-input{resize:none;}
.rg-icon-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(84,199,248,0.22);font-size:15px;padding:4px;display:flex;align-items:center;justify-content:center;transition:color .15s;}
.rg-icon-btn:hover{color:rgba(84,199,248,.65);}
.rg-char-ct{text-align:right;font-size:10px;color:rgba(84,199,248,0.2);margin-top:-2px;}
.rg-str{display:flex;align-items:center;gap:8px;margin-top:4px;}
.rg-str-bars{display:flex;gap:3px;flex:1;}
.rg-str-bar{flex:1;height:2px;border-radius:100px;background:rgba(84,199,248,0.07);transition:background .3s;}
.rg-str-txt{font-size:10.5px;font-weight:600;min-width:64px;text-align:right;}
.rg-match{font-size:10.5px;font-weight:500;margin-top:3px;display:flex;align-items:center;gap:4px;}
.rg-2col{display:grid;grid-template-columns:1fr 80px;gap:10px;align-items:start;}
.rg-gender{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;}
.rg-gpill{padding:8px 4px;text-align:center;background:rgba(84,199,248,0.04);border:1.5px solid rgba(84,199,248,0.09);border-radius:9px;font-size:11px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .18s;font-family:'Inter',sans-serif;}
.rg-gpill:hover{background:rgba(84,199,248,.08);border-color:rgba(84,199,248,.25);color:rgba(84,199,248,.75);}
.rg-gpill.on{background:rgba(84,199,248,.1);border-color:rgba(84,199,248,.42);color:var(--sky);}

.rg-photo-wall{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;}
.rg-photo-slot{aspect-ratio:3/4;border-radius:10px;overflow:hidden;position:relative;background:rgba(84,199,248,0.03);border:1.5px dashed rgba(84,199,248,0.1);cursor:pointer;transition:all .2s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;}
.rg-photo-slot:hover{border-color:rgba(84,199,248,.32);background:rgba(84,199,248,.06);}
.rg-photo-slot.filled{border-style:solid;border-color:rgba(84,199,248,.1);cursor:default;}
.rg-photo-slot img{width:100%;height:100%;object-fit:cover;display:block;}
.rg-photo-add{font-size:18px;opacity:.25;}
.rg-photo-add-lbl{font-size:9px;color:rgba(84,199,248,.2);text-align:center;line-height:1.3;padding:0 4px;font-weight:500;}
.rg-photo-main-badge{position:absolute;bottom:4px;left:3px;right:3px;background:linear-gradient(135deg,rgba(84,199,248,0.9),rgba(59,158,218,0.85));color:#02080f;font-size:7px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 4px;border-radius:5px;text-align:center;z-index:2;}
.rg-photo-del{position:absolute;top:4px;right:4px;width:18px;height:18px;border-radius:50%;background:rgba(2,8,24,0.8);backdrop-filter:blur(6px);border:1px solid rgba(84,199,248,0.15);color:rgba(200,235,255,.7);font-size:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;transition:background .15s;}
.rg-photo-del:hover{background:rgba(59,158,218,.8);color:#02080f;}
.rg-photo-n{position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:4px;background:rgba(2,8,24,.65);border:1px solid rgba(84,199,248,.12);color:rgba(84,199,248,.55);font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;z-index:2;}
.rg-photo-note{display:flex;align-items:flex-start;gap:7px;padding:8px 11px;background:rgba(84,199,248,0.04);border:1px solid rgba(84,199,248,0.09);border-radius:9px;margin-bottom:16px;}
.rg-photo-note-txt{font-size:10.5px;color:rgba(143,212,255,0.35);line-height:1.5;font-weight:400;}

.rg-lf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:18px;}
.rg-lf{padding:12px 8px;background:rgba(84,199,248,0.04);border:1.5px solid rgba(84,199,248,0.09);border-radius:13px;cursor:pointer;transition:all .2s;position:relative;text-align:left;overflow:hidden;}
.rg-lf:hover{border-color:rgba(84,199,248,.26);background:rgba(84,199,248,.07);}
.rg-lf.on{background:rgba(84,199,248,.09);border-color:rgba(84,199,248,.42);}
.rg-lf-emo{font-size:18px;margin-bottom:4px;display:block;}
.rg-lf-lbl{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:rgba(180,215,240,.55);transition:color .2s;line-height:1.2;}
.rg-lf.on .rg-lf-lbl{color:var(--w);}
.rg-lf-desc{font-size:9px;color:rgba(84,199,248,.22);line-height:1.3;margin-top:2px;}
.rg-lf.on .rg-lf-desc{color:rgba(84,199,248,.48);}
.rg-lf-ck{position:absolute;top:6px;right:6px;width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,var(--sky),var(--sky2));display:flex;align-items:center;justify-content:center;font-size:7px;color:#02080f;opacity:0;transform:scale(.4) rotate(-40deg);transition:all .26s cubic-bezier(0.34,1.4,0.64,1);box-shadow:0 2px 8px rgba(84,199,248,.45);}
.rg-lf.on .rg-lf-ck{opacity:1;transform:scale(1) rotate(0deg);}

.rg-sec-divider{display:flex;align-items:center;gap:10px;margin:4px 0 14px;}
.rg-div-ln{flex:1;height:1px;background:rgba(84,199,248,.07);}
.rg-div-txt{font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(84,199,248,.2);text-transform:uppercase;}
.rg-tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:18px;}
.rg-tag{padding:5px 11px;background:rgba(84,199,248,0.04);border:1.5px solid rgba(84,199,248,0.09);border-radius:100px;color:var(--muted);font-size:12px;font-weight:500;cursor:pointer;transition:all .16s;font-family:'Inter',sans-serif;white-space:nowrap;}
.rg-tag:hover{background:rgba(84,199,248,.09);border-color:rgba(84,199,248,.28);color:rgba(84,199,248,.85);}
.rg-tag.on{background:rgba(84,199,248,.11);border-color:rgba(84,199,248,.44);color:var(--sky);font-weight:600;}
.rg-sec-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.rg-sec-ttl{font-size:9.5px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:rgba(84,199,248,.35);}
.rg-sec-ct{font-size:11px;color:var(--sky);font-weight:600;}

.rg-actions{display:flex;flex-direction:column;gap:8px;}
.rg-btn{width:100%;padding:13px 24px;background:linear-gradient(135deg,var(--sky) 0%,var(--sky2) 55%,var(--sky3) 100%);border:none;border-radius:12px;color:#02080f;font-family:'Syne',sans-serif;font-size:14px;font-weight:800;letter-spacing:.2px;cursor:pointer;transition:all .22s cubic-bezier(0.16,1,0.3,1);box-shadow:0 8px 28px rgba(84,199,248,.34),inset 0 1px 0 rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;gap:7px;position:relative;overflow:hidden;}
.rg-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.16),transparent 55%);pointer-events:none;}
.rg-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 14px 40px rgba(84,199,248,.48),inset 0 1px 0 rgba(255,255,255,.22);}
.rg-btn:active{transform:translateY(0);}
.rg-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none;}
.rg-btn-ghost{width:100%;padding:11px 20px;background:transparent;border:1.5px solid rgba(84,199,248,.1);border-radius:12px;color:var(--muted);font-family:'Inter',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;}
.rg-btn-ghost:hover{border-color:rgba(84,199,248,.28);color:rgba(84,199,248,.75);background:rgba(84,199,248,.04);}

.rg-terms{font-size:10px;color:rgba(84,199,248,.18);text-align:center;line-height:1.6;margin-top:10px;}
.rg-terms a{color:rgba(84,199,248,.35);text-decoration:underline;cursor:pointer;}

.rg-card-scroll{max-height:calc(100dvh - 80px);overflow-y:auto;overflow-x:hidden;}
.rg-card-scroll::-webkit-scrollbar{display:none;}

@media(max-width:700px){
  .rg-inner{flex-direction:column;gap:32px;}
  .rg-left{padding:0;min-width:unset;}
  .rg-right{flex:unset;width:100%;}
  .rg-divider-v{display:none;}
  .rg-hero-sub{max-width:100%;}
  .rg-logo{margin-bottom:24px;}
}

input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
input[type=number]{-moz-appearance:textfield;}

.rg-error{display:flex;align-items:center;gap:10px;padding:11px 14px;margin-bottom:14px;background:rgba(255,60,80,0.08);border:1.5px solid rgba(255,60,80,0.22);border-radius:11px;font-size:12.5px;color:rgba(255,150,160,0.95);font-weight:500;line-height:1.4;animation:errorIn .2s ease both;}
@keyframes errorIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.rg-error-icon{font-size:15px;flex-shrink:0;}
`;

// Cuando viene de Google, los pasos visibles son solo Perfil y Vibe
const STEPS_GOOGLE = [
  { label:"Perfil", emoji:"✨" },
  { label:"Vibe",   emoji:"🔥" },
];
const STEPS_NORMAL = [
  { label:"Cuenta", emoji:"🔐" },
  { label:"Perfil",  emoji:"✨" },
  { label:"Vibe",    emoji:"🔥" },
];

function RegisterPageInner() {
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Si viene con ?from=google, saltamos el paso de email/contraseña
  const fromGoogle = searchParams.get("from") === "google";

  const STEPS = fromGoogle ? STEPS_GOOGLE : STEPS_NORMAL;

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [error, setError]     = useState("");
  const [userId, setUserId]   = useState<string | null>(null);

  // Si viene de Google, obtener el userId de la sesión activa
  useEffect(() => {
    if (fromGoogle) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setUserId(session.user.id);
        } else {
          // Sin sesión activa, redirigir al login
          router.replace("/");
        }
      });
    }
  }, [fromGoogle, router]);

  const goTo = (n: number) => { setStep(n); setAnimKey(k => k + 1); setError(""); };
  const err  = (msg: string) => { setError(msg); };

  // Paso de cuenta (solo flujo normal)
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [conf, setConf]         = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);

  // Paso de perfil
  const [name, setName]     = useState("");
  const [age, setAge]       = useState("");
  const [gender, setGender] = useState("");
  const [bio, setBio]       = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Paso de vibe
  const [lookingFor, setLF] = useState<string[]>([]);

  const str  = pwStrength(pass);

  // El progress bar considera solo los pasos del flujo actual
  const prog = ((step + 1) / STEPS.length) * 100;

  // ── STEP 0 (solo flujo normal): crear usuario ─────────────────
  const handleAccount = async () => {
    if (!email || !pass) return err("Completá email y contraseña.");
    if (pass !== conf)   return err("Las contraseñas no coinciden.");
    if (pass.length < 6) return err("La contraseña debe tener al menos 6 caracteres.");

    setError(""); setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: pass,
      });
      if (signUpError) {
        if (signUpError.message.includes("already registered"))
          return err("Ya existe una cuenta con ese email.");
        return err(signUpError.message);
      }
      if (!data.user) return err("No se pudo crear la cuenta. Intentá de nuevo.");
      setUserId(data.user.id);
      goTo(1);
    } catch {
      err("Error inesperado. Revisá tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  // ── Paso perfil: validar ──────────────────────────────────────
  const handleProfile = () => {
    if (!name.trim())               return err("Agregá tu nombre.");
    if (!age || parseInt(age) < 18) return err("Debés tener al menos 18 años.");
    if (photos.length === 0)        return err("Subí al menos una foto.");
    // En flujo Google el paso 0 → Perfil, 1 → Vibe
    goTo(fromGoogle ? 1 : 2);
  };

  // ── Último paso: subir fotos y guardar perfil ─────────────────
  const handleFinish = async () => {
    if (!userId) return err("Sesión perdida. Volvé al inicio.");
    setLoading(true); setError("");

    try {
      let avatarUrl: string | null = null;

      if (photos.length > 0) {
        const mainPhoto = photos[0];
        const ext = mainPhoto.file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, mainPhoto.file, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id:          userId,
          name:        name.trim(),
          age:         parseInt(age),
          gender:      gender || null,
          bio:         bio.trim() || null,
          avatar_url:  avatarUrl,
          looking_for: lookingFor,
        });

      if (profileError) return err("Error al guardar el perfil: " + profileError.message);

      router.push("/profile");
    } catch {
      err("Error inesperado al guardar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const rem = 4 - photos.length;
    const add: Photo[] = files.slice(0, rem).map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos(p => [...p, ...add]);
    e.target.value = "";
  };

  // El índice real del paso "Perfil" y "Vibe" depende del flujo
  const profileStepIndex = fromGoogle ? 0 : 1;
  const vibeStepIndex    = fromGoogle ? 1 : 2;

  return (
    <>
      <style>{CSS}</style>

      <div className="rg-bg">
        <div className="rg-bg-grid"/>
        <div className="rg-blob rg-blob-1"/>
        <div className="rg-blob rg-blob-2"/>
        <div className="rg-blob rg-blob-3"/>
      </div>

      <div className="rg-root">
        <div className="rg-inner">

          {/* ══ LEFT ══ */}
          <div className="rg-left">
            <div className="rg-logo">
              <div className="rg-logo-icon">
                <Image src={img} alt="Turrinder logo" width={40} height={40}
                  style={{ objectFit:"cover", width:"100%", height:"100%" }}/>
              </div>
              <div>
                <div className="rg-logo-wordmark">Turr<em>inder</em></div>
              </div>
            </div>
            <div className="rg-hero-badge">
              <div className="rg-live-dot"/>
              Creá tu cuenta — es gratis
            </div>
            <h1 className="rg-hero-title">
              Tu lugar para<br/>
              <span>conectar</span>, crear<br/>
              y debatir.
            </h1>
            <p className="rg-hero-sub">
              Streamers, debatistas, personas que buscan comunidad o simplemente quieren conocer gente real. Turrinder es para todos.
            </p>
            <div className="rg-features">
              <div className="rg-feat">
                <div className="rg-feat-icon">🎙️</div>
                <div className="rg-feat-text"><strong>Streams en vivo</strong> — conectá con tu audiencia en tiempo real.</div>
              </div>
              <div className="rg-feat">
                <div className="rg-feat-icon">🔥</div>
                <div className="rg-feat-text"><strong>Debates reales</strong> — intercambiá perspectivas con gente que piensa diferente.</div>
              </div>
              <div className="rg-feat">
                <div className="rg-feat-icon">❤️</div>
                <div className="rg-feat-text"><strong>Conexiones genuinas</strong> — amigos, citas o comunidad, vos elegís.</div>
              </div>
            </div>
          </div>

          <div className="rg-divider-v"/>

          {/* ══ RIGHT: card ══ */}
          <div className="rg-right">
            <div className="rg-card" key={animKey}>

              <div className="rg-card-badge">
                <div className="rg-card-badge-icon">
                  <Image src={img} alt="Turrinder logo" width={40} height={40}
                    style={{ objectFit:"cover", width:"100%", height:"100%" }}/>
                </div>
                <div>
                  <div className="rg-card-badge-text">Turrinder</div>
                  <div className="rg-card-badge-sub">Conectá · Creá · Debatí</div>
                </div>
              </div>

              {/* Banner Google si aplica */}
              {fromGoogle && (
                <div className="rg-google-banner">
                  <svg width="16" height="16" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Cuenta de Google conectada. Solo falta completar tu perfil.
                </div>
              )}

              <div className="rg-chips">
                {STEPS.map((s, i) => (
                  <div key={s.label} className={`rg-chip ${i < step ? "c-done" : i === step ? "c-active" : ""}`}>
                    {i < step ? "✓ " : `${i+1}. `}{s.label}
                  </div>
                ))}
              </div>

              <div className="rg-prog-wrap">
                <div className="rg-prog-fill" style={{ width:`${prog}%` }}/>
              </div>

              <div className="rg-card-scroll">

                {error && (
                  <div className="rg-error">
                    <span className="rg-error-icon">⚠️</span>
                    {error}
                  </div>
                )}

                {/* ── PASO CUENTA (solo flujo normal) ── */}
                {!fromGoogle && step === 0 && (
                  <>
                    <h2 className="rg-h2">Tu <em>cuenta</em></h2>
                    <p className="rg-p">Con esto entrás. Usá un email real.</p>
                    <div className="rg-fields">
                      <div className="rg-field">
                        <label className="rg-label">Email <span className="rg-req">*</span></label>
                        <input className="rg-input" type="email" placeholder="tu@email.com"
                          value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/>
                      </div>
                      <div className="rg-field">
                        <label className="rg-label">Contraseña <span className="rg-req">*</span></label>
                        <div className="rg-iw">
                          <input className="rg-input has-icon" type={showPass?"text":"password"}
                            placeholder="Mínimo 6 caracteres"
                            value={pass} onChange={e => setPass(e.target.value)} autoComplete="new-password"/>
                          <button className="rg-icon-btn" type="button" tabIndex={-1}
                            onClick={() => setShowPass(p => !p)}>{showPass?"🙈":"👁️"}</button>
                        </div>
                        {pass.length > 0 && (
                          <div className="rg-str">
                            <div className="rg-str-bars">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className="rg-str-bar"
                                  style={{ background: i <= str ? STR_CLR[str] : undefined }}/>
                              ))}
                            </div>
                            <span className="rg-str-txt" style={{ color:STR_CLR[str] }}>{STR_LBL[str]}</span>
                          </div>
                        )}
                      </div>
                      <div className="rg-field">
                        <label className="rg-label">Confirmar contraseña <span className="rg-req">*</span></label>
                        <div className="rg-iw">
                          <input className="rg-input has-icon" type={showConf?"text":"password"}
                            placeholder="Repetí tu contraseña"
                            value={conf} onChange={e => setConf(e.target.value)}
                            onKeyDown={e => e.key==="Enter" && handleAccount()} autoComplete="new-password"/>
                          <button className="rg-icon-btn" type="button" tabIndex={-1}
                            onClick={() => setShowConf(p => !p)}>{showConf?"🙈":"👁️"}</button>
                        </div>
                        {conf.length > 0 && (
                          <div className="rg-match" style={{ color:pass===conf?"#44cc88":"#ff5566" }}>
                            {pass===conf?"✓ Coinciden":"✕ No coinciden"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="rg-actions">
                      <button className="rg-btn" onClick={handleAccount} disabled={loading}>
                        {loading ? "Creando cuenta..." : <><span>Continuar</span><span>→</span></>}
                      </button>
                      <button className="rg-btn-ghost" onClick={() => router.push("/")}>Iniciar sesión</button>
                    </div>
                    <p className="rg-terms">
                      Al registrarte aceptás nuestros <a>Términos de uso</a> y <a>Política de privacidad</a>. Solo para mayores de 18 años.
                    </p>
                  </>
                )}

                {/* ── PASO PERFIL ── */}
                {step === profileStepIndex && (
                  <>
                    <h2 className="rg-h2">Tu <em>perfil</em></h2>
                    <p className="rg-p">Es lo primero que ven los demás. Hacelo tuyo.</p>
                    <div className="rg-fields">
                      <div className="rg-2col">
                        <div className="rg-field">
                          <label className="rg-label">Nombre <span className="rg-req">*</span></label>
                          <input className="rg-input" placeholder="Tu nombre o apodo"
                            value={name} onChange={e => setName(e.target.value)} maxLength={30}/>
                        </div>
                        <div className="rg-field">
                          <label className="rg-label">Edad <span className="rg-req">*</span></label>
                          <input className="rg-input" type="number" placeholder="18"
                            value={age} onChange={e => setAge(e.target.value)}
                            min={18} max={99} style={{ textAlign:"center" }}/>
                        </div>
                      </div>
                      <div className="rg-field">
                        <label className="rg-label">Género <span className="rg-badge-opt">Opcional</span></label>
                        <div className="rg-gender">
                          {GENDERS.map(g => (
                            <button key={g} type="button"
                              className={`rg-gpill ${gender===g?"on":""}`}
                              onClick={() => setGender(gender===g?"":g)}>{g}</button>
                          ))}
                        </div>
                      </div>
                      <div className="rg-field">
                        <label className="rg-label">Bio <span className="rg-badge-opt">Opcional</span></label>
                        <textarea className="rg-input" rows={2}
                          placeholder="Contá algo sobre vos…"
                          value={bio} onChange={e => setBio(e.target.value.slice(0,160))}/>
                        <div className="rg-char-ct">{bio.length}/160</div>
                      </div>
                    </div>
                    <div className="rg-sec-row" style={{ marginBottom:8 }}>
                      <span className="rg-sec-ttl">Fotos <span style={{color:"var(--sky)"}}>*</span></span>
                      <span className="rg-sec-ct">{photos.length}/4 subidas</span>
                    </div>
                    <div className="rg-photo-wall">
                      {[0,1,2,3].map(idx => (
                        <div key={idx} className={`rg-photo-slot ${photos[idx]?"filled":""}`}
                          onClick={() => !photos[idx] && fileRef.current?.click()}>
                          {photos[idx] ? (
                            <>
                              <img src={photos[idx].url} alt=""/>
                              <div className="rg-photo-n">{idx+1}</div>
                              {idx===0 && <div className="rg-photo-main-badge">⭐ Principal</div>}
                              <button className="rg-photo-del" type="button"
                                onClick={e => { e.stopPropagation(); setPhotos(p => p.filter((_,i) => i!==idx)); }}>
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="rg-photo-add">{idx===0?"📷":"+"}</div>
                              <div className="rg-photo-add-lbl">{idx===0?"Principal":"Foto "+(idx+1)}</div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={addPhotos}/>
                    <div className="rg-photo-note">
                      <span style={{fontSize:12,flexShrink:0}}>💡</span>
                      <span className="rg-photo-note-txt">Cara visible y buena iluminación. JPG, PNG o WEBP · Máx 5 MB.</span>
                    </div>
                    <div className="rg-actions">
                      <button className="rg-btn" onClick={handleProfile}>Continuar →</button>
                      {/* En flujo Google no hay paso anterior */}
                      {!fromGoogle && (
                        <button className="rg-btn-ghost" onClick={() => goTo(0)}>← Volver</button>
                      )}
                    </div>
                  </>
                )}

                {/* ── PASO VIBE ── */}
                {step === vibeStepIndex && (
                  <>
                    <h2 className="rg-h2">Tu <em>vibe</em></h2>
                    <p className="rg-p">Conectamos mejor cuando sabemos qué buscás.</p>
                    <div className="rg-sec-row">
                      <span className="rg-sec-ttl">¿Qué buscás?</span>
                      {lookingFor.length > 0 && (
                        <span className="rg-sec-ct">{lookingFor.length} elegido{lookingFor.length>1?"s":""}</span>
                      )}
                    </div>
                    <div className="rg-lf-grid">
                      {LOOKING_FOR.map(lf => (
                        <button key={lf.id} type="button"
                          className={`rg-lf ${lookingFor.includes(lf.id)?"on":""}`}
                          onClick={() => setLF(p => p.includes(lf.id)?p.filter(i=>i!==lf.id):[...p,lf.id])}>
                          <div className="rg-lf-ck">✓</div>
                          <span className="rg-lf-emo">{lf.emoji}</span>
                          <div className="rg-lf-lbl">{lf.label}</div>
                          <div className="rg-lf-desc">{lf.desc}</div>
                        </button>
                      ))}
                    </div>
                    <div className="rg-actions">
                      <button className="rg-btn" onClick={handleFinish} disabled={loading}>
                        {loading ? "Guardando perfil..." : "¡Empezar a conectar! 🔥"}
                      </button>
                      <button className="rg-btn-ghost" onClick={() => goTo(profileStepIndex)}>← Volver</button>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}