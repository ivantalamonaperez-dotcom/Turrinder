import { supabase } from "@/services/supabase.client";

export const authService = {
  login: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  register: async (email: string, password: string) => {
    return await supabase.auth.signUp({
      email,
      password,
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
  },
};