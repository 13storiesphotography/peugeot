import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateSchedule } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    scheduleId?: string;
    enabled?: boolean;
    timeLocal?: string;
    daysOfWeek?: number[];
    payload?: Record<string, unknown>;
  };

  if (!body.scheduleId || typeof body.enabled !== "boolean" || !body.timeLocal) {
    return NextResponse.json({ error: "Ungültige Schedule-Daten." }, { status: 400 });
  }

  try {
    await updateSchedule(supabase, userId, body.scheduleId, {
      enabled: body.enabled,
      timeLocal: body.timeLocal,
      daysOfWeek: body.daysOfWeek ?? [1, 2, 3, 4, 5],
      payload: body.payload,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
