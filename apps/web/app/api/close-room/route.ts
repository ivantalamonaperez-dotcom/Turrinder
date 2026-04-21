// app/api/close-room/route.ts
// Endpoint llamado por navigator.sendBeacon cuando el host cierra la tab

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // Cliente inicializado dentro del handler, no a nivel de módulo
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { roomId } = await req.json();
    if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("rooms")
      .update({ is_live: false, participant_count: 0 })
      .eq("id", roomId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}