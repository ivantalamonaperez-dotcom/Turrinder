import { supabase } from "@/services/supabase.client";

export const useAuth = () => {
  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user;
  };

  return { getUser };
};