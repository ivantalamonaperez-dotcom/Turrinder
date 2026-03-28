"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";

export const useWebRTC = () => {
  const socket = useSocket();

  const localStream = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const partnerId = useRef<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const start = async () => {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
    };

    start();

    socket.on("matchFound", async ({ partnerId: id }) => {
      partnerId.current = id;

      createPeer();

      const offer = await peer.current!.createOffer();
      await peer.current!.setLocalDescription(offer);

      socket.emit("offer", {
        to: id,
        offer,
      });
    });

    socket.on("offer", async ({ from, offer }) => {
      partnerId.current = from;

      createPeer();

      await peer.current!.setRemoteDescription(offer);

      const answer = await peer.current!.createAnswer();
      await peer.current!.setLocalDescription(answer);

      socket.emit("answer", {
        to: from,
        answer,
      });
    });

    socket.on("answer", async ({ answer }) => {
      await peer.current?.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (candidate) {
        await peer.current?.addIceCandidate(candidate);
      }
    });
  }, [socket]);

  const createPeer = () => {
    peer.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    localStream.current?.getTracks().forEach((track) => {
      peer.current?.addTrack(track, localStream.current!);
    });

    peer.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peer.current.onicecandidate = (event) => {
      if (event.candidate && partnerId.current) {
        socket?.emit("ice-candidate", {
          to: partnerId.current,
          candidate: event.candidate,
        });
      }
    };
  };

  return {
    localVideoRef,
    remoteVideoRef,
  };
};