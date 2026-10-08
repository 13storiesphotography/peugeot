import { assertCronRequestAuth } from "@/lib/auth/cron-secret";
import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Peugeot HTTP pulls per cron tick — keeps runtime & upstream load bounded. */
const MAX_SYNCS_PER_RUN = 15;
/** Hard refresh (wake + wait) is slow — cap per tick. */
const MAX_HARD_REFRESH_PER_RUN = 2;
/** Dense sampling while a car is known to be charging. */
const CHARGING_MIN_AGE_MS = 2 * 60_000;
/**
 * When an 80% app-limit is active and SoC is near the target, wake the car
 * so Peugeot publishes a fresher SoC (AC charging often stalls status).
 */
const NEAR_LIMIT_MIN_AGE_MS = 3 * 60_000;
/** Start waking this many percent below the preferred limit. */
const NEAR_LIMIT_BAND = 15;
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
  nearLimit: boolean;
  lastSyncMs: number;
  ageMs: number;
};

function asMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asState(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function chargeStatusOf(state: unknown): string {
  return String(asState(state)?.chargeStatus ?? "");
}

function preferredLimitOf(state: unknown): number {
  const s = asState(state);
  const preferred = Number(
    s?.preferredChargeLimitPercent ?? s?.chargeLimitPercent ?? 100,
  );
  if (!Number.isFinite(preferred)) return 100;
  return Math.min(100, Math.max(50, Math.round(preferred)));
}

function batteryOf(state: unknown): number {
  const n = Number(asState(state)?.batteryPercent ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** True when app 80%-limit is on and SoC is close enough to need a wake. */
function nearChargeLimit(state: unknown): boolean {
  const limit = preferredLimitOf(state);
  if (limit >= 100) return false;
  if (chargeStatusOf(state) !== "charging") return false;
  return batteryOf(state) + 0.4 >= limit - NEAR_LIMIT_BAND;
}

/**
 * Background Peugeot status pull so charge_samples accumulate while the app
 * is closed — and so the app-enforced 80% limit can stop charging via MQTT
 * delayed mode without the UI open.
 */
async function run(request: Request) {
  if (!(await assertCronRequestAuth(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const dueNearLimit: Candidate[] = [];
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

    const state = stateByUser.get(row.user_id);
    const chargeStatus = chargeStatusOf(state);
    const charging = chargeStatus === "charging";
    const nearLimit = nearChargeLimit(state);
    const lastSyncMs = row.last_sync_at
      ? new Date(row.last_sync_at).getTime()
      : 0;
    const ageMs = lastSyncMs
      ? Date.now() - lastSyncMs
      : Number.POSITIVE_INFINITY;
    const minAgeMs = nearLimit
      ? NEAR_LIMIT_MIN_AGE_MS
      : charging
        ? CHARGING_MIN_AGE_MS
        : IDLE_MIN_AGE_MS;
    if (ageMs < minAgeMs) {
      skippedRecent += 1;
      continue;
    }

    const candidate: Candidate = {
      userId: row.user_id,
      chargeStatus,
      charging,
      nearLimit,
      lastSyncMs,
      ageMs,
    };
    if (nearLimit) dueNearLimit.push(candidate);
    else if (charging) dueCharging.push(candidate);
    else dueIdle.push(candidate);
  }

  // Near-limit first (wake + enforce), then dense charging, then idle probes.
  dueNearLimit.sort((a, b) => b.ageMs - a.ageMs);
  dueCharging.sort((a, b) => b.ageMs - a.ageMs);
  dueIdle.sort((a, b) => b.ageMs - a.ageMs);
  const queue = [...dueNearLimit, ...dueCharging, ...dueIdle].slice(
    0,
    MAX_SYNCS_PER_RUN,
  );
  const deferred =
    dueNearLimit.length + dueCharging.length + dueIdle.length - queue.length;

  const results: Array<Record<string, unknown>> = [];
  let hardRefreshes = 0;
  for (const item of queue) {
    try {
      const useHard =
        item.nearLimit && hardRefreshes < MAX_HARD_REFRESH_PER_RUN;
      if (useHard) hardRefreshes += 1;

      const bundle = await getVehicleBundle(supabase, item.userId, {
        forceSync: true,
        hardRefresh: useHard,
      });
      results.push({
        userId: item.userId,
        ok: true,
        priority: item.nearLimit
          ? "nearLimit"
          : item.charging
            ? "charging"
            : "idle",
        hardRefresh: useHard,
        chargeStatus: bundle.vehicle.chargeStatus,
        batteryPercent: bundle.vehicle.batteryPercent,
        preferredLimit: bundle.vehicle.preferredChargeLimitPercent,
        samples: bundle.chargeCurve.length,
        syncError: bundle.syncError ?? null,
      });
    } catch (err) {
      results.push({
        userId: item.userId,
        ok: false,
        priority: item.nearLimit
          ? "nearLimit"
          : item.charging
            ? "charging"
            : "idle",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return Response.json({
    ok: true,
    at: new Date().toISOString(),
    fleet: rows.length,
    dueNearLimit: dueNearLimit.length,
    dueCharging: dueCharging.length,
    dueIdle: dueIdle.length,
    synced: queue.length,
    hardRefreshes,
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
