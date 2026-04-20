"use client";

/**
 * /modalidades/ligues/page.tsx
 *
 * Modalidad "Ligues" — igual que discover pero con los 3 botones:
 * like, skip y modo streamer. Incluye MatchModal.
 */

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

export default function LiguesPage() {
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

        .lp-root {
          --sky:       #54c7f8;
          --sky2:      #3b9eda;
          --sky3:      #1a6fa8;
          --white-arg: #f5f8ff;
          --bg:        #030a14;
          --glass-b:   rgba(84,199,248,0.12);
          --muted:     rgba(180,215,240,0.45);
        }

        .lp-root {
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          overflow: hidden;
          position: relative;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .lp-aurora {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 75% 40% at 10% 0%,   rgba(84,199,248,0.13) 0%, transparent 60%),
            radial-gradient(ellipse 55% 35% at 90% 100%,  rgba(59,158,218,0.10) 0%, transparent 58%),
            radial-gradient(ellipse 40% 30% at 70% 10%,   rgba(26,111,168,0.08) 0%, transparent 55%);
          animation: lp-aurora 20s ease-in-out infinite alternate;
        }
        @keyframes lp-aurora {
          0%   { opacity:.7;  transform:scale(1) rotate(0deg); }
          50%  { opacity:1;   transform:scale(1.04) rotate(0.3deg); }
          100% { opacity:.85; transform:scale(1.07) rotate(-0.2deg); }
        }

        .lp-flag {
          position: absolute; top:0; left:0; right:0; height:3px;
          background: linear-gradient(90deg,
            var(--sky) 0%, var(--sky) 33%,
            rgba(245,248,255,0.85) 33%, rgba(245,248,255,0.85) 66%,
            var(--sky) 66%, var(--sky) 100%);
          z-index: 60; opacity: 0.65;
        }

        .lp-video {
          flex: 1; min-height: 0;
          overflow: hidden; position: relative; z-index: 1;
        }

        /* ── Header flotante ── */
        .lp-header {
          position: absolute;
          top: 3px; left: 0; right: 0;
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

        .lp-logo-wrap {
          position: relative; pointer-events: all;
          user-select: none; display: flex; align-items: baseline;
        }
        .lp-logo-t {
          font-family:'Syne',sans-serif; font-size:19px; font-weight:900;
          letter-spacing:-0.8px; color:var(--white-arg); line-height:1;
        }
        .lp-logo-inder {
          font-family:'Syne',sans-serif; font-size:19px; font-weight:900;
          letter-spacing:-0.8px; line-height:1;
          background:linear-gradient(120deg, var(--sky) 0%, #a8e6ff 55%, var(--sky2) 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .lp-logo-wrap::after {
          content:''; position:absolute; bottom:-4px; left:0;
          width:100%; height:1.5px;
          background:linear-gradient(90deg, var(--sky), var(--sky2));
          border-radius:2px; opacity:0.4;
        }

        .lp-header-right {
          display: flex; align-items: center; gap: 7px; pointer-events: all;
        }

        /* Skip counter */
        .lp-skips {
          display: flex; align-items: center; gap: 7px;
          background: rgba(3,10,20,0.58); border: 1px solid var(--glass-b);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border-radius: 100px; padding: 5px 12px;
          transition: border-color 0.3s ease, background 0.3s ease;
        }
        .lp-skips.warn {
          border-color: rgba(84,199,248,0.42);
          background: rgba(84,199,248,0.08);
          animation: lp-warn 0.45s ease;
        }
        @keyframes lp-warn { 0%,100%{transform:none} 35%{transform:scale(1.07)} }
        .lp-pips { display:flex; gap:3px; align-items:center; }
        .lp-pip {
          width:5px; height:5px; border-radius:50%;
          background:rgba(84,199,248,0.14);
          transition:background 0.25s ease, box-shadow 0.25s ease;
        }
        .lp-pip.on { background:var(--sky); box-shadow:0 0 5px rgba(84,199,248,0.8); }
        .lp-skip-label {
          font-size:10px; font-weight:500; color:rgba(143,212,255,0.8);
          letter-spacing:0.5px; white-space:nowrap;
        }

        /* Back pill */
        .lp-back {
          display:flex; align-items:center; gap:6px;
          background:rgba(3,10,20,0.58); border:1px solid var(--glass-b);
          backdrop-filter:blur(16px); border-radius:100px; padding:5px 12px;
          color:var(--muted); font-size:10px; font-weight:500; letter-spacing:0.5px;
          cursor:pointer; transition:color 0.2s, background 0.2s;
          -webkit-tap-highlight-color:transparent;
          pointer-events:all;
        }
        .lp-back:hover { color:var(--sky); background:rgba(84,199,248,0.08); }
      `}</style>

      {/* Modals */}
      <MatchModal visible={isMatch} onClose={() => setIsMatch(false)} user={matchUser} />
      <AdOverlay
        visible={adMode === "AD_THANKS"}
        onContinue={reportAdCompleted}
        skipCount={skipInfo.count}
        threshold={skipInfo.threshold}
        adReady={adReady}
      />

      <div className="lp-root">
        <div className="lp-aurora" />
        <div className="lp-flag" />

        {/* Header flotante sobre el video */}
        <header className="lp-header">
          <div className="lp-logo-wrap">
            <span className="lp-logo-t">Turr</span>
            <span className="lp-logo-inder">inder</span>
          </div>

          <div className="lp-header-right">
            <div className={`lp-skips ${skipInfo.remaining <= 2 ? "warn" : ""}`}>
              <div className="lp-pips">
                {Array.from({ length: skipInfo.threshold }).map((_, i) => (
                  <div key={i} className={`lp-pip ${i < skipInfo.count ? "on" : ""}`} />
                ))}
              </div>
              {skipInfo.remaining <= 3 && (
                <span className="lp-skip-label">{skipInfo.remaining} restantes</span>
              )}
            </div>

            <button className="lp-back" onClick={() => window.history.back()}>
              ← Modalidades
            </button>
          </div>
        </header>

        {/* VideoPlayer — con los 3 botones por defecto (VideoControls interno) */}
        <div className="lp-video">
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