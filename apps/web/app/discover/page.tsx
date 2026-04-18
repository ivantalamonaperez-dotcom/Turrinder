"use client";

import { useEffect, useCallback } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";

import { useProfile } from "@/hooks/useProfile";
import { usePresence } from "@/hooks/usePresence";
import { useMatchmaking } from "@/features/matching/useMatchmaking";
import { useMatchUser } from "@/hooks/useMatchUser";
import { useLike } from "@/hooks/Uselike";
import { useAd } from "@/features/ads/useAd";
import { useSocket } from "@/hooks/useSocket";
import { matchingService } from "@/features/matching/matching.service";

import VideoPlayer from "@/components/video/VideoPlayer";
import MatchModal from "@/components/match/MatchModal";
import AdOverlay from "@/components/ads/AdOverlay";

export default function DiscoverPage() {
  const router = useRouter();
  const { socket } = useSocket();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/");
    };
    checkUser();
  }, [router]);

  useProfile();
  usePresence();

  const { room, searching, findNewMatch } = useMatchmaking();
  const { matchUser } = useMatchUser(room);
  const { likeUser, liked, isMatch, setIsMatch } = useLike(room);

  const { adMode, skipInfo, isBlocked, adReady, reportSkip, reportAdCompleted } = useAd();

  const nextUser = useCallback(async () => {
    if (isBlocked) return;
    try {
      const currentRoomId = room?.id;
      reportSkip();
      findNewMatch();
      if (currentRoomId) {
        matchingService.endRoom(currentRoomId).catch(err =>
          console.error("Error limpiando room:", err)
        );
      }
    } catch (error) {
      console.error("❌ Error en nextUser:", error);
      window.location.reload();
    }
  }, [room, isBlocked, reportSkip, findNewMatch]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        /* ── TOKENS — idénticos a TurrinderPage ── */
        .dp-root {
          --sky:       #54c7f8;
          --sky2:      #3b9eda;
          --sky3:      #1a6fa8;
          --sky-glow:  rgba(84,199,248,0.38);
          --white-arg: #f5f8ff;
          --bg:        #030a14;
          --bg2:       #050f1e;
          --glass:     rgba(84,199,248,0.04);
          --glass-b:   rgba(84,199,248,0.12);
          --muted:     rgba(180,215,240,0.45);
        }

        /* ── ROOT ── */
        .dp-root {
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          overflow: hidden;
          position: relative;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ── AURORA (igual que la landing) ── */
        .dp-aurora {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse 75% 40% at 10% 0%,   rgba(84,199,248,0.13) 0%, transparent 60%),
            radial-gradient(ellipse 55% 35% at 90% 100%,  rgba(59,158,218,0.10) 0%, transparent 58%),
            radial-gradient(ellipse 40% 30% at 70% 10%,   rgba(26,111,168,0.08) 0%, transparent 55%);
          animation: dp-aurora 20s ease-in-out infinite alternate;
        }
        @keyframes dp-aurora {
          0%   { opacity: .7;  transform: scale(1)    rotate(0deg);   }
          50%  { opacity: 1;   transform: scale(1.04) rotate(0.3deg); }
          100% { opacity: .85; transform: scale(1.07) rotate(-0.2deg);}
        }

        /* ── FLAG STRIPE — misma franja tricolor de la landing ── */
        .dp-flag {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg,
            var(--sky) 0%,  var(--sky) 33%,
            rgba(245,248,255,0.85) 33%, rgba(245,248,255,0.85) 66%,
            var(--sky) 66%, var(--sky) 100%
          );
          z-index: 60;
          opacity: 0.65;
        }

        /* ── VIDEO WRAPPER ── */
        .dp-video {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }

        /* ════════════════════════════════════════
           HEADER
        ════════════════════════════════════════ */
        .dp-header {
          position: absolute;
          top: 3px;
          left: 0; right: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px 28px;
          pointer-events: none;
          background: linear-gradient(
            to bottom,
            rgba(3,10,20,0.72) 0%,
            rgba(3,10,20,0.25) 65%,
            transparent 100%
          );
        }

        /* ── LOGO ── */
        .dp-logo-wrap {
          position: relative;
          pointer-events: all;
          user-select: none;
          display: flex;
          align-items: baseline;
        }
        .dp-logo-t {
          font-family: 'Syne', sans-serif;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: -0.8px;
          color: var(--white-arg);
          line-height: 1;
        }
        .dp-logo-inder {
          font-family: 'Syne', sans-serif;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: -0.8px;
          line-height: 1;
          background: linear-gradient(120deg, var(--sky) 0%, #a8e6ff 55%, var(--sky2) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dp-logo-wrap::after {
          content: '';
          position: absolute;
          bottom: -4px; left: 0;
          width: 100%; height: 1.5px;
          background: linear-gradient(90deg, var(--sky), var(--sky2));
          border-radius: 2px;
          opacity: 0.4;
        }

        /* ── HEADER RIGHT ── */
        .dp-header-right {
          display: flex;
          align-items: center;
          gap: 7px;
          pointer-events: all;
        }

        /* ── SKIP COUNTER ── */
        .dp-skips {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(3,10,20,0.58);
          border: 1px solid var(--glass-b);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 100px;
          padding: 5px 12px;
          transition: border-color 0.3s ease, background 0.3s ease;
        }
        .dp-skips.warn {
          border-color: rgba(84,199,248,0.42);
          background: rgba(84,199,248,0.08);
          animation: dp-warn 0.45s ease;
        }
        @keyframes dp-warn {
          0%,100% { transform: none; }
          35%      { transform: scale(1.07); }
        }
        .dp-pips {
          display: flex;
          gap: 3px;
          align-items: center;
        }
        .dp-pip {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: rgba(84,199,248,0.14);
          transition: background 0.25s ease, box-shadow 0.25s ease;
        }
        .dp-pip.on {
          background: var(--sky);
          box-shadow: 0 0 5px rgba(84,199,248,0.8);
        }
        .dp-skip-label {
          font-size: 10px;
          font-weight: 500;
          color: rgba(143,212,255,0.8);
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        /* ── LIVE PILL ── */
        .dp-live {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(3,10,20,0.58);
          border: 1px solid var(--glass-b);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 100px;
          padding: 5px 13px;
        }
        .dp-live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: dp-live-pulse 2s infinite;
        }
        @keyframes dp-live-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.6); }
          70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0);   }
          100% { box-shadow: 0 0 0 0   rgba(34,197,94,0);   }
        }
        .dp-live-text {
          font-size: 10px;
          font-weight: 500;
          color: var(--muted);
          letter-spacing: 1px;
          text-transform: uppercase;
        }
      `}</style>

      <MatchModal visible={isMatch} onClose={() => setIsMatch(false)} user={matchUser} />

      <AdOverlay
        visible={adMode === "AD_THANKS"}
        onContinue={reportAdCompleted}
        skipCount={skipInfo.count}
        threshold={skipInfo.threshold}
        adReady={adReady}
      />

      <div className="dp-root">

        {/* Aurora de fondo */}
        <div className="dp-aurora" />

        {/* Franja tricolor top */}
        <div className="dp-flag" />

        {/* ════════ HEADER ════════ */}
        <header className="dp-header">

          <div className="dp-logo-wrap">
            <span className="dp-logo-t">Turr</span>
            <span className="dp-logo-inder">inder</span>
          </div>

          <div className="dp-header-right">

            <div className={`dp-skips ${skipInfo.remaining <= 2 ? "warn" : ""}`}>
              <div className="dp-pips">
                {Array.from({ length: skipInfo.threshold }).map((_, i) => (
                  <div key={i} className={`dp-pip ${i < skipInfo.count ? "on" : ""}`} />
                ))}
              </div>
              {skipInfo.remaining <= 3 && (
                <span className="dp-skip-label">{skipInfo.remaining} restantes</span>
              )}
            </div>
          </div>
        </header>

        {/* ════════ VIDEO ════════ */}
        <div className="dp-video">
          <VideoPlayer
            room={room}
            matchUser={matchUser}
            onNext={nextUser}
            onLike={likeUser}
            liked={liked}
            searching={searching || !room}
            skipBlocked={isBlocked}
          />
        </div>

      </div>
    </>
  );
}