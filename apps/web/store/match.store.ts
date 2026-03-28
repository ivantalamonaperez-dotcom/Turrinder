import { create } from "zustand";

type State = {
  matched: boolean;
  setMatched: (v: boolean) => void;
};

export const useMatchStore = create<State>((set) => ({
  matched: false,
  setMatched: (v) => set({ matched: v }),
}));