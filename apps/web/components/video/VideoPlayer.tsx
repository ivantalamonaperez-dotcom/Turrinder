"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/services/supabase.client";

export default function VideoPlayer({ room }: { room: any }) {
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    let userId: string;

    const start = async () => {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;

      // 🎥 obtener cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      // 🔗 peer connection
      pc.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // enviar tracks
      stream.getTracks().forEach((track) => {
        pc.current?.addTrack(track, stream);
      });

      // recibir video remoto
      pc.current.ontrack = (event) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = event.streams[0];
        }
      };

      // ICE candidates
      pc.current.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.from("signals").insert({
            room_id: room.id,
            sender: userId,
            type: "candidate",
            data: event.candidate,
          });
        }
      };

      // 👑 uno crea offer
      if (room.user1 === userId) {
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);

        await supabase.from("signals").insert({
          room_id: room.id,
          sender: userId,
          type: "offer",
          data: offer,
        });
      }

      // 🔥 escuchar señales
      supabase
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

            if (signal.sender === userId) return;

            if (signal.type === "offer") {
              await pc.current?.setRemoteDescription(signal.data);

              const answer = await pc.current?.createAnswer();
              await pc.current?.setLocalDescription(answer!);

              await supabase.from("signals").insert({
                room_id: room.id,
                sender: userId,
                type: "answer",
                data: answer,
              });
            }

            if (signal.type === "answer") {
              await pc.current?.setRemoteDescription(signal.data);
            }

            if (signal.type === "candidate") {
              await pc.current?.addIceCandidate(signal.data);
            }
          }
        )
        .subscribe();
    };

    start();

    return () => {
      pc.current?.close();
    };
  }, [room]);

  return (
    <div style={styles.container}>
      {/* REMOTO */}
      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        style={styles.remote}
      />

      {/* LOCAL */}
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