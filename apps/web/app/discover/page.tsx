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

  const { adMode, skipInfo, isBlocked, adReady, reportAdCompleted } = useAd();

  const nextUser = useCallback(async () => {
    if (!socket || isBlocked) return;
    try {
      const currentRoomId = room?.id;
      socket.emit("skip");
      if (currentRoomId) {
        matchingService.endRoom(currentRoomId).catch(err =>
          console.error("Error limpiando room:", err)
        );
      }
    } catch (error) {
      console.error("❌ Error en nextUser:", error);
      window.location.reload();
    }
  }, [socket, room, isBlocked]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');
        .discover-root{height:100vh;display:flex;flex-direction:column;background:#04040c;overflow:hidden;position:relative;}
        .discover-video{flex:1;min-height:0;overflow:hidden;position:relative;}
        .discover-header{position:absolute;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:linear-gradient(to bottom,rgba(4,4,12,0.75) 0%,rgba(4,4,12,0.3) 60%,transparent 100%);pointer-events:none;}
        .header-logo{font-family:'Syne',sans-serif;font-size:18px;font-weight:900;letter-spacing:-0.5px;pointer-events:all;}
        .header-logo-white{color:rgba(255,255,255,0.92);}
        .header-logo-grad{background:linear-gradient(135deg,#ff6b35,#ff2d6b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .header-right{display:flex;align-items:center;gap:10px;pointer-events:all;}
        .header-pill{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(10px);border-radius:100px;padding:5px 13px;}
        .header-pill-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 7px #22c55e;animation:liveBlink 2.5s ease-in-out infinite;}
        @keyframes liveBlink{0%,100%{opacity:1}50%{opacity:0.35}}
        .header-pill-text{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;color:rgba(255,255,255,0.55);letter-spacing:0.5px;}
        .skip-counter{display:flex;align-items:center;gap:6px;background:rgba(255,45,107,0.08);border:1px solid rgba(255,45,107,0.18);backdrop-filter:blur(10px);border-radius:100px;padding:5px 12px;font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:0.5px;transition:all 0.3s ease;}
        .skip-counter.warning{background:rgba(255,45,107,0.15);border-color:rgba(255,45,107,0.35);color:rgba(255,100,130,0.9);}
        .skip-counter-bar{display:flex;gap:2px;align-items:center;}
        .skip-dot{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.15);transition:background 0.3s ease;}
        .skip-dot.filled{background:#ff2d6b;box-shadow:0 0 4px rgba(255,45,107,0.7);}
      `}</style>

      <MatchModal visible={isMatch} onClose={() => setIsMatch(false)} user={matchUser} />

      <AdOverlay
        visible={adMode === "AD_MODE"}
        onContinue={reportAdCompleted}
        skipCount={skipInfo.count}
        threshold={skipInfo.threshold}
        adReady={adReady}
      />

      <div className="discover-root">
        <header className="discover-header">
          <div className="header-logo">
            <span className="header-logo-white">Turr</span>
            <span className="header-logo-grad">inder</span>
          </div>
          <div className="header-right">
            <div className={`skip-counter ${skipInfo.remaining <= 2 ? "warning" : ""}`}>
              <div className="skip-counter-bar">
                {Array.from({ length: skipInfo.threshold }).map((_, i) => (
                  <div key={i} className={`skip-dot ${i < skipInfo.count ? "filled" : ""}`} />
                ))}
              </div>
              {skipInfo.remaining <= 3 && <span>{skipInfo.remaining} restantes</span>}
            </div>
            <div className="header-pill">
              <div className="header-pill-dot" />
              <span className="header-pill-text">En vivo</span>
            </div>
          </div>
        </header>

        <div className="discover-video">
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