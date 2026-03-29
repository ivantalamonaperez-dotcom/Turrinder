"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/services/supabase.client";

export default function VideoPlayer({ room }: { room: any }) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!room) return;

    let userId: string;
    let channel: any;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      userId = data.user.id;

      // 🎥 1. Obtener cámara
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (err) {
        console.error("❌ No se pudo acceder a la cámara:", err);
        return;
      }

      // ✅ Asignar video local DESPUÉS de obtener el stream
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      // 🔗 2. Crear peer connection
      pc.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Enviar tracks locales
      stream.getTracks().forEach((track) => {
        pc.current?.addTrack(track, stream);
      });

      // Recibir video remoto
      pc.current.ontrack = (event) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = event.streams[0];
        }
      };

      // ICE candidates → signals
      pc.current.onicecandidate = async (event) => {
        if (event.candidate && pc.current?.remoteDescription) {
          await supabase.from("signals").insert({
            room_id: room.id,
            sender: userId,
            type: "candidate",
            data: event.candidate,
          });
        }
      };

      // ✅ 3. Suscribirse PRIMERO al canal antes de crear el offer
      // Esto evita el race condition donde user2 se pierde el offer
      await new Promise<void>((resolve) => {
        channel = supabase
          .channel("webrtc-" + room.id)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "signals",
              filter: `room_id=eq.${room.id}`,
            },
            async (payload) => {
              const signal = payload.new;

              // Ignorar señales propias y señales de rooms anteriores
              if (signal.sender === userId) return;

              if (signal.type === "offer" && pc.current) {
                // Ignorar si ya tenemos remote description
                if (pc.current.signalingState !== "stable") return;

                await pc.current.setRemoteDescription(
                  new RTCSessionDescription(signal.data)
                );

                const answer = await pc.current.createAnswer();
                await pc.current.setLocalDescription(answer);

                await supabase.from("signals").insert({
                  room_id: room.id,
                  sender: userId,
                  type: "answer",
                  data: answer,
                });
              }

              if (signal.type === "answer" && pc.current) {
                // Ignorar si ya tenemos remote description
                if (pc.current.signalingState !== "have-local-offer") return;

                await pc.current.setRemoteDescription(
                  new RTCSessionDescription(signal.data)
                );
              }

              if (signal.type === "candidate" && pc.current) {
                // Solo agregar candidatos si ya hay remote description
                if (!pc.current.remoteDescription) return;

                try {
                  await pc.current.addIceCandidate(
                    new RTCIceCandidate(signal.data)
                  );
                } catch (e) {
                  // ignorar candidatos duplicados
                }
              }
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              resolve(); // ✅ canal listo, recién ahora crear el offer
            }
          });
      });

      // ✅ 4. Solo DESPUÉS de estar suscrito, user1 crea el offer
      if (room.user1 === userId) {
        // Limpiar señales viejas de esta room antes de crear nuevas
        await supabase
          .from("signals")
          .delete()
          .eq("room_id", room.id);

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);

        await supabase.from("signals").insert({
          room_id: room.id,
          sender: userId,
          type: "offer",
          data: offer,
        });
      }
    };

    start();

    return () => {
      pc.current?.close();
      pc.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [room]);

  return (
    <div style={styles.container}>
      {/* REMOTO — pantalla completa */}
      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        style={styles.remote}
      />

      {/* LOCAL — esquina inferior derecha */}
      <video
        ref={localVideo}
        autoPlay
        muted
        playsInline
        style={styles.local}
      />
    </div>
  );
}

const styles = {
  container: {
    position: "relative" as const,
    width: "100%",
    height: "100%",
    background: "black",
  },
  remote: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },
  local: {
    position: "absolute" as const,
    bottom: "20px",
    right: "20px",
    width: "120px",
    height: "160px",
    borderRadius: "10px",
    objectFit: "cover" as const,
    border: "2px solid white",
  },
};