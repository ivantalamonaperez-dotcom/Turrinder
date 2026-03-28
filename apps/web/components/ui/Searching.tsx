"use client";

export default function Searching() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400&display=swap');

        .searching-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #080810;
          color: white;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
          gap: 0;
        }

        .s-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
        }
        .s-orb-1 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #ff2d6b22, transparent 70%);
          top: -100px; left: -100px;
          animation: s-float 6s ease-in-out infinite;
        }
        .s-orb-2 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, #7c3aed22, transparent 70%);
          bottom: -80px; right: -80px;
          animation: s-float 8s ease-in-out infinite reverse;
        }

        @keyframes s-float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 30px); }
        }

        .radar {
          position: relative;
          width: 180px; height: 180px;
          margin-bottom: 48px;
        }

        .radar-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255,45,107,0.3);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: radar-expand 2.5s ease-out infinite;
        }

        .radar-ring:nth-child(2) { animation-delay: 0.83s; }
        .radar-ring:nth-child(3) { animation-delay: 1.66s; }

        @keyframes radar-expand {
          0%   { width: 40px;  height: 40px;  opacity: 0.8; border-color: rgba(255,45,107,0.6); }
          100% { width: 180px; height: 180px; opacity: 0;   border-color: rgba(255,45,107,0); }
        }

        .radar-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 52px; height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          box-shadow: 0 0 30px rgba(255,45,107,0.5);
          animation: center-pulse 2.5s ease-in-out infinite;
        }

        @keyframes center-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,45,107,0.4); }
          50%       { box-shadow: 0 0 50px rgba(255,45,107,0.7); }
        }

        .searching-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.3px;
          margin-bottom: 10px;
        }

        .searching-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.35);
          text-align: center;
          max-width: 260px;
          line-height: 1.6;
        }

        .dots {
          display: inline-flex;
          gap: 5px;
          margin-top: 28px;
        }

        .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #ff2d6b;
          animation: dot-bounce 1.2s ease-in-out infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>

      <div className="searching-root">
        <div className="s-orb s-orb-1" />
        <div className="s-orb s-orb-2" />

        <div className="radar">
          <div className="radar-ring" />
          <div className="radar-ring" />
          <div className="radar-ring" />
          <div className="radar-center">🔥</div>
        </div>

        <div className="searching-title">Buscando personas...</div>
        <p className="searching-sub">Conectando con alguien de todo el mundo</p>

        <div className="dots">
          <div className="dot" />
          <div className="dot" />
          <div className="dot" />
        </div>
      </div>
    </>
  );
}