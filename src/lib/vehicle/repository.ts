import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CommandRequest,
  CommandResult,
  VehicleState,
} from "@/lib/types";
import { applyCommandToState, tickChargeState } from "./commands";
import { createDefaultVehicleState } from "./defaults";

export type VehicleSchedule = {
  id: string;
  kind: "charge" | "climate" | "battery_preheat";
  enabled: boolean;
  timeLocal: string;
  daysOfWeek: number[];
  payload: Record<string, unknown>;
};

export type ActivityItem = {
  id: string;
  command: string;
  message: string;
  ok: boolean;
  createdAt: string;
};

export type PeugeotConnection = {
  connected: boolean;
  countryCode: string;
  mypeugeotEmail: string | null;
  vehicleApiId: string | null;
  hasAccessToken: boolean;
  lastSyncAt: string | null;
};

export type VehicleBundle = {
  vehicleId: string;
  vehicle: VehicleState;
  connection: PeugeotConnection;
  schedules: VehicleSchedule[];
  activity: ActivityItem[];
};

function mapSchedule(row: {
  id: string;
  kind: string;
  enabled: boolean;
  time_local: string;
  days_of_week: number[];
  payload: Record<string, unknown> | null;
}): VehicleSchedule {
  return {
    id: row.id,
    kind: row.kind as VehicleSchedule["kind"],
    enabled: row.enabled,
    timeLocal: String(row.time_local).slice(0, 5),
    daysOfWeek: row.days_of_week ?? [1, 2, 3, 4, 5],
    payload: row.payload ?? {},
  };
}

async function ensureVehicle(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ vehicleId: string; vehicle: VehicleState }> {
  const { data: existing, error: findError } = await supabase
    .from("vehicles")
    .select("id, nickname, model, color, vin")
    .eq("user_id", userId)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (!existing) {
    const { data: created, error: createError } = await supabase
      .from("vehicles")
      .insert({
        user_id: userId,
        nickname: "E-3008",
        model: "Peugeot E-3008",
        color: "Obsession Blue",
      })
      .select("id, nickname, model, color, vin")
      .single();

    if (createError || !created) {
      throw new Error(createError?.message ?? "Fahrzeug konnte nicht angelegt werden.");
    }

    const initial = createDefaultVehicleState({
      id: created.id,
      nickname: created.nickname,
      model: created.model,
      color: created.color,
      vin: created.vin ?? "VR3UKZKXZRJxxxxxx",
      mode: "demo",
    });

    const { error: stateError } = await supabase.from("vehicle_state").insert({
      vehicle_id: created.id,
      user_id: userId,
      state: initial,
    });
    if (stateError) {
      throw new Error(stateError.message);
    }

    await supabase.from("peugeot_connections").insert({
      user_id: userId,
      vehicle_id: created.id,
      country_code: "DE",
      connected: false,
    });

    await supabase.from("vehicle_schedules").insert([
      {
        user_id: userId,
        vehicle_id: created.id,
        kind: "charge",
        enabled: true,
        time_local: "22:00",
        days_of_week: [1, 2, 3, 4, 5],
        payload: { chargeLimitPercent: 80 },
      },
      {
        user_id: userId,
        vehicle_id: created.id,
        kind: "climate",
        enabled: false,
        time_local: "07:15",
        days_of_week: [1, 2, 3, 4, 5],
        payload: { targetTempC: 21 },
      },
    ]);

    return { vehicleId: created.id, vehicle: initial };
  }

  const { data: stateRow, error: stateError } = await supabase
    .from("vehicle_state")
    .select("state")
    .eq("vehicle_id", existing.id)
    .maybeSingle();

  if (stateError) {
    throw new Error(stateError.message);
  }

  let vehicle = (stateRow?.state as VehicleState | undefined) ??
    createDefaultVehicleState({
      id: existing.id,
      nickname: existing.nickname,
      model: existing.model,
      color: existing.color,
      vin: existing.vin ?? "VR3UKZKXZRJxxxxxx",
    });

  vehicle = {
    ...vehicle,
    id: existing.id,
    nickname: existing.nickname,
    model: existing.model,
    color: existing.color,
    vin: existing.vin ?? vehicle.vin,
  };

  return { vehicleId: existing.id, vehicle };
}

