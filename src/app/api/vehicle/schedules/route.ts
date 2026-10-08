import { requireOwner } from "@/lib/auth/require-owner";
import { getEntitlement } from "@/lib/billing/entitlement";
import { PRO_REQUIRED_MESSAGE } from "@/lib/billing/pro-commands";
import {
  createSchedule,
  deleteSchedule,
  updateSchedule,
  type VehicleSchedule,
} from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";
/** Climate schedule sync may wake MQTT (~15s). */
export const maxDuration = 30;

const KINDS = new Set<VehicleSchedule["kind"]>(["charge", "climate"]);

async function requireProForClimate(
  supabase: Parameters<typeof getEntitlement>[0],
  userId: string,
  kind: string | undefined,
) {
  if (kind !== "climate") return null;
  const entitlement = await getEntitlement(supabase, userId);
  if (!entitlement.isPro) {
    return Response.json({ error: PRO_REQUIRED_MESSAGE }, { status: 402 });
  }
  return null;
}

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

  const proBlock = await requireProForClimate(
    auth.supabase,
    auth.userId,
    body.kind,
  );
  if (proBlock) return proBlock;

  try {
    const result = await createSchedule(auth.supabase, auth.userId, {
      kind: body.kind as VehicleSchedule["kind"],
      enabled: body.enabled,
      timeLocal: body.timeLocal,
      daysOfWeek: body.daysOfWeek,
      payload: body.payload,
    });
    return Response.json({
      ok: true,
      schedule: result.schedule,
      vehicleSyncWarning: result.vehicleSyncWarning ?? null,
    });
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

  // Climate edits always sync ThermalPrecond — Pro only.
  const { data: existing } = await auth.supabase
    .from("vehicle_schedules")
    .select("kind")
    .eq("id", body.scheduleId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  const proBlock = await requireProForClimate(
    auth.supabase,
    auth.userId,
    existing?.kind,
  );
  if (proBlock) return proBlock;

  try {
    const result = await updateSchedule(auth.supabase, auth.userId, body.scheduleId, {
      enabled: body.enabled,
      timeLocal: body.timeLocal,
      daysOfWeek: body.daysOfWeek ?? [1, 2, 3, 4, 5],
      payload: body.payload,
    });
    return Response.json({
      ok: true,
      vehicleSyncWarning: result.vehicleSyncWarning ?? null,
    });
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

  const { data: existing } = await auth.supabase
    .from("vehicle_schedules")
    .select("kind")
    .eq("id", body.scheduleId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  const proBlock = await requireProForClimate(
    auth.supabase,
    auth.userId,
    existing?.kind,
  );
  if (proBlock) return proBlock;

  try {
    const result = await deleteSchedule(
      auth.supabase,
      auth.userId,
      body.scheduleId,
    );
    return Response.json({
      ok: true,
      vehicleSyncWarning: result.vehicleSyncWarning ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fehler";
    return Response.json({ error: message }, { status: 500 });
  }
}
