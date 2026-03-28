export const signalingClient = {
  sendOffer: (offer: any) => {
    console.log("sending offer", offer);
  },

  sendAnswer: (answer: any) => {
    console.log("sending answer", answer);
  },

  sendIceCandidate: (candidate: any) => {
    console.log("sending ICE", candidate);
  },
};