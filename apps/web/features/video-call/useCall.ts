"use client";

import { useState } from "react";

export const useCall = () => {
  const [inCall, setInCall] = useState(false);

  const startCall = () => {
    console.log("call started");
    setInCall(true);
  };

  const endCall = () => {
    console.log("call ended");
    setInCall(false);
  };

  return {
    inCall,
    startCall,
    endCall,
  };
};