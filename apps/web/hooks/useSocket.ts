// apps/web/hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { supabase } from "@/services/supabase.client"; // Asegúrate de que la ruta sea correcta

const SOCKET_URL = "http://localhost:3001";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Definimos una función asíncrona para inicializar la conexión con el ID real
    const initSocket = async () => {
      if (socketRef.current?.connected) return;

      // 1. Obtenemos el usuario actual de Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn("⚠️ No hay usuario autenticado, el socket se conectará sin ID.");
      }

      // 2. Creamos la conexión pasando el userId en la query
      socketRef.current = io(SOCKET_URL, {
        autoConnect: true,
        transports: ["websocket"],
        query: {
          userId: user?.id // <--- ESTO ES LO QUE EL BACKEND NECESITA
        }
      });

      const socket = socketRef.current;

      socket.on("connect", () => {
        console.log("🟢 Conectado al backend de Node:", socket.id);
        console.log("🆔 Enviando UUID de Supabase:", user?.id);
      });

      socket.on("connect_error", (err) => {
        console.error("❌ Error de conexión Socket:", err.message);
      });
    };

    initSocket();

    return () => {
      // Opcional: Si quieres limpiar la conexión al destruir el hook
      // socketRef.current?.disconnect();
    };
  }, []);

  return socketRef.current;
};