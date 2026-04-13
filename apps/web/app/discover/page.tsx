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

  // 1. Verificación de Autenticación
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/");
    };
    checkUser();
  }, [router]);

  // 2. Hooks de Estado y Presencia (Se ejecutan siempre)
  useProfile();
  usePresence();

  /**
   * 3. Lógica de Matchmaking y Socket
   * Extraemos 'findNewMatch' que es la encargada de reiniciar 
   * el proceso de búsqueda tanto en UI como en el servidor.
   */
  const { room, searching, findNewMatch } = useMatchmaking();
  
  // 4. Datos del Match actual y Lógica de Likes
  const { matchUser } = useMatchUser(room);
  const { likeUser, liked, isMatch, setIsMatch } = useLike(room);

  /**
   * nextUser: Gestiona la transición al siguiente usuario.
   * Prioriza la fluidez de la interfaz (Radar inmediato).
   */
  const nextUser = async () => {
    try {
      console.log("⏭️ Saltando al siguiente usuario...");

      // A. Guardamos referencia del room actual para limpiar DB después
      const currentRoomId = room?.id;

      /**
       * B. REINICIO DE BÚSQUEDA
       * Llamamos a la función maestra del hook que:
       * 1. Setea room a null.
       * 2. Activa el estado 'searching'.
       * 3. Emite 'find-match' al servidor.
       */
      findNewMatch();

      // C. LIMPIEZA EN DB (Background)
      if (currentRoomId) {
        matchingService.endRoom(currentRoomId).catch(err => 
          console.error("Error silencioso limpiando room en DB:", err)
        );
      }

    } catch (error) {
      console.error("❌ Fallo crítico en el flujo de Next:", error);
      // Recargamos solo si el estado se rompe, aunque findNewMatch es más seguro
      window.location.reload();
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .discover-root {
          height: calc(100dvh - 64px); 
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
            // Muestra el radar si está buscando o si todavía no hay una sala asignada
            searching={searching || !room}
          />
        </div>
      </div>
    </>
  );
}