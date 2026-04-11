"use client";

import { useEffect } from "react";
import { supabase } from "@/services/supabase.client";
import { useRouter } from "next/navigation";

import { useProfile } from "@/hooks/useProfile";
import { usePresence } from "@/hooks/usePresence";
import { useMatchmaking } from "@/features/matching/useMatchmaking";
import { useMatchUser } from "@/hooks/useMatchUser";
import { useLike } from "@/hooks/Uselike";

import VideoPlayer from "@/components/video/VideoPlayer";
import MatchModal from "@/components/match/MatchModal";

export default function DiscoverPage() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/");
    };
    check();
  }, []);

  useProfile();
  usePresence();

  const { room, searching } = useMatchmaking();
  const { matchUser } = useMatchUser(room);
  const { likeUser, liked, isMatch, setIsMatch } = useLike(room);

  const nextUser = async () => {
    if (!room) return;

    // Limpiar signals y marcar room como terminada
    // El realtime + polling notifica al otro usuario automáticamente
    await supabase.from("signals").delete().eq("room_id", room.id);
    await supabase.from("rooms").update({ ended: true }).eq("id", room.id);

    // Esperar a que el realtime notifique al otro antes de recargar
    await new Promise((res) => setTimeout(res, 300));
    window.location.reload();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .discover-root {
          height: calc(100vh - 64px);
          display: flex;
          flex-direction: column;
          background: #07070f;
          overflow: hidden;
          position: relative;
        }

        .discover-header {
          position: absolute;
          top: 0; left: 0; right: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: linear-gradient(to bottom, rgba(7,7,15,0.8) 0%, transparent 100%);
          pointer-events: none;
        }

        .header-logo {
          font-family: 'Syne', sans-serif;
          font-size: 17px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          pointer-events: all;
        }

        .header-logo span {
          background: linear-gradient(135deg, #ff2d6b, #ff6b35);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .online-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 100px;
          padding: 4px 11px;
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          font-family: 'DM Sans', sans-serif;
          pointer-events: all;
        }

        .online-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
        }

        .discover-video {
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
      `}</style>

      <MatchModal
        visible={isMatch}
        onClose={() => setIsMatch(false)}
        user={matchUser}
      />

      <div className="discover-root">
        <header className="discover-header">
          <div className="header-logo">Turr<span>inder</span></div>
          <div className="online-pill">
            <div className="online-dot" />
            En vivo
          </div>
        </header>

        <div className="discover-video">
          <VideoPlayer
            room={room}
            matchUser={matchUser}
            onNext={nextUser}
            onLike={likeUser}
            liked={liked}
            searching={searching}
          />
        </div>
      </div>
    </>
  );
}