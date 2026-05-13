import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { user_id } = await req.json();
  console.log("user_id recibido:", user_id);

  const { data: ban, error } = await supabase
    .from("bans")
    .select("id")
    .eq("user_id", user_id)
    .limit(1)
    .maybeSingle();

  console.log("ban encontrado:", ban, "error:", error);
  return NextResponse.json({ banned: !!ban, isPerm: true });
}