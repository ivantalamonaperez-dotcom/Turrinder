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
import Controls from "@/components/video/Controls";
import Searching from "@/components/ui/Searching";
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

    // ✅ Limpiar señales WebRTC de la room antes de terminarla
    await supabase.from("signals").delete().eq("room_id", room.id);

    await supabase.from("rooms").update({ ended: true }).eq("id", room.id);

    await new Promise((res) => setTimeout(res, 300));
    window.location.reload();
  };

  if (searching || !room) {
    return <Searching />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .discover-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #080810;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .discover-header {
          position: absolute;
          top: 0; left: 0; right: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background: linear-gradient(to bottom, rgba(8,8,16,0.9) 0%, transparent 100%);
        }

        .header-logo {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: white;
        }

        .header-logo span {
          background: linear-gradient(135deg, #ff2d6b, #ff6b35);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .online-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(255,255,255,0.06);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 13px;
          color: rgba(255,255,255,0.7);
        }

        .online-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
        }

        .profile-btn {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }

        .video-area {
          flex: 1;
          position: relative;
          min-height: 0;        /* ✅ fix flexbox para que no crezca infinito */
          overflow: hidden;     /* ✅ contener el video dentro del área */
        }

        .controls-area {
          position: relative;
          z-index: 10;
          background: linear-gradient(to top, rgba(8,8,16,1) 60%, transparent 100%);
          padding-top: 20px;
          flex-shrink: 0;       /* ✅ los controles nunca se comprimen */
        }

        .match-info {
          position: absolute;
          bottom: 110px;
          left: 20px;
          color: white;
          font-size: 18px;
          font-weight: 600;
          background: rgba(0,0,0,0.5);
          padding: 10px 16px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          z-index: 20;
        }
      `}</style>

      <MatchModal
        visible={isMatch}
        onClose={() => setIsMatch(false)}
        user={matchUser}
      />

      <div className="discover-root">
        <header className="discover-header">
          <div className="header-logo">
            Turr<span>inder</span>
          </div>

          <div className="online-pill">
            <div className="online-dot" />
            En vivo
          </div>

          <button
            className="profile-btn"
            onClick={() => router.push("/profile")}
          >
            👤
          </button>
        </header>

        <div className="video-area">
          <VideoPlayer room={room} />

          {matchUser && (
            <div className="match-info">
              {matchUser.name}, {matchUser.age}
            </div>
          )}
        </div>

        <div className="controls-area">
          <Controls onNext={nextUser} onLike={likeUser} liked={liked} />
        </div>
      </div>
    </>
  );
}