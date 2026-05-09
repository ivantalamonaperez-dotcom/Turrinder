"use client";

/**
 * useSocket — SINGLETON + CONTADOR DE CONEXIONES + AUTH SEGURA
 *
 * CAMBIOS DE SEGURIDAD:
 *   - El userId ya NO se manda en el query (era fácil de suplantar).
 *   - Ahora se manda el access_token de Supabase en socket.auth.token.
 *   - El servidor verifica el token con Supabase y extrae el userId real.
 *   - Si el token expira, el socket se reconecta automáticamente con el
 *     token nuevo gracias al evento onTokenRefreshed de Supabase.
 */

import { useEffect, useState } from "react";
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
    // Obtener sesión completa (necesitamos el access_token, no solo el user)
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.warn("⚠️ Sin sesión autenticada.");
      _initPromise = null;
      return null;
    }

    // Chequeo post-await (StrictMode puede haber creado uno ya)
    if (_socket?.connected) { _initPromise = null; return _socket; }
    if (_socket) { _socket.disconnect(); _socket = null; }

    const s = io(SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      // ✅ Token en auth (no en query) — el servidor lo verifica con Supabase
      auth: { token: session.access_token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on("connect", () =>
      console.log("🟢 Socket conectado:", s.id)
    );

    s.on("connect_error", (err) => {
      console.error("❌ Error socket:", err.message);
      // Si el error es de auth, limpiar para forzar re-init con token nuevo
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
// Cuando el JWT expira, Supabase emite onAuthStateChange con el token nuevo.
// Reconectamos el socket con el token fresco para que el servidor lo revalide.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED" && session?.access_token && _socket) {
      console.log("[useSocket] 🔄 Token refrescado, reconectando socket...");
      _socket.auth = { token: session.access_token };
      _socket.disconnect();
      _socket = null;
      _initPromise = null;
      // El hook se encargará de reconectar en el próximo render
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
  /** Incrementa cada vez que el socket emite "connect". Úsalo como
   *  dependencia de useEffect para reaccionar a reconexiones. */
  connectCount: number;
}

export const useSocket = (): UseSocketResult => {
  const [socket, setSocket] = useState<Socket | null>(
    _socket?.connected ? _socket : null
  );
  // Empieza en 1 si ya hay socket conectado (evita búsqueda doble al montar)
  const [connectCount, setConnectCount] = useState(
    _socket?.connected ? 1 : 0
  );

  useEffect(() => {
    let active = true;

    getOrCreateSocket().then((s) => {
      if (!active || !s) return;

      // Si ya estaba conectado al momento de resolver, actualizar estado
      if (s.connected) {
        setSocket(s);
        setConnectCount((c) => (c === 0 ? 1 : c));
      }

      const onConnect = () => {
        if (!active) return;
        console.log("[useSocket] onConnect →", s.id);
        setSocket(s);
        setConnectCount((c) => c + 1);
      };

      const onDisconnect = () => {
        if (!active) return;
        setSocket(null);
      };

      s.on("connect", onConnect);
      s.on("disconnect", onDisconnect);

      return () => {
        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);
      };
    });

    return () => { active = false; };
  }, []);

  return { socket, connectCount };
};