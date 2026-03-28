import { create } from "zustand";

type User = {
  name: string;
};

type State = {
  user: User | null;
  setUser: (user: User) => void;
};

export const useUserStore = create<State>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));