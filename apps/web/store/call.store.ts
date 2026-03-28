import { create } from "zustand";

type State = {
  inCall: boolean;
  setInCall: (v: boolean) => void;
};

export const useCallStore = create<State>((set) => ({
  inCall: false,
  setInCall: (v) => set({ inCall: v }),
}));