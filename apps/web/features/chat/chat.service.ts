import { supabase } from "@/services/supabase.client";

const PAGE_SIZE = 30;

export const chatService = {
  loadMessages: async (myId: string, otherId: string, page = 0) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, from_user, to_user, content, created_at")
      .or(
        `and(from_user.eq.${myId},to_user.eq.${otherId}),and(from_user.eq.${otherId},to_user.eq.${myId})`
      )
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) return [];
    return (data || []).reverse();
  },

  // ✅ FIX: usar `content: message` en vez de shorthand `content`
  sendMessage: async (fromId: string, toId: string, message: string) => {
    const { data, error } = await supabase
      .from("messages")
      .insert({ from_user: fromId, to_user: toId, content: message })
      .select("id, from_user, to_user, content, created_at")
      .single();

    if (error) throw error;
    return data;
  },

  listenMessages: (
    myId: string,
    otherId: string,
    onMessage: (msg: any) => void
  ) => {
    const channelId = [myId, otherId].sort().join("-");

    return supabase
      .channel("chat-" + channelId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;
          const isRelevant =
            (msg.from_user === myId && msg.to_user === otherId) ||
            (msg.from_user === otherId && msg.to_user === myId);
          if (isRelevant) onMessage(msg);
        }
      )
      .subscribe();
  },

  loadConversationPreviews: async (myId: string, otherIds: string[]) => {
    if (!otherIds.length) return {};

    const previews: Record<string, { content: string; created_at: string }> = {};

    await Promise.all(
      otherIds.map(async (otherId) => {
        const { data } = await supabase
          .from("messages")
          .select("content, created_at")
          .or(
            `and(from_user.eq.${myId},to_user.eq.${otherId}),and(from_user.eq.${otherId},to_user.eq.${myId})`
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) previews[otherId] = data;
      })
    );

    return previews;
  },
};