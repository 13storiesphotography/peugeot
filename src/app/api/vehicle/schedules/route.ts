import { requireOwner } from "@/lib/auth/require-owner";
import {
  createSchedule,
  deleteSchedule,
  updateSchedule,
  type VehicleSchedule,
} from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";

const KINDS = new Set<VehicleSchedule["kind"]>([
  "charge",
  "climate",
  "battery_preheat",
]);

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    kind?: string;
    enabled?: boolean;
    timeLocal?: string;
    daysOfWeek?: number[];
    payload?: Record<string, unknown>;
  };

  if (!body.kind || !KINDS.has(body.kind as VehicleSchedule["kind"])) {
    return Response.json({ error: "Ungültiger Zeitplan-Typ." }, { status: 400 });
  }

  try {
    const schedule = await createSchedule(auth.supabase, auth.userId, {
      kind: body.kind as VehicleSchedule["kind"],
      enabled: body.enabled,
      timeLocal: body.timeLocal,
      daysOfWeek: body.daysOfWeek,
      payload: body.payload,
    });
    return Response.json({ ok: true, schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return Response.json({ error: message }, { status: 500 });
  }
}

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

export async function DELETE(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { scheduleId?: string };
  if (!body.scheduleId) {
    return Response.json({ error: "scheduleId fehlt." }, { status: 400 });
  }

  try {
    await deleteSchedule(auth.supabase, auth.userId, body.scheduleId);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return Response.json({ error: message }, { status: 500 });
  }
}
