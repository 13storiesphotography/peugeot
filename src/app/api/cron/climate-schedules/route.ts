// @ts-nocheck — cron uses loosely typed Supabase RPC + service-less client.
import { createClient } from "@supabase/supabase-js";
import {
  climateSchedulesToPrograms,
  emptyPrecondPrograms,
  programsFromVehicleStatus,
  refreshRemoteToken,
  sendThermalPreconditioning,
  type PrecondPrograms,
} from "@/lib/stellantis/remote";
import type { OtpPersistedState } from "@/lib/stellantis/otp/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CRON_SECRET =
  process.env.CRON_SECRET ??
  "4c25a4532d09a09981ba0d466a041fccb1a3e87603adb7f9";

type DueRow = {
  schedule_id: string;
  user_id: string;
  time_local: string;
  days_of_week: number[];
  payload: Record<string, unknown>;
  vin: string;
  country_code: string;
  customer_id: string | null;
  remote_ready: boolean;
  oauth_access_token: string | null;
  oauth_refresh_token: string | null;
  oauth_token_expires_at: string | null;
  remote_access_token: string | null;
  remote_refresh_token: string | null;
  otp_state: OtpPersistedState | null;
  vehicle_api_id: string | null;
};

function assertCronAuth(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const custom = request.headers.get("x-cron-secret") ?? "";
  if (bearer !== CRON_SECRET && custom !== CRON_SECRET) {
    return false;
  }
  return true;
}

function berlinStamp(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  const hm = `${get("hour")}:${get("minute")}`;
  return { day, hm, key: `${day}T${hm}` };
}

async function resolvePrograms(
  supabase: any,
  row: DueRow,
): Promise<PrecondPrograms> {
  const { data: climateRows } = await supabase
    .from("vehicle_schedules")
    .select("enabled, time_local, days_of_week")
    .eq("user_id", row.user_id)
    .eq("kind", "climate")
    .order("time_local");

  const fromApp = climateSchedulesToPrograms(
    ((climateRows ?? []) as Array<{
      enabled: boolean;
      time_local: string;
      days_of_week: number[] | null;
    }>).map((s) => ({
      enabled: Boolean(s.enabled),
      timeLocal: String(s.time_local).slice(0, 5),
      daysOfWeek: s.days_of_week ?? [],
    })),
  );

  if ((climateRows ?? []).length > 0) return fromApp;

  if (!row.oauth_access_token || !row.vehicle_api_id) {
    return emptyPrecondPrograms();
  }
  try {
    const { fetchVehicleStatus } = await import("@/lib/stellantis/api");
    const status = await fetchVehicleStatus(
      row.oauth_access_token,
      row.country_code || "DE",
      row.vehicle_api_id,
    );
    return programsFromVehicleStatus(status) ?? emptyPrecondPrograms();
  } catch {
    return emptyPrecondPrograms();
  }
}

async function fireRow(
  supabase: any,
  row: DueRow,
  firedKey: string,
): Promise<{ ok: boolean; message: string }> {
  if (!row.customer_id || !row.vin || /x{4,}/i.test(row.vin)) {
    return { ok: false, message: "VIN/customer fehlt" };
  }
  if (!row.remote_refresh_token || !row.otp_state) {
    return { ok: false, message: "Fernbedienung unvollständig" };
  }

  let oauthToken = row.oauth_access_token ?? "";
  const expiresAt = row.oauth_token_expires_at
    ? new Date(row.oauth_token_expires_at).getTime()
    : 0;
  if (
    row.oauth_refresh_token &&
    (!expiresAt || expiresAt < Date.now() + 60_000)
  ) {
    const { refreshAccessToken } = await import("@/lib/stellantis/api");
    const refreshed = await refreshAccessToken(
      row.country_code || "DE",
      row.oauth_refresh_token,
    );
    oauthToken = refreshed.accessToken;
    await supabase
      .from("peugeot_connections")
      .update({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        token_expires_at: refreshed.expiresAt,
      })
      .eq("user_id", row.user_id);
  }

  const remote = await refreshRemoteToken({
    oauthAccessToken: oauthToken,
    countryCode: row.country_code || "DE",
    remoteRefreshToken: row.remote_refresh_token,
    otpState: row.otp_state,
  });

  await supabase
    .from("peugeot_connections")
    .update({
      remote_access_token: remote.remote.accessToken,
      remote_refresh_token: remote.remote.refreshToken,
      remote_token_updated_at: remote.remote.updatedAt,
      otp_state: remote.otpState,
    })
    .eq("user_id", row.user_id);

  const programs = await resolvePrograms(supabase, {
    ...row,
    oauth_access_token: oauthToken,
  });

  await sendThermalPreconditioning({
    customerId: row.customer_id,
    vin: row.vin,
    remoteAccessToken: remote.remote.accessToken,
    activate: true,
    programs,
  });

  await supabase.rpc("cron_mark_climate_fired", {
    p_secret: CRON_SECRET,
    p_schedule_id: row.schedule_id,
    p_fired_key: firedKey,
  });

  await supabase.from("activity_log").insert({
    user_id: row.user_id,
    command: "climate_start",
    message: `Geplantes Vorklima gestartet (${row.time_local}).`,
    ok: true,
  });

  return { ok: true, message: "gestartet" };
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  if (!assertCronAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return Response.json({ error: "Supabase nicht konfiguriert" }, { status: 500 });
  }

  const supabase = createClient(url, key) as any;
  const { key: firedKey } = berlinStamp();

  const { data, error } = await supabase.rpc("cron_due_climate_schedules", {
    p_secret: CRON_SECRET,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as DueRow[];
  const results: Array<{ scheduleId: string; ok: boolean; message: string }> =
    [];

  for (const row of rows) {
    try {
      const result = await fireRow(supabase, row, firedKey);
      results.push({
        scheduleId: row.schedule_id,
        ok: result.ok,
        message: result.message,
      });
    } catch (err) {
      results.push({
        scheduleId: row.schedule_id,
        ok: false,
        message: err instanceof Error ? err.message : "Fehler",
      });
    }
  }

  return Response.json({
    ok: true,
    checkedAt: firedKey,
    due: rows.length,
    results,
  });
}
