"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { supabase } from "@/services/supabase.client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

// ─── Singleton a nivel de módulo ─────────────────────────────────────────────
let _socket: Socket | null = null;
let _initPromise: Promise<Socket | null> | null = null;

async function getOrCreateSocket(): Promise<Socket | null> {
  if (_socket?.connected) return _socket;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.warn("⚠️ Sin sesión autenticada.");
      _initPromise = null;
      return null;
    }

    if (_socket?.connected) {
      _initPromise = null;
      return _socket;
    }
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }

    const s = io(SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      auth: { token: session.access_token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on("connect", () => console.log("🟢 Socket conectado:", s.id));

    s.on("connect_error", (err) => {
      console.error("❌ Error socket:", err.message);
      if (err.message.includes("AUTH_")) {
        _socket = null;
        _initPromise = null;
      }
    });

    s.on("disconnect", (reason) => {
      console.log("🔴 Socket desconectado:", reason);
      if (["io server disconnect", "io client disconnect"].includes(reason)) {
        _socket = null;
        _initPromise = null;
      }
    });

    _socket = s;
    _initPromise = null;
    return s;
  })();

  return _initPromise;
}

// ─── Reconexión automática cuando Supabase refresca el token ─────────────────
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED" && session?.access_token && _socket) {
      console.log("[useSocket] 🔄 Token refrescado, reconectando socket...");
      _socket.auth = { token: session.access_token };
      _socket.disconnect();
      _socket = null;
      _initPromise = null;
    }
    if (event === "SIGNED_OUT") {
      _socket?.disconnect();
      _socket = null;
      _initPromise = null;
    }
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
interface UseSocketResult {
  socket: Socket | null;
  connectCount: number;
}

export const useSocket = (skip = false): UseSocketResult => {
  const [socket, setSocket] = useState<Socket | null>(
    _socket?.connected ? _socket : null
  );
  const [connectCount, setConnectCount] = useState(
    _socket?.connected ? 1 : 0
  );
  const listenersRef = useRef<{
    onConnect: () => void;
    onDisconnect: () => void;
    socket: Socket;
  } | null>(null);

  useEffect(() => {
    if (skip) return; // ← invitado: no conectar

    let active = true;

    getOrCreateSocket().then((s) => {
      if (!active || !s) return;

      if (s.connected) {
        setSocket(s);
        setConnectCount((c) => (c === 0 ? 1 : c));
      }

      const onConnect = () => {
        if (!active) return;
        setSocket(s);
        setConnectCount((c) => c + 1);
      };

      const onDisconnect = () => {
        if (!active) return;
        setSocket(null);
      };

      listenersRef.current = { onConnect, onDisconnect, socket: s };
      s.on("connect", onConnect);
      s.on("disconnect", onDisconnect);
    });

    return () => {
      active = false;
      if (listenersRef.current) {
        const { socket: s, onConnect, onDisconnect } = listenersRef.current;
        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);
        listenersRef.current = null;
      }
    };
  }, [skip]); // ← skip como dependencia

  return { socket, connectCount };
};