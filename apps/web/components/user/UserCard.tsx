"use client";

import { useState } from "react";

type Props = {
  user: any;
};

export default function UserCard({ user }: Props) {
  const [imgError, setImgError] = useState(false);

  if (!user) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .user-card {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
          background: #111118;
          animation: cardIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .card-photo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }

        .card-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          font-size: 80px;
        }

        /* multi-stop gradient overlay */
        .card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(8,8,16,0.97) 0%,
            rgba(8,8,16,0.75) 30%,
            rgba(8,8,16,0.2) 55%,
            transparent 100%
          );
        }

        /* top fade for readability */
        .card-overlay-top {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 120px;
          background: linear-gradient(to bottom, rgba(8,8,16,0.5), transparent);
        }

        .card-info {
          position: relative;
          z-index: 2;
          padding: 24px 28px 8px;
          width: 100%;
          font-family: 'DM Sans', sans-serif;
        }

        .card-name-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 8px;
        }

        .card-name {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          line-height: 1;
        }

        .card-age {
          font-size: 22px;
          font-weight: 300;
          color: rgba(255,255,255,0.7);
        }

        .card-location {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: rgba(255,255,255,0.45);
          margin-bottom: 14px;
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 4px;
        }

        .card-tag {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 100px;
          padding: 4px 12px;
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          font-weight: 500;
        }

        .online-badge {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 3;
          background: rgba(8,8,16,0.7);
          border: 1px solid rgba(34,197,94,0.3);
          border-radius: 100px;
          padding: 5px 12px 5px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
        }

        .online-badge-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: pulse-g 2s infinite;
        }

        @keyframes pulse-g {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div className="user-card">
        {user.photo && !imgError ? (
          <img
            src={user.photo}
            className="card-photo"
            alt={user.name}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="card-placeholder">👤</div>
        )}

        <div className="card-overlay" />
        <div className="card-overlay-top" />

        <div className="online-badge">
          <div className="online-badge-dot" />
          En línea
        </div>

        <div className="card-info">
          <div className="card-name-row">
            <span className="card-name">{user.name}</span>
            {user.age && <span className="card-age">{user.age}</span>}
          </div>

          {user.location && (
            <div className="card-location">
              📍 {user.location}
            </div>
          )}

          {user.interests && (
            <div className="card-tags">
              {user.interests.slice(0, 4).map((tag: string, i: number) => (
                <span key={i} className="card-tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}