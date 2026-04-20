"use client";

import { useEffect, useCallback, useState } from "react";
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

  const [authState, setAuthState] = useState<"loading" | "authenticated" | "guest">("loading");

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setAuthState("authenticated");
      } else {
        setAuthState("guest");
      }
    };
    checkUser();
  }, []);

  useProfile();
  usePresence();

  const { room, searching, findNewMatch } = useMatchmaking();
  const { matchUser } = useMatchUser(room);
  const { likeUser, liked, isMatch, setIsMatch } = useLike(room);
  const { adMode, skipInfo, isBlocked, reportSkip, reportAdCompleted } = useAd();

  const nextUser = useCallback(async () => {
    if (isBlocked) return;
    try {
      reportSkip();
      const currentRoomId = room?.id;
      if (socket) socket.emit("skip");
      if (currentRoomId) {
        matchingService.endRoom(currentRoomId).catch(err =>
          console.error("Error limpiando room:", err)
        );
      }
    } catch (error) {
      console.error("❌ Error en nextUser:", error);
      window.location.reload();
    }
  }, [socket, room, isBlocked, reportSkip]);

  if (authState === "loading") {
    return (
      <div style={{
        height: "100vh",
        background: "#04040c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.35)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14,
        letterSpacing: "0.5px",
      }}>
        Cargando...
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');

        .discover-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #04040c;
          overflow: hidden;
          position: relative;
        }

        .discover-video {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          position: relative;
        }

        .discover-header {
          position: absolute;
          top: 0; left: 0; right: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: linear-gradient(
            to bottom,
            rgba(4,4,12,0.75) 0%,
            rgba(4,4,12,0.3) 60%,
            transparent 100%
          );
          pointer-events: none;
        }

        .header-logo {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.5px;
          pointer-events: all;
          cursor: pointer;
          background: transparent;
          border: none;
          box-shadow: none;
          backdrop-filter: none;
          padding: 0;
        }
        .header-logo-white {
          color: rgba(255,255,255,0.92);
        }
        .header-logo-grad {
          background: linear-gradient(120deg, #54c7f8 0%, #a8e6ff 55%, #3b9eda 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
          pointer-events: all;
        }

        .header-pill-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 7px #22c55e;
          animation: liveBlink 2.5s ease-in-out infinite;
        }
        @keyframes liveBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .header-pill-text {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.5px;
        }

        /* Skip counter: no ocupa espacio cuando está oculto */
        .skip-counter {
          width: 0;
          padding: 0;
          overflow: hidden;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          color: transparent;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
          border-radius: 100px;
        }
        /* Cuando quedan pocos skips, aparece */
        .skip-counter.warning {
          width: auto;
          padding: 5px 12px;
          overflow: visible;
          background: transparent;
          border: none;
          color: rgba(143,212,255,0.95);
        }
        .skip-counter-bar { display: flex; gap: 2px; align-items: center; }
        .skip-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: transparent;
          transition: background 0.3s ease;
        }
        .skip-dot.filled {
          background: transparent;
          box-shadow: none;
        }

        /* Badge invitado */
        .guest-badge {
          display: flex;
          align-items: center;
          background: rgba(84,199,248,0.06);
          border: 1px solid rgba(84,199,248,0.18);
          backdrop-filter: blur(10px);
          border-radius: 100px;
          padding: 5px 13px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: rgba(143,212,255,0.65);
          letter-spacing: 0.4px;
          cursor: pointer;
          pointer-events: all;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .guest-badge:hover {
          background: rgba(84,199,248,0.13);
          border-color: rgba(84,199,248,0.35);
          color: rgba(143,212,255,0.95);
        }

        /* Badge usuario autenticado */
        .user-badge {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(84,199,248,0.07);
          border: 1px solid rgba(84,199,248,0.18);
          backdrop-filter: blur(10px);
          border-radius: 100px;
          padding: 5px 13px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: rgba(143,212,255,0.75);
          letter-spacing: 0.4px;
          white-space: nowrap;
        }
        .user-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #54c7f8;
          box-shadow: 0 0 5px rgba(84,199,248,0.8);
          flex-shrink: 0;
        }
      `}</style>

      {authState === "authenticated" && (
        <MatchModal
          visible={isMatch}
          onClose={() => setIsMatch(false)}
          user={matchUser}
        />
      )}

      <AdOverlay
        visible={adMode === "AD_MODE"}
        onContinue={reportAdCompleted}
        skipCount={skipInfo.count}
        threshold={skipInfo.threshold}
      />

      <div className="discover-root">
        <header className="discover-header">
          <div className="header-logo" onClick={() => router.push("/")}>
            <span className="header-logo-white">Turr</span>
            <span className="header-logo-grad">inder</span>
          </div>

          <div className="header-right">
            {authState === "guest" ? (
              <div
                className="guest-badge"
                onClick={() => router.push("/")}
                title="Creá una cuenta para tener más beneficios"
              >
                Invitado · Crear cuenta
              </div>
            ) : (
              <div className="user-badge">
                <div className="user-dot" />
                Conectado
              </div>
            )}

            <div className={`skip-counter ${skipInfo.remaining <= 2 ? "warning" : ""}`}>
              <div className="skip-counter-bar">
                {Array.from({ length: skipInfo.threshold }).map((_, i) => (
                  <div
                    key={i}
                    className={`skip-dot ${i < skipInfo.count ? "filled" : ""}`}
                  />
                ))}
              </div>
              {skipInfo.remaining <= 3 && (
                <span>{skipInfo.remaining} restantes</span>
              )}
            </div>
          </div>
        </header>

        <div className="discover-video">
          <VideoPlayer
            room={room}
            matchUser={matchUser}
            onNext={nextUser}
            onLike={authState === "authenticated" ? likeUser : undefined}
            liked={liked}
            searching={searching || !room}
            skipBlocked={isBlocked}
          />
        </div>
      </div>
    </>
  );
}