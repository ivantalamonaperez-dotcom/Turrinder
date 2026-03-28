"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: number;
  text: string;
  mine: boolean;
  time: string;
}

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: "¡Hola! Me encantó tu perfil 🔥", mine: false, time: "10:23" },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const now = () => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), text: input, mine: true, time: now() }]);
    setInput("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .chat-root {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #080810;
          font-family: 'DM Sans', sans-serif;
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .chat-avatar {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .chat-user-info { flex: 1; }

        .chat-user-name {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: white;
        }

        .chat-user-status {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          margin-top: 1px;
        }

        .status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .msg-row {
          display: flex;
          animation: msg-in 0.25s ease-out;
        }

        @keyframes msg-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .msg-row.mine { justify-content: flex-end; }
        .msg-row.theirs { justify-content: flex-start; }

        .msg-bubble {
          max-width: 72%;
          padding: 10px 14px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.5;
          position: relative;
        }

        .msg-bubble.mine {
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .msg-bubble.theirs {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.85);
          border-bottom-left-radius: 4px;
        }

        .msg-time {
          font-size: 10px;
          opacity: 0.5;
          margin-top: 4px;
          text-align: right;
        }

        .chat-input-area {
          padding: 12px 16px;
          background: rgba(255,255,255,0.02);
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }

        .chat-input {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 22px;
          padding: 11px 18px;
          font-size: 14px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          resize: none;
          transition: border-color 0.2s;
          max-height: 120px;
        }

        .chat-input::placeholder { color: rgba(255,255,255,0.25); }

        .chat-input:focus {
          border-color: rgba(255,45,107,0.4);
          background: rgba(255,45,107,0.04);
        }

        .send-btn {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #ff2d6b, #c9193e);
          color: white;
          font-size: 16px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(255,45,107,0.3);
        }

        .send-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(255,45,107,0.5);
        }

        .send-btn:active { transform: scale(0.95); }
      `}</style>

      <div className="chat-root">
        <div className="chat-header">
          <div className="chat-avatar">👤</div>
          <div className="chat-user-info">
            <div className="chat-user-name">Match</div>
            <div className="chat-user-status">
              <div className="status-dot" />
              En línea ahora
            </div>
          </div>
        </div>

        <div className="messages-area">
          {messages.map((msg) => (
            <div key={msg.id} className={`msg-row ${msg.mine ? "mine" : "theirs"}`}>
              <div className={`msg-bubble ${msg.mine ? "mine" : "theirs"}`}>
                {msg.text}
                <div className="msg-time">{msg.time}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          <input
            className="chat-input"
            placeholder="Escribí un mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="send-btn" onClick={send}>
            ➤
          </button>
        </div>
      </div>
    </>
  );
}