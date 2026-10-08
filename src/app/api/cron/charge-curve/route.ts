import {
  assertCronRequestAuth,
  requireCronSecret,
} from "@/lib/auth/cron-secret";
import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Peugeot HTTP pulls per cron tick — keeps runtime & upstream load bounded. */
const MAX_SYNCS_PER_RUN = 15;
/** Dense sampling while a car is known to be charging. */
const CHARGING_MIN_AGE_MS = 2 * 60_000;
/**
 * Idle / plugged probe. Only a rotating slice syncs each tick; full fleet
 * coverage emerges over ~15–20 minutes without hammering Peugeot.
 */
const IDLE_MIN_AGE_MS = 15 * 60_000;

type LiveRow = {
  user_id: string;
  last_sync_at: string | null;
  oauth_meta: Record<string, unknown> | null;
};

type Candidate = {
  userId: string;
  chargeStatus: string;
  charging: boolean;
  lastSyncMs: number;
  ageMs: number;
};

function asMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function chargeStatusOf(state: unknown): string {
  if (!state || typeof state !== "object" || Array.isArray(state)) return "";
  return String((state as Record<string, unknown>).chargeStatus ?? "");
}

/**
 * Background Peugeot status pull so charge_samples accumulate while the app
 * is closed. Scaled for many customers:
 * - only actively charging cars get frequent pulls
 * - idle cars are probed rarely, oldest-first, capped per run
 */
async function run(request: Request) {
  if (!assertCronRequestAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  requireCronSecret();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !getServiceRoleKey()) {
    return Response.json(
      { error: "Supabase service role nicht konfiguriert" },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("peugeot_connections")
    .select("user_id, last_sync_at, oauth_meta")
    .eq("connected", true)
    .not("access_token", "is", null)
    .not("vehicle_api_id", "is", null);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as LiveRow[];
  const userIds = rows.map((r) => r.user_id);

  const stateByUser = new Map<string, unknown>();
  if (userIds.length > 0) {
    const { data: states } = await supabase
      .from("vehicle_state")
      .select("user_id, state")
      .in("user_id", userIds);
    for (const row of states ?? []) {
      stateByUser.set(String(row.user_id), row.state);
    }
  }

  const dueCharging: Candidate[] = [];
  const dueIdle: Candidate[] = [];
  let skippedRecent = 0;
  let skippedReconnect = 0;

  for (const row of rows) {
    const meta = asMeta(row.oauth_meta);
    if (meta.needsReconnect) {
      skippedReconnect += 1;
      continue;
    }

    const chargeStatus = chargeStatusOf(stateByUser.get(row.user_id));
    const charging = chargeStatus === "charging";
    const lastSyncMs = row.last_sync_at
      ? new Date(row.last_sync_at).getTime()
      : 0;
    const ageMs = lastSyncMs
      ? Date.now() - lastSyncMs
      : Number.POSITIVE_INFINITY;
    const minAgeMs = charging ? CHARGING_MIN_AGE_MS : IDLE_MIN_AGE_MS;
    if (ageMs < minAgeMs) {
      skippedRecent += 1;
      continue;
    }

    const candidate: Candidate = {
      userId: row.user_id,
      chargeStatus,
      charging,
      lastSyncMs,
      ageMs,
    };
    if (charging) dueCharging.push(candidate);
    else dueIdle.push(candidate);
  }

  // Charging first (dense curve), then oldest idle probes (fair rotation).
  dueCharging.sort((a, b) => b.ageMs - a.ageMs);
  dueIdle.sort((a, b) => b.ageMs - a.ageMs);
  const queue = [...dueCharging, ...dueIdle].slice(0, MAX_SYNCS_PER_RUN);
  const deferred = dueCharging.length + dueIdle.length - queue.length;

  const results: Array<Record<string, unknown>> = [];
  for (const item of queue) {
    try {
      const bundle = await getVehicleBundle(supabase, item.userId, {
        forceSync: true,
      });
      results.push({
        userId: item.userId,
        ok: true,
        priority: item.charging ? "charging" : "idle",
        chargeStatus: bundle.vehicle.chargeStatus,
        batteryPercent: bundle.vehicle.batteryPercent,
        samples: bundle.chargeCurve.length,
        syncError: bundle.syncError ?? null,
      });
    } catch (err) {
      results.push({
        userId: item.userId,
        ok: false,
        priority: item.charging ? "charging" : "idle",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return Response.json({
    ok: true,
    at: new Date().toISOString(),
    fleet: rows.length,
    dueCharging: dueCharging.length,
    dueIdle: dueIdle.length,
    synced: queue.length,
    deferred,
    skippedRecent,
    skippedReconnect,
    results,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
