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
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/");
    };
    check();
  }, [router]);

  // Hooks de contexto y presencia
  useProfile();
  usePresence();

  /**
   * NOTA: Asegúrate de que useMatchmaking devuelva 'setRoom' 
   * en su bloque de 'return'.
   */
  const { room, searching, setRoom } = useMatchmaking();
  
  // Obtenemos los datos del usuario con el que estamos conectados
  const { matchUser } = useMatchUser(room);
  const { likeUser, liked, isMatch, setIsMatch } = useLike(room);

  const nextUser = async () => {
    try {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) return;

      console.log("⏭️ Intentando saltar al siguiente usuario...");

      if (room && room.id) {
        // 1. Limpieza en Base de Datos
        await matchingService.endRoom(room.id);
      }
      
      // 2. Limpieza en el Cliente
      // Esto dispara el useEffect de useMatchmaking para buscar nuevo match
      if (typeof setRoom === "function") {
        setRoom(null);
      } else {
        console.warn("⚠️ setRoom no está definido en useMatchmaking. Recargando...");
        window.location.reload();
      }

    } catch (error) {
      console.error("❌ Error al pasar de usuario:", error);
      window.location.reload();
    }
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
          background: linear-gradient(135deg, #22c55e, #16a34a);
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