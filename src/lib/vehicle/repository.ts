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
  remoteReady: boolean;
  customerId: string | null;
  /** Seconds between automatic Peugeot status pulls while the control page is open. */
  syncIntervalSec: number;
  /** True when Peugeot OAuth refresh failed and the user must reconnect. */
  needsReconnect: boolean;
};

export type ChargeSample = {
  id: string;
  sessionId: string;
  recordedAt: string;
  batteryPercent: number;
  chargePowerKw: number | null;
  chargeRateKmh: number | null;
  chargingMode: string | null;
  chargeStatus: string;
};

export type VehicleBundle = {
  vehicleId: string;
  vehicle: VehicleState;
  connection: PeugeotConnection;
  schedules: VehicleSchedule[];
  activity: ActivityItem[];
  chargeCurve: ChargeSample[];
  /** Last Peugeot sync error, if any. */
  syncError?: string | null;
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
    chargeRateKmh: vehicle.chargeRateKmh ?? null,
    chargePowerKw: vehicle.chargePowerKw ?? null,
    chargeLimitKnown: vehicle.chargeLimitKnown ?? false,
    preferredChargeLimitPercent:
      vehicle.preferredChargeLimitPercent ?? vehicle.chargeLimitPercent ?? 80,
    chargingMode: vehicle.chargingMode ?? null,
    chargingType: vehicle.chargingType ?? null,
    colorHex: vehicle.colorHex ?? null,
    pictureUrl: vehicle.pictureUrl ?? null,
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

async function recordChargeSample(
  supabase: SupabaseClient,
  userId: string,
  vehicleId: string,
  vehicle: VehicleState,
) {
  const interesting =
    vehicle.chargeStatus === "charging" ||
    vehicle.chargeStatus === "complete";
  if (!interesting) return;

  const { data: last } = await supabase
    .from("charge_samples")
    .select("id, session_id, recorded_at, battery_percent, charge_status")
    .eq("vehicle_id", vehicleId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastAt = last?.recorded_at
    ? new Date(last.recorded_at as string).getTime()
    : 0;
  const ageMs = lastAt ? Date.now() - lastAt : Number.POSITIVE_INFINITY;
  const lastStatus = String(last?.charge_status ?? "");
  const lastPercent = Number(last?.battery_percent ?? NaN);

  // New session when starting to charge after a gap / different phase.
  let sessionId = String(last?.session_id ?? crypto.randomUUID());
  if (
    !last ||
    ageMs > 2 * 60 * 60 * 1000 ||
    (vehicle.chargeStatus === "charging" &&
      lastStatus !== "charging" &&
      lastStatus !== "complete") ||
    (vehicle.chargeStatus === "charging" &&
      lastStatus === "complete" &&
      ageMs > 5 * 60 * 1000)
  ) {
    sessionId = crypto.randomUUID();
  } else if (last?.session_id) {
    sessionId = String(last.session_id);
  }

  // Dedupe near-identical points (keep ~1–2 min resolution).
  if (
    last &&
    ageMs < 50_000 &&
    lastStatus === vehicle.chargeStatus &&
    Number.isFinite(lastPercent) &&
    Math.abs(lastPercent - vehicle.batteryPercent) < 0.3
  ) {
    return;
  }

  await supabase.from("charge_samples").insert({
    user_id: userId,
    vehicle_id: vehicleId,
    session_id: sessionId,
    recorded_at: new Date().toISOString(),
    battery_percent: vehicle.batteryPercent,
    charge_power_kw: vehicle.chargePowerKw,
    charge_rate_kmh: vehicle.chargeRateKmh,
    charging_mode: vehicle.chargingMode,
    charge_status: vehicle.chargeStatus,
  });
}

async function loadChargeCurve(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<ChargeSample[]> {
  const { data: latest } = await supabase
    .from("charge_samples")
    .select("session_id")
    .eq("vehicle_id", vehicleId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest?.session_id) return [];

  const { data: rows } = await supabase
    .from("charge_samples")
    .select(
      "id, session_id, recorded_at, battery_percent, charge_power_kw, charge_rate_kmh, charging_mode, charge_status",
    )
    .eq("vehicle_id", vehicleId)
    .eq("session_id", latest.session_id)
    .order("recorded_at", { ascending: true })
    .limit(400);

  return (rows ?? []).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    recordedAt: row.recorded_at,
    batteryPercent: Number(row.battery_percent),
    chargePowerKw:
      row.charge_power_kw == null ? null : Number(row.charge_power_kw),
    chargeRateKmh:
      row.charge_rate_kmh == null ? null : Number(row.charge_rate_kmh),
    chargingMode: row.charging_mode ?? null,
    chargeStatus: row.charge_status,
  }));
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
          "connected, country_code, mypeugeot_email, vehicle_api_id, access_token, refresh_token, token_expires_at, last_sync_at, remote_ready, customer_id, otp_state, remote_access_token, remote_refresh_token, remote_token_updated_at, sync_interval_sec, oauth_meta",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("vehicle_schedules")
        .select("id, kind, enabled, time_local, days_of_week, payload")
        .eq("vehicle_id", vehicleId)
        .order("kind")
        .order("time_local"),
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
  const configuredIntervalSec = clampSyncInterval(
    Number(connection?.sync_interval_sec ?? 45),
  );
  // Server throttle: respect setting, but never hammer harder than every 20s.
  const syncEveryMs = chargingNow
    ? Math.min(configuredIntervalSec, 30) * 1000
    : configuredIntervalSec * 1000;
  const shouldSync =
    isLive &&
    (options.forceSync ||
      !lastSyncMs ||
      Date.now() - lastSyncMs > syncEveryMs);

  let didUpdateVehicle = !isLive && vehicle.chargeStatus === "charging";
  let syncError: string | null = null;
  const oauthMeta = asOAuthMeta(connection?.oauth_meta);
  const needsReconnect = Boolean(oauthMeta.needsReconnect);

  if (needsReconnect) {
    syncError =
      typeof oauthMeta.authError === "string" && oauthMeta.authError
        ? oauthMeta.authError
        : "MyPeugeot-Anmeldung abgelaufen. Bitte unter Einstellungen neu verbinden.";
  } else if (shouldSync && connection?.vehicle_api_id && connection.access_token) {
    try {
      const {
        fetchVehicleDetails,
        fetchVehicleStatus,
        mapStatusToVehicleStateWithAddress,
      } = await import("@/lib/stellantis/api");
      const countryCode = String(connection.country_code ?? "DE");
      const accessToken = await ensurePeugeotAccessToken(supabase, userId, {
        accessToken: String(connection.access_token),
        refreshToken: connection.refresh_token
          ? String(connection.refresh_token)
          : null,
        tokenExpiresAt: connection.token_expires_at
          ? String(connection.token_expires_at)
          : null,
        countryCode,
        oauthMeta,
      });

      const needsPaint =
        options.forceSync ||
        !vehicle.pictureUrl ||
        !vehicle.colorHex ||
        /obsession/i.test(vehicle.color);

      let paintColor = vehicle.color;
      let paintHex = vehicle.colorHex;
      let pictureUrl = vehicle.pictureUrl;
      if (needsPaint) {
        try {
          const details = await fetchVehicleDetails(
            accessToken,
            countryCode,
            String(connection.vehicle_api_id),
          );
          if (details?.color) paintColor = details.color;
          if (details?.colorHex) paintHex = details.colorHex;
          if (details?.pictureUrl) pictureUrl = details.pictureUrl;
          if (details?.vin) vehicle = { ...vehicle, vin: details.vin };
          if (details?.color) {
            await supabase
              .from("vehicles")
              .update({
                color: details.color,
                vin: details.vin ?? vehicle.vin,
                updated_at: new Date().toISOString(),
              })
              .eq("id", vehicleId)
              .eq("user_id", userId);
          }
        } catch {
          // Paint metadata is optional.
        }
      }

      const status = await fetchVehicleStatus(
        accessToken,
        countryCode,
        String(connection.vehicle_api_id),
      );

      vehicle = await mapStatusToVehicleStateWithAddress(
        status,
        {
          ...vehicle,
          mode: "live",
          color: paintColor,
          colorHex: paintHex,
          pictureUrl,
        },
        {
          vehicleId: String(connection.vehicle_api_id),
          vin: vehicle.vin,
        },
      );
      vehicle = {
        ...vehicle,
        color: paintColor,
        colorHex: paintHex,
        pictureUrl,
      };
      await saveState(supabase, userId, vehicleId, vehicle);
      await supabase
        .from("peugeot_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", userId);
      connection.last_sync_at = new Date().toISOString();
      didUpdateVehicle = true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Fahrzeugstatus konnte nicht geladen werden.";
      syncError = message;
    }
  }

  if (
    didUpdateVehicle ||
    vehicle.chargeStatus === "charging" ||
    vehicle.chargeStatus === "complete"
  ) {
    try {
      await recordChargeSample(supabase, userId, vehicleId, vehicle);
    } catch {
      // Curve sampling must never break the dashboard.
    }
  }

  const chargeCurve = await loadChargeCurve(supabase, vehicleId);
  const reconnectNeeded =
    needsReconnect ||
    Boolean(syncError && /neu verbinden|abgelaufen|invalid_grant|grant invalid/i.test(syncError));

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
      remoteReady: Boolean(connection?.remote_ready),
      customerId: connection?.customer_id ?? null,
      syncIntervalSec: clampSyncInterval(
        Number(connection?.sync_interval_sec ?? 45),
      ),
      needsReconnect: reconnectNeeded,
    },
    schedules: (schedules ?? []).map(mapSchedule),
    activity: (activity ?? []).map((row) => ({
      id: row.id,
      command: row.command,
      message: row.message,
      ok: row.ok,
      createdAt: row.created_at,
    })),
    chargeCurve,
    syncError,
  };
}

function asOAuthMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Refresh Peugeot access token when near expiry. Re-reads DB first to avoid
 * invalidating a rotated refresh token when two syncs race.
 */
async function ensurePeugeotAccessToken(
  supabase: SupabaseClient,
  userId: string,
  current: {
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: string | null;
    countryCode: string;
    oauthMeta: Record<string, unknown>;
  },
): Promise<string> {
  const {
    humanizePeugeotOAuthError,
    isPeugeotAuthFailure,
    refreshAccessToken,
  } = await import("@/lib/stellantis/api");

  if (current.oauthMeta.needsReconnect) {
    throw new Error(
      typeof current.oauthMeta.authError === "string" &&
        current.oauthMeta.authError
        ? current.oauthMeta.authError
        : "MyPeugeot-Anmeldung abgelaufen. Bitte unter Einstellungen neu verbinden.",
    );
  }

  const expiresAt = current.tokenExpiresAt
    ? new Date(current.tokenExpiresAt).getTime()
    : 0;
  if (expiresAt >= Date.now() + 60_000) {
    return current.accessToken;
  }
  if (!current.refreshToken) {
    throw new Error(
      "MyPeugeot-Anmeldung abgelaufen. Bitte unter Einstellungen neu verbinden.",
    );
  }

  // Another request may have refreshed already — use the freshest row.
  const { data: fresh } = await supabase
    .from("peugeot_connections")
    .select("access_token, refresh_token, token_expires_at, oauth_meta")
    .eq("user_id", userId)
    .maybeSingle();

  const freshMeta = asOAuthMeta(fresh?.oauth_meta);
  if (freshMeta.needsReconnect) {
    throw new Error(
      typeof freshMeta.authError === "string" && freshMeta.authError
        ? freshMeta.authError
        : "MyPeugeot-Anmeldung abgelaufen. Bitte unter Einstellungen neu verbinden.",
    );
  }

  const freshExpires = fresh?.token_expires_at
    ? new Date(fresh.token_expires_at as string).getTime()
    : 0;
  if (fresh?.access_token && freshExpires >= Date.now() + 60_000) {
    return String(fresh.access_token);
  }

  const refreshToken = String(
    fresh?.refresh_token ?? current.refreshToken,
  );

  try {
    const refreshed = await refreshAccessToken(
      current.countryCode,
      refreshToken,
    );
    await supabase
      .from("peugeot_connections")
      .update({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        token_expires_at: refreshed.expiresAt,
        oauth_meta: {
          ...freshMeta,
          needsReconnect: false,
          authError: null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    return refreshed.accessToken;
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    const message = humanizePeugeotOAuthError(raw);
    if (isPeugeotAuthFailure(raw) || isPeugeotAuthFailure(message)) {
      await supabase
        .from("peugeot_connections")
        .update({
          oauth_meta: {
            ...freshMeta,
            needsReconnect: true,
            authError: message,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
    throw new Error(message);
  }
}

function clampSyncInterval(sec: number): number {
  if (!Number.isFinite(sec)) return 45;
  return Math.min(600, Math.max(15, Math.round(sec)));
}

export async function runVehicleCommand(
  supabase: SupabaseClient,
  userId: string,
  request: CommandRequest,
): Promise<CommandResult> {
  const bundle = await getVehicleBundle(supabase, userId);

  if (
    bundle.vehicle.mode === "live" &&
    (request.command === "climate_start" || request.command === "climate_stop")
  ) {
    const live = await runLiveClimateCommand(
      supabase,
      userId,
      bundle,
      request.command === "climate_start",
    );
    await saveState(supabase, userId, bundle.vehicleId, live.vehicle);
    await supabase.from("activity_log").insert({
      user_id: userId,
      vehicle_id: bundle.vehicleId,
      command: request.command,
      message: live.message,
      ok: live.ok,
    });
    return live;
  }

  const result = applyCommandToState(bundle.vehicle, request);
  await saveState(supabase, userId, bundle.vehicleId, result.vehicle);

  try {
    await recordChargeSample(
      supabase,
      userId,
      bundle.vehicleId,
      result.vehicle,
    );
  } catch {
    // ignore
  }

  await supabase.from("activity_log").insert({
    user_id: userId,
    vehicle_id: bundle.vehicleId,
    command: request.command,
    message: result.message,
    ok: result.ok,
  });

  return result;
}

async function runLiveClimateCommand(
  supabase: SupabaseClient,
  userId: string,
  bundle: VehicleBundle,
  activate: boolean,
): Promise<CommandResult> {
  const { data: connection } = await supabase
    .from("peugeot_connections")
    .select(
      "connected, country_code, access_token, refresh_token, token_expires_at, customer_id, remote_ready, otp_state, remote_access_token, remote_refresh_token, remote_token_updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection?.connected || !connection.remote_ready) {
    return {
      ok: false,
      message: "Fernbedienung noch nicht eingerichtet.",
      vehicle: bundle.vehicle,
    };
  }
  if (!connection.customer_id || !connection.otp_state) {
    return {
      ok: false,
      message: "Fernbedienung unvollständig — bitte PIN erneut einrichten.",
      vehicle: bundle.vehicle,
    };
  }

  try {
    const { refreshAccessToken } = await import("@/lib/stellantis/api");
    const { refreshRemoteToken, sendThermalPreconditioning } = await import(
      "@/lib/stellantis/remote"
    );
    const { touchClimate } = await import("@/lib/vehicle/commands");

    let oauthToken = String(connection.access_token ?? "");
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
      oauthToken = refreshed.accessToken;
      await supabase
        .from("peugeot_connections")
        .update({
          access_token: refreshed.accessToken,
          refresh_token: refreshed.refreshToken,
          token_expires_at: refreshed.expiresAt,
        })
        .eq("user_id", userId);
    }

    let remoteAccess = String(connection.remote_access_token ?? "");
    let remoteRefresh = String(connection.remote_refresh_token ?? "");
    let otpState = connection.otp_state as import("@/lib/stellantis/otp/session").OtpPersistedState;
    const remoteAge = connection.remote_token_updated_at
      ? Date.now() - new Date(connection.remote_token_updated_at as string).getTime()
      : Number.POSITIVE_INFINITY;

    if (!remoteAccess || remoteAge > 14 * 60_000) {
      const refreshed = await refreshRemoteToken({
        oauthAccessToken: oauthToken,
        countryCode,
        remoteRefreshToken: remoteRefresh,
        otpState,
      });
      remoteAccess = refreshed.remote.accessToken;
      remoteRefresh = refreshed.remote.refreshToken;
      otpState = refreshed.otpState;
      await supabase
        .from("peugeot_connections")
        .update({
          remote_access_token: remoteAccess,
          remote_refresh_token: remoteRefresh,
          remote_token_updated_at: refreshed.remote.updatedAt,
          otp_state: otpState,
        })
        .eq("user_id", userId);
    }

    await sendThermalPreconditioning({
      customerId: String(connection.customer_id),
      vin: bundle.vehicle.vin,
      remoteAccessToken: remoteAccess,
      activate,
    });

    return {
      ok: true,
      message: activate ? "Vorklima gestartet." : "Vorklima gestoppt.",
      vehicle: touchClimate(bundle.vehicle, activate),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Vorklima-Befehl fehlgeschlagen.",
      vehicle: bundle.vehicle,
    };
  }
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

export async function updateSyncInterval(
  supabase: SupabaseClient,
  userId: string,
  syncIntervalSec: number,
) {
  const sec = clampSyncInterval(syncIntervalSec);
  const { error } = await supabase
    .from("peugeot_connections")
    .update({
      sync_interval_sec: sec,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return sec;
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

export async function createSchedule(
  supabase: SupabaseClient,
  userId: string,
  input: {
    kind: VehicleSchedule["kind"];
    enabled?: boolean;
    timeLocal?: string;
    daysOfWeek?: number[];
    payload?: Record<string, unknown>;
  },
): Promise<VehicleSchedule> {
  const { vehicleId } = await ensureVehicle(supabase, userId);
  const defaults: Record<
    VehicleSchedule["kind"],
    { timeLocal: string; payload: Record<string, unknown> }
  > = {
    charge: { timeLocal: "22:00", payload: { chargeLimitPercent: 80 } },
    climate: { timeLocal: "07:15", payload: { targetTempC: 21 } },
    battery_preheat: { timeLocal: "06:45", payload: {} },
  };
  const preset = defaults[input.kind];

  const { data, error } = await supabase
    .from("vehicle_schedules")
    .insert({
      user_id: userId,
      vehicle_id: vehicleId,
      kind: input.kind,
      enabled: input.enabled ?? true,
      time_local: input.timeLocal ?? preset.timeLocal,
      days_of_week: input.daysOfWeek ?? [1, 2, 3, 4, 5],
      payload: input.payload ?? preset.payload,
    })
    .select("id, kind, enabled, time_local, days_of_week, payload")
    .single();

  if (error) throw new Error(error.message);
  return mapSchedule(data);
}

export async function deleteSchedule(
  supabase: SupabaseClient,
  userId: string,
  scheduleId: string,
) {
  const { error } = await supabase
    .from("vehicle_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
