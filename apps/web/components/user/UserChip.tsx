"use client";

/**
 * UserChip — Chip clicable con avatar + nombre/edad/estado.
 * Al hacer click abre UserProfileModal con el perfil completo.
 *
 * USO:
 *   <UserChip user={matchUser} isConnected={isConnected} />
 *
 * Compatible con el matchUser que ya viene de useMatchUser(room).
 */

import { useState } from "react";
import UserProfileModal from "./UserProfileModal";

export interface MatchUserProfile {
  id?: string;
  name?: string;
  age?: number;
  avatar_url?: string;
  bio?: string;
  photos?: string[];
  interests?: string[];
  looking_for?: string[];
  gender?: string;
  role?: "viewer" | "vip" | "streamer";
}

interface Props {
  user: MatchUserProfile | null;
  isConnected?: boolean;
  /** Clase extra para posicionamiento desde el padre */
  className?: string;
  style?: React.CSSProperties;
}

export default function UserChip({ user, isConnected = false, className = "", style }: Props) {
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initials = user.name?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .uc-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px 5px 5px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-radius: 100px;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
          font-family: 'DM Sans', sans-serif;
          user-select: none;
          max-width: 200px;
        }
        .uc-chip:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,45,107,0.35);
          transform: scale(1.03);
        }
        .uc-chip:active {
          transform: scale(0.97);
        }

        /* Avatar */
        .uc-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 1.5px solid rgba(255,45,107,0.4);
        }
        .uc-avatar-ph {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d6b22, #ff6b3522);
          border: 1.5px solid rgba(255,45,107,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,100,130,0.9);
          flex-shrink: 0;
          font-family: 'Syne', sans-serif;
        }

        /* Info */
        .uc-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .uc-name {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.88);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
        .uc-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          color: rgba(255,255,255,0.38);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .uc-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .uc-dot-connected {
          background: #22c55e;
          box-shadow: 0 0 5px #22c55e;
          animation: ucBlink 2s infinite;
        }
        .uc-dot-waiting {
          background: rgba(255,255,255,0.25);
        }
        @keyframes ucBlink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }

        /* Flecha */
        .uc-arrow {
          width: 12px;
          height: 12px;
          opacity: 0.3;
          flex-shrink: 0;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .uc-chip:hover .uc-arrow {
          opacity: 0.7;
          transform: translateX(2px);
        }
      `}</style>

      <button
        className={`uc-chip ${className}`}
        style={style}
        onClick={() => setOpen(true)}
        title={`Ver perfil de ${user.name}`}
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.name} className="uc-avatar" />
        ) : (
          <div className="uc-avatar-ph">{initials}</div>
        )}

        <div className="uc-info">
          <div className="uc-name">
            {user.name}{user.age ? `, ${user.age}` : ""}
          </div>
          <div className="uc-status">
            <div className={`uc-dot ${isConnected ? "uc-dot-connected" : "uc-dot-waiting"}`} />
            {isConnected ? "En vivo" : "Conectando"}
          </div>
        </div>

        {/* Chevron derecha */}
        <svg className="uc-arrow" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4,2 8,6 4,10" />
        </svg>
      </button>

      <UserProfileModal
        user={user}
        isConnected={isConnected}
        visible={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}