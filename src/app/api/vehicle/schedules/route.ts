import { requireOwner } from "@/lib/auth/require-owner";
import { updateSchedule } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    scheduleId?: string;
    enabled?: boolean;
    timeLocal?: string;
    daysOfWeek?: number[];
    payload?: Record<string, unknown>;
  };

  if (!body.scheduleId || typeof body.enabled !== "boolean" || !body.timeLocal) {
    return Response.json({ error: "Ungültige Schedule-Daten." }, { status: 400 });
  }

  try {
    await updateSchedule(auth.supabase, auth.userId, body.scheduleId, {
      enabled: body.enabled,
      timeLocal: body.timeLocal,
      daysOfWeek: body.daysOfWeek ?? [1, 2, 3, 4, 5],
      payload: body.payload,
    });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return Response.json({ error: message }, { status: 500 });
  }
}
