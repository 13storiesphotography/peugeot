import {
  assertCronRequestAuth,
  requireCronSecret,
} from "@/lib/auth/cron-secret";
import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import { getVehicleBundle } from "@/lib/vehicle/repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type LiveRow = {
  user_id: string;
  last_sync_at: string | null;
  oauth_meta: Record<string, unknown> | null;
};

function asMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Background Peugeot status pull so charge_samples accumulate while the app
 * is closed. pg_cron hits this every few minutes for live connections.
 */
async function run(request: Request) {
  if (!assertCronRequestAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure secret is configured (throws if missing).
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
  const results: Array<Record<string, unknown>> = [];

  for (const row of rows) {
    const meta = asMeta(row.oauth_meta);
    if (meta.needsReconnect) {
      results.push({ userId: row.user_id, skipped: "needsReconnect" });
      continue;
    }

    const { data: stateRow } = await supabase
      .from("vehicle_state")
      .select("state")
      .eq("user_id", row.user_id)
      .maybeSingle();

    const state =
      stateRow?.state &&
      typeof stateRow.state === "object" &&
      !Array.isArray(stateRow.state)
        ? (stateRow.state as Record<string, unknown>)
        : {};
    const chargeStatus = String(state.chargeStatus ?? "");
    const charging = chargeStatus === "charging";

    const lastSyncMs = row.last_sync_at
      ? new Date(row.last_sync_at).getTime()
      : 0;
    const ageMs = lastSyncMs ? Date.now() - lastSyncMs : Number.POSITIVE_INFINITY;

    // Dense samples only while actively charging. Otherwise probe ~every 5 min
    // so a new session is noticed even when the app stays closed.
    const minAgeMs = charging ? 90_000 : 5 * 60_000;
    if (ageMs < minAgeMs) {
      results.push({
        userId: row.user_id,
        skipped: "recentSync",
        chargeStatus,
        ageSec: Math.round(ageMs / 1000),
      });
      continue;
    }

    try {
      const bundle = await getVehicleBundle(supabase, row.user_id, {
        forceSync: true,
      });
      results.push({
        userId: row.user_id,
        ok: true,
        chargeStatus: bundle.vehicle.chargeStatus,
        batteryPercent: bundle.vehicle.batteryPercent,
        samples: bundle.chargeCurve.length,
        syncError: bundle.syncError ?? null,
      });
    } catch (err) {
      results.push({
        userId: row.user_id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return Response.json({
    ok: true,
    at: new Date().toISOString(),
    checked: rows.length,
    results,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
