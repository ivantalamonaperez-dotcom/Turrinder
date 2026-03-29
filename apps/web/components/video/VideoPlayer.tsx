"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/services/supabase.client";

export default function VideoPlayer({ room }: { room: any }) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const isConnected = useRef(false); // ✅ guard para ignorar señales tardías

  useEffect(() => {
    if (!room) return;

    let userId: string;
    let channel: any;
    let isUser1: boolean;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      userId = data.user.id;
      isUser1 = room.user1 === userId;
      isConnected.current = false;
      iceCandidateBuffer.current = [];

      console.log(`🎭 Soy ${isUser1 ? "user1 (OFFER)" : "user2 (ANSWER)"}`);

      // 🎥 1. Cámara y micrófono
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (err) {
        console.error("❌ Cámara no disponible:", err);
        return;
      }

      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      // 🔗 2. Peer connection
      pc.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      stream.getTracks().forEach((track) => {
        pc.current!.addTrack(track, stream);
      });

      pc.current.ontrack = (event) => {
        console.log("📡 Track remoto recibido");
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = event.streams[0];
        }
      };

      pc.current.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.from("signals").insert({
            room_id: room.id,
            sender: userId,
            type: "candidate",
            data: event.candidate.toJSON(),
          });
        }
      };

      pc.current.onconnectionstatechange = () => {
        const state = pc.current?.connectionState;
        console.log("🔌 Connection state:", state);
        if (state === "connected") {
          isConnected.current = true; // ✅ marcar como conectado
        }
      };

      pc.current.oniceconnectionstatechange = () => {
        console.log("🧊 ICE state:", pc.current?.iceConnectionState);
      };

      // ✅ 3. user1 limpia TODAS las señales viejas de la room
      // user2 espera a que user1 limpie antes de suscribirse
      if (isUser1) {
        await supabase
          .from("signals")
          .delete()
          .eq("room_id", room.id);
      } else {
        // user2 espera un poco para que user1 termine de limpiar
        await new Promise((res) => setTimeout(res, 500));
      }

      // ✅ 4. Suscribirse con nombre único para evitar CHANNEL_ERROR
      const channelName = `webrtc-${room.id}-${Date.now()}`;
      await new Promise<void>((resolve) => {
        channel = supabase
          .channel(channelName)
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
              if (signal.sender === userId) return;

              // ✅ Ignorar señales si ya estamos conectados (señales tardías/viejas)
              if (isConnected.current && signal.type !== "candidate") return;

              console.log("📨 Señal recibida:", signal.type);

              if (signal.type === "offer" && !isUser1) {
                // Ignorar si ya procesamos un offer
                if (pc.current!.signalingState !== "stable") return;

                await pc.current!.setRemoteDescription(
                  new RTCSessionDescription(signal.data)
                );

                for (const c of iceCandidateBuffer.current) {
                  try { await pc.current!.addIceCandidate(c); } catch {}
                }
                iceCandidateBuffer.current = [];

                const answer = await pc.current!.createAnswer();
                await pc.current!.setLocalDescription(answer);

                await supabase.from("signals").insert({
                  room_id: room.id,
                  sender: userId,
                  type: "answer",
                  data: answer,
                });
              }

              if (signal.type === "answer" && isUser1) {
                if (pc.current!.signalingState !== "have-local-offer") return;

                await pc.current!.setRemoteDescription(
                  new RTCSessionDescription(signal.data)
                );

                for (const c of iceCandidateBuffer.current) {
                  try { await pc.current!.addIceCandidate(c); } catch {}
                }
                iceCandidateBuffer.current = [];
              }

              if (signal.type === "candidate") {
                if (pc.current!.remoteDescription) {
                  try {
                    await pc.current!.addIceCandidate(
                      new RTCIceCandidate(signal.data)
                    );
                  } catch {}
                } else {
                  iceCandidateBuffer.current.push(signal.data);
                }
              }
            }
          )
          .subscribe((status) => {
            console.log("📡 Canal WebRTC:", status);
            if (status === "SUBSCRIBED") resolve();
          });
      });

      // ✅ 5. user1 crea el offer DESPUÉS de que ambos estén suscritos
      if (isUser1) {
        // Dar tiempo a user2 para suscribirse (500ms de delay + tiempo de suscripción)
        await new Promise((res) => setTimeout(res, 800));

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);

        await supabase.from("signals").insert({
          room_id: room.id,
          sender: userId,
          type: "offer",
          data: offer,
        });

        console.log("📤 Offer enviado");
      }
    };

    start();

    return () => {
      pc.current?.close();
      pc.current = null;
      iceCandidateBuffer.current = [];
      isConnected.current = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [room]);

  return (
    <div style={styles.container}>
      <video ref={remoteVideo} autoPlay playsInline style={styles.remote} />
      <video ref={localVideo} autoPlay muted playsInline style={styles.local} />
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