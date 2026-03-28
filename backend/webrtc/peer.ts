export const createPeerConfig = () => {
  return {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
    ],
  };
};