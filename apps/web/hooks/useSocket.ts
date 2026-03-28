"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:3001"); // backend después
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 conectado:", socket.id);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
};