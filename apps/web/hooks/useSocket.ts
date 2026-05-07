"use client";

/**
 * useSocket — SINGLETON + CONTADOR DE CONEXIONES
 *
 * PROBLEMA RAÍZ (esta iteración):
 *   El disparador automático de useMatchmaking dependía de `socket?.connected`.
 *   Cuando el socket reconectaba, ese valor ya era `true` desde antes,
 *   React no detectaba cambio → el useEffect no se re-ejecutaba → nunca
 *   se emitía "find-match".
 *
 * SOLUCIÓN:
 *   Exportamos `connectCount`: un número que incrementa cada vez que el
 *   socket emite "connect". React sí detecta el cambio de número, y
 *   useMatchmaking puede usarlo como dependencia para disparar find-match.
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("⚠️ Sin usuario autenticado.");
      _initPromise = null;
      return null;
    }

    // Chequeo post-await (StrictMode puede haber creado uno ya)
    if (_socket?.connected) { _initPromise = null; return _socket; }
    if (_socket) { _socket.disconnect(); _socket = null; }

    const s = io(SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      query: { userId: user.id },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on("connect", () =>
      console.log("🟢 Socket conectado:", s.id, "| UUID:", user.id)
    );
    s.on("connect_error", (err) =>
      console.error("❌ Error socket:", err.message)
    );
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
        setConnectCount((c) => (c === 0 ? 1 : c)); // solo si aún era 0
      }

      const onConnect = () => {
        if (!active) return;
        console.log("[useSocket] onConnect →", s.id);
        setSocket(s);
        // ← CLAVE: incrementar siempre en cada connect, no solo la primera vez
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