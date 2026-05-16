"use client";

import { useEffect } from "react";
import { supabase } from "@/services/supabase.client";

// ✅ Singleton: solo un intervalo activo globalmente, sin importar cuántas
// veces se monte el componente al navegar entre rutas.
let _presenceInterval: ReturnType<typeof setInterval> | null = null;
let _presenceUserId: string | null = null;
let _mountCount = 0;

async function setOnline(userId: string) {
  await supabase
    .from("profiles")
    .update({ is_online: true, last_seen: new Date() })
    .eq("id", userId);
}

async function setOffline(userId: string) {
  await supabase
    .from("profiles")
    .update({ is_online: false, last_seen: new Date() })
    .eq("id", userId);
  console.log("🔴 OFFLINE:", userId);
}

export const usePresence = () => {
  useEffect(() => {
    _mountCount++;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const userId = data.user.id;
      _presenceUserId = userId;

      await setOnline(userId);
      console.log("🟢 ONLINE:", userId);

      // ✅ Solo crear el intervalo si no existe ya uno corriendo
      if (!_presenceInterval) {
        _presenceInterval = setInterval(() => {
          if (_presenceUserId) setOnline(_presenceUserId);
        }, 30_000); // ✅ 30s en lugar de 5s — suficiente para presencia
      }
    };

    start();

    const handleUnload = () => {
      if (_presenceUserId) setOffline(_presenceUserId);
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      _mountCount--;

      // ✅ Solo limpiar cuando no queda ningún componente montado
      if (_mountCount === 0) {
        if (_presenceInterval) {
          clearInterval(_presenceInterval);
          _presenceInterval = null;
        }
        if (_presenceUserId) {
          setOffline(_presenceUserId);
          _presenceUserId = null;
        }
      }
    };
  }, []);
};