async function saveState(
  supabase: SupabaseClient,
  userId: string,
  vehicleId: string,
  vehicle: VehicleState,
) {
  const { error } = await supabase.from("vehicle_state").upsert({
    vehicle_id: vehicleId,
    user_id: userId,
    state: vehicle,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function getVehicleBundle(
  supabase: SupabaseClient,
  userId: string,
  options: { forceSync?: boolean } = {},
): Promise<VehicleBundle> {
  const { vehicleId, vehicle: base } = await ensureVehicle(supabase, userId);

  const [{ data: connection }, { data: schedules }, { data: activity }] =
    await Promise.all([
      supabase
        .from("peugeot_connections")
        .select(
          "connected, country_code, mypeugeot_email, vehicle_api_id, access_token, refresh_token, token_expires_at, last_sync_at",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("vehicle_schedules")
        .select("id, kind, enabled, time_local, days_of_week, payload")
        .eq("vehicle_id", vehicleId)
        .order("kind"),
      supabase
        .from("activity_log")
        .select("id, command, message, ok, created_at")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

  const isLive = Boolean(
    connection?.connected && connection.access_token && connection.vehicle_api_id,
  );

  let vehicle: VehicleState = {
    ...base,
    mode: isLive ? "live" : "demo",
  };

  // Demo only: advance charge by elapsed wall-clock time (realistic kW math).
  // Live never simulates SoC — MyPeugeot status is the source of truth.
  if (!isLive) {
    const ticked = tickChargeState(vehicle);
    if (ticked !== vehicle) {
      vehicle = ticked;
      await saveState(supabase, userId, vehicleId, vehicle);
    }
  }

  const lastSyncMs = connection?.last_sync_at
    ? new Date(connection.last_sync_at as string).getTime()
    : 0;
  const chargingNow = vehicle.chargeStatus === "charging";
  // While charging, refresh often; otherwise keep API gentle.
  const syncEveryMs = chargingNow ? 30_000 : 90_000;
  const shouldSync =
    isLive &&
    (options.forceSync ||
      !lastSyncMs ||
      Date.now() - lastSyncMs > syncEveryMs);

  if (shouldSync && connection?.vehicle_api_id && connection.access_token) {
    try {
      const {
        fetchVehicleStatus,
        mapStatusToVehicleState,
        refreshAccessToken,
      } = await import("@/lib/stellantis/api");
      let accessToken = String(connection.access_token);
      const countryCode = String(connection.country_code ?? "DE");
      const expiresAt = connection.token_expires_at
        ? new Date(connection.token_expires_at as string).getTime()
        : 0;
      if (
        connection.refresh_token &&
        expiresAt &&
        expiresAt < Date.now() + 60_000
      ) {
        const refreshed = await refreshAccessToken(
          countryCode,
          String(connection.refresh_token),
        );
        accessToken = refreshed.accessToken;
        await supabase
          .from("peugeot_connections")
          .update({
            access_token: refreshed.accessToken,
            refresh_token: refreshed.refreshToken,
            token_expires_at: refreshed.expiresAt,
          })
          .eq("user_id", userId);
      }

      const status = await fetchVehicleStatus(
        accessToken,
        countryCode,
        String(connection.vehicle_api_id),
      );
      vehicle = mapStatusToVehicleState(
        status,
        { ...vehicle, mode: "live" },
        {
          vehicleId: String(connection.vehicle_api_id),
          vin: vehicle.vin,
        },
      );
      await saveState(supabase, userId, vehicleId, vehicle);
      await supabase
        .from("peugeot_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", userId);
      connection.last_sync_at = new Date().toISOString();
    } catch {
      // Keep last known state if Stellantis is flaky.
    }
  }

  return {
    vehicleId,
    vehicle: { ...vehicle, mode: isLive ? "live" : "demo" },
    connection: {
      connected: Boolean(connection?.connected),
      countryCode: connection?.country_code ?? "DE",
      mypeugeotEmail: connection?.mypeugeot_email ?? null,
      vehicleApiId: connection?.vehicle_api_id ?? null,
      hasAccessToken: Boolean(connection?.access_token),
      lastSyncAt: connection?.last_sync_at ?? null,
    },
    schedules: (schedules ?? []).map(mapSchedule),
    activity: (activity ?? []).map((row) => ({
      id: row.id,
      command: row.command,
      message: row.message,
      ok: row.ok,
      createdAt: row.created_at,
    })),
  };
}

export async function runVehicleCommand(
  supabase: SupabaseClient,
  userId: string,
  request: CommandRequest,
): Promise<CommandResult> {
  const bundle = await getVehicleBundle(supabase, userId);
  const result = applyCommandToState(bundle.vehicle, request);
  await saveState(supabase, userId, bundle.vehicleId, result.vehicle);

  await supabase.from("activity_log").insert({
    user_id: userId,
    vehicle_id: bundle.vehicleId,
    command: request.command,
    message: result.message,
    ok: result.ok,
  });

  return result;
}

export async function updateVehicleProfile(
  supabase: SupabaseClient,
  userId: string,
  input: {
    nickname: string;
    color: string;
    vin?: string;
  },
) {
  const { vehicleId, vehicle } = await ensureVehicle(supabase, userId);
  const { error } = await supabase
    .from("vehicles")
    .update({
      nickname: input.nickname,
      color: input.color,
      vin: input.vin || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const next = {
    ...vehicle,
    nickname: input.nickname,
    color: input.color,
    vin: input.vin || vehicle.vin,
  };
  await saveState(supabase, userId, vehicleId, next);
  return next;
}

export async function updatePeugeotConnection(
  supabase: SupabaseClient,
  userId: string,
  input: {
    countryCode: string;
    mypeugeotEmail: string;
    accessToken?: string;
    vehicleApiId?: string;
    connected: boolean;
  },
) {
  const { vehicleId } = await ensureVehicle(supabase, userId);
  const payload: Record<string, unknown> = {
    user_id: userId,
    vehicle_id: vehicleId,
    country_code: input.countryCode,
    mypeugeot_email: input.mypeugeotEmail || null,
    vehicle_api_id: input.vehicleApiId || null,
    connected: input.connected,
    updated_at: new Date().toISOString(),
    last_sync_at: input.connected ? new Date().toISOString() : null,
  };
  if (typeof input.accessToken === "string") {
    payload.access_token = input.accessToken || null;
  }

  const { error } = await supabase
    .from("peugeot_connections")
    .upsert(payload, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
}

export async function updateSchedule(
  supabase: SupabaseClient,
  userId: string,
  scheduleId: string,
  input: {
    enabled: boolean;
    timeLocal: string;
    daysOfWeek: number[];
    payload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("vehicle_schedules")
    .update({
      enabled: input.enabled,
      time_local: input.timeLocal,
      days_of_week: input.daysOfWeek,
      payload: input.payload ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
