"use client";

import { useEffect } from "react";

export default function BanModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg,#0a1628,#050f1e)",
          border: "1px solid rgba(239,68,68,0.35)",
          borderRadius: 20,
          padding: "40px 36px",
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 0 60px rgba(239,68,68,0.2)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 28,
          }}
        >
          🚫
        </div>

        <h2
          style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: 22,
            fontWeight: 800,
            color: "#f5f8ff",
            marginBottom: 10,
          }}
        >
          Cuenta suspendida
        </h2>

        <p
          style={{
            color: "rgba(180,215,240,0.55)",
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          Tu cuenta fue suspendida por violar los términos de uso de Turrinder.
          Si creés que es un error, contactanos en nuestra comunidad.
        </p>

        <button
          onClick={() => window.open("https://discord.gg/EEtMngRP9f", "_blank")}
          style={{
            display: "block",
            width: "100%",
            background: "linear-gradient(135deg,#5865f2,#404eed)",
            color: "#fff",
            fontFamily: "'Syne',sans-serif",
            fontWeight: 800,
            fontSize: 14,
            padding: "13px 24px",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          Unirse al Discord 💬
        </button>

        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "1px solid rgba(84,199,248,0.15)",
            borderRadius: 12,
            color: "rgba(143,212,255,0.45)",
            fontSize: 13,
            fontWeight: 500,
            padding: "11px 24px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}