"use client";

import { useEffect } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";

import { useProfile } from "@/hooks/useProfile";
import { usePresence } from "@/hooks/usePresence";
import { useMatchmaking } from "@/features/matching/useMatchmaking";
import { useMatchUser } from "@/hooks/useMatchUser";
import { useLike } from "@/hooks/Uselike";
import { matchingService } from "@/features/matching/matching.service";

import VideoPlayer from "@/components/video/VideoPlayer";
import MatchModal from "@/components/match/MatchModal";

export default function DiscoverPage() {
  const router = useRouter();

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

  const nextUser = async () => {
    try {
      const currentRoomId = room?.id;
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
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        /* ── Ocupa exactamente el viewport completo ── */
        .discover-root {
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: #04040c;
          overflow: hidden;
          position: relative;
        }

        /* ── Video ocupa TODO el espacio disponible ── */
        .discover-video {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          position: relative;
        }

        /* ── Asegura que nada quede debajo de la barra del sistema ── */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .discover-root {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }

        /* ── Header flotante encima del video ── */
        .discover-header {
          position: absolute;
          top: 0; left: 0; right: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          /* Gradiente descendente para que el header sea legible pero no tape el video */
          background: linear-gradient(
            to bottom,
            rgba(4,4,12,0.75) 0%,
            rgba(4,4,12,0.3)  60%,
            transparent 100%
          );
          pointer-events: none;
        }

        /* ── Logo ── */
        .header-logo {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.5px;
          pointer-events: all;
          line-height: 1;
        }
        /* "Turr" en blanco, "inder" con el degradado del divisor */
        .header-logo-white { color: rgba(255,255,255,0.92); }
        .header-logo-grad {
          background: linear-gradient(135deg, #ff6b35 0%, #ff2d6b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Pill de estado ── */
        .header-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(10px);
          border-radius: 100px;
          padding: 5px 13px;
          pointer-events: all;
        }
        .header-pill-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 7px #22c55e;
          animation: liveBlink 2.5s ease-in-out infinite;
        }
        @keyframes liveBlink { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .header-pill-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.5px;
        }
      `}</style>

      <MatchModal
        visible={isMatch}
        onClose={() => setIsMatch(false)}
        user={matchUser}
      />

      <div className="discover-root">

        {/* Header flotante — vive SOBRE el video, sin ocupar espacio propio */}
        <header className="discover-header">
          <div className="header-logo">
            <span className="header-logo-white">Turr</span>
            <span className="header-logo-grad">inder</span>
          </div>
          <div className="header-pill">
            <div className="header-pill-dot" />
            <span className="header-pill-text">En vivo</span>
          </div>
        </header>

        {/* Video ocupa todo — el header flota encima */}
        <div className="discover-video">
          <VideoPlayer
            room={room}
            matchUser={matchUser}
            onNext={nextUser}
            onLike={likeUser}
            liked={liked}
            searching={searching || !room}
          />
        </div>

      </div>
    </>
  );
}