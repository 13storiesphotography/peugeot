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

export type HardRefreshInfo = {
  /** Peugeot /status was pulled at least once. */
  statusOk: boolean;
  /** MQTT wake was attempted. */
  wakeAttempted: boolean;
  /** MQTT wake result (null if not attempted). */
  wakeOk: boolean | null;
  /** Why wake was skipped, if applicable. */
  wakeSkippedReason?: string;
  /** Age of vehicle.lastUpdatedAt after the hard refresh, in minutes. */
  ageMinutes: number;
  /** True when lastUpdatedAt moved forward vs the pre-wake snapshot. */
  improved: boolean;
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
  /** Present after a manual hard refresh (`?hard=1`). */
  hardRefresh?: HardRefreshInfo;
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
        payload: {},
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
    outdoorTempC: (() => {
      if (typeof vehicle.outdoorTempC === "number") return vehicle.outdoorTempC;
      const legacy = vehicle as unknown as { cabinTempC?: number };
      if (typeof legacy.cabinTempC === "number") return legacy.cabinTempC;
      return 18;
    })(),
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
  options: { forceSync?: boolean; hardRefresh?: boolean } = {},
): Promise<VehicleBundle> {
  if (options.hardRefresh) {
    return hardRefreshVehicle(supabase, userId);
  }
  return loadVehicleBundle(supabase, userId, {
    forceSync: options.forceSync,
  });
}

/** Lightweight settings payload — DB only, never hits Peugeot APIs. */
export type SettingsBundle = {
  vehicle: Pick<
    VehicleState,
    "id" | "nickname" | "model" | "color" | "vin" | "mode"
  >;
  connection: PeugeotConnection;
};

export async function getSettingsBundle(
  supabase: SupabaseClient,
  userId: string,
): Promise<SettingsBundle> {
  const { vehicleId, vehicle: base } = await ensureVehicle(supabase, userId);

  const { data: connection } = await supabase
    .from("peugeot_connections")
    .select(
      "connected, country_code, mypeugeot_email, vehicle_api_id, access_token, last_sync_at, remote_ready, customer_id, sync_interval_sec, oauth_meta",
    )
    .eq("user_id", userId)
    .maybeSingle();

  const oauthMeta = asOAuthMeta(connection?.oauth_meta);
  const needsReconnect = Boolean(oauthMeta.needsReconnect);
  const isLive = Boolean(
    connection?.connected && connection.access_token && connection.vehicle_api_id,
  );

  return {
    vehicle: {
      id: vehicleId,
      nickname: base.nickname,
      model: base.model,
      color: base.color,
      vin: base.vin,
      mode: isLive ? "live" : "demo",
    },
    connection: {
      connected: Boolean(connection?.connected),
      countryCode: String(connection?.country_code ?? "DE"),
      mypeugeotEmail: connection?.mypeugeot_email
        ? String(connection.mypeugeot_email)
        : null,
      vehicleApiId: connection?.vehicle_api_id
        ? String(connection.vehicle_api_id)
        : null,
      hasAccessToken: Boolean(connection?.access_token),
      lastSyncAt: connection?.last_sync_at
        ? String(connection.last_sync_at)
        : null,
      remoteReady: Boolean(connection?.remote_ready),
      customerId: connection?.customer_id
        ? String(connection.customer_id)
        : null,
      syncIntervalSec: clampSyncInterval(
        Number(connection?.sync_interval_sec ?? 60),
      ),
      needsReconnect,
    },
  };
}

async function loadVehicleBundle(
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
    Number(connection?.sync_interval_sec ?? 60),
  );
  // Server throttle: respect setting. While charging, allow up to every 30s.
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
      // Do not auto-replace climate schedules here — that undoes deletes in the
      // app. Import only via „Pläne vom Fahrzeug laden“.
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

  const { data: scheduleRows } = await supabase
    .from("vehicle_schedules")
    .select("id, kind, enabled, time_local, days_of_week, payload")
    .eq("vehicle_id", vehicleId)
    .order("kind")
    .order("time_local");

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
        Number(connection?.sync_interval_sec ?? 60),
      ),
      needsReconnect: reconnectNeeded,
    },
    schedules: (scheduleRows ?? schedules ?? []).map(mapSchedule),
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ageMinutesFromIso(iso: string): number {
  return Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60_000),
  );
}

/**
 * Manual hard refresh: pull Peugeot status, optionally wake the car via MQTT,
 * wait, and pull again so sleeping vehicles can push a fresher snapshot.
 */
async function hardRefreshVehicle(
  supabase: SupabaseClient,
  userId: string,
): Promise<VehicleBundle> {
  const before = await loadVehicleBundle(supabase, userId, { forceSync: true });
  const prevUpdatedAt = before.vehicle.lastUpdatedAt;

  if (!before.connection.connected || before.connection.needsReconnect) {
    return {
      ...before,
      hardRefresh: {
        statusOk: !before.syncError,
        wakeAttempted: false,
        wakeOk: null,
        wakeSkippedReason: before.connection.needsReconnect
          ? "MyPeugeot-Anmeldung abgelaufen."
          : "Nicht mit MyPeugeot verbunden.",
        ageMinutes: ageMinutesFromIso(before.vehicle.lastUpdatedAt),
        improved: false,
      },
    };
  }

  if (before.vehicle.mode !== "live") {
    return {
      ...before,
      hardRefresh: {
        statusOk: true,
        wakeAttempted: false,
        wakeOk: null,
        wakeSkippedReason: "Demo-Modus — kein Fahrzeug-Wake.",
        ageMinutes: ageMinutesFromIso(before.vehicle.lastUpdatedAt),
        improved: false,
      },
    };
  }

  let wakeAttempted = false;
  let wakeOk: boolean | null = null;
  let wakeSkippedReason: string | undefined;

  const remote = await ensureLiveRemoteSession(supabase, userId, before);
  if (!remote.ok) {
    wakeSkippedReason = remote.message;
  } else {
    wakeAttempted = true;
    try {
      const { sendVehicleWakeup } = await import("@/lib/stellantis/remote");
      await sendVehicleWakeup({
        customerId: remote.customerId,
        vin: remote.vin,
        remoteAccessToken: remote.remoteAccessToken,
      });
      wakeOk = true;
    } catch (error) {
      wakeOk = false;
      wakeSkippedReason =
        error instanceof Error ? error.message : "Aufwecken fehlgeschlagen.";
    }
  }

  // Give the car/cloud time to publish after wake (or catch a delayed status).
  await sleep(wakeOk ? 10_000 : 4_000);
  let after = await loadVehicleBundle(supabase, userId, { forceSync: true });
  let improved =
    new Date(after.vehicle.lastUpdatedAt).getTime() >
    new Date(prevUpdatedAt).getTime();

  if (wakeOk && !improved) {
    await sleep(8_000);
    after = await loadVehicleBundle(supabase, userId, { forceSync: true });
    improved =
      new Date(after.vehicle.lastUpdatedAt).getTime() >
      new Date(prevUpdatedAt).getTime();
  }

  return {
    ...after,
    hardRefresh: {
      statusOk: !after.syncError,
      wakeAttempted,
      wakeOk,
      wakeSkippedReason,
      ageMinutes: ageMinutesFromIso(after.vehicle.lastUpdatedAt),
      improved,
    },
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
    // Compare-and-swap: only write if another request did not rotate first.
    const { data: updated, error: updateError } = await supabase
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
      .eq("user_id", userId)
      .eq("refresh_token", refreshToken)
      .select("access_token")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updated?.access_token) {
      // Lost the race — read the winner's token.
      const { data: winner } = await supabase
        .from("peugeot_connections")
        .select("access_token, token_expires_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (winner?.access_token) return String(winner.access_token);
    }
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
  if (!Number.isFinite(sec)) return 60;
  // Floor 30s — Peugeot status rarely changes faster when parked/asleep.
  return Math.min(600, Math.max(30, Math.round(sec)));
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

  if (bundle.vehicle.mode === "live" && request.command === "wakeup") {
    const live = await runLiveWakeupCommand(supabase, userId, bundle);
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

  if (
    bundle.vehicle.mode === "live" &&
    (request.command === "lock" ||
      request.command === "unlock" ||
      request.command === "horn" ||
      request.command === "flash")
  ) {
    const live = await runLiveRemoteSignalCommand(
      supabase,
      userId,
      bundle,
      request.command,
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

type LiveRemoteSession =
  | {
      ok: true;
      customerId: string;
      vin: string;
      remoteAccessToken: string;
    }
  | { ok: false; message: string };

async function ensureLiveRemoteSession(
  supabase: SupabaseClient,
  userId: string,
  bundle: VehicleBundle,
): Promise<LiveRemoteSession> {
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
      message:
        "Fernbedienung noch nicht eingerichtet — unter Einstellungen PIN freischalten.",
    };
  }
  if (!connection.customer_id || !connection.otp_state) {
    return {
      ok: false,
      message: "Fernbedienung unvollständig — bitte PIN erneut einrichten.",
    };
  }
  if (!bundle.vehicle.vin || /x{4,}/i.test(bundle.vehicle.vin)) {
    return {
      ok: false,
      message: "VIN fehlt — bitte Fahrzeugdaten aktualisieren.",
    };
  }

  try {
    const { refreshAccessToken } = await import("@/lib/stellantis/api");
    const { refreshRemoteToken } = await import("@/lib/stellantis/remote");

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
    // MQTT tokens last ~15 min; refresh before every remote command so wake /
    // climate never reuse a nearly-expired or rotated access token.
    if (!remoteRefresh) {
      return {
        ok: false,
        message: "Fernbedienung unvollständig — bitte PIN erneut einrichten.",
      };
    }
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

    return {
      ok: true,
      customerId: String(connection.customer_id),
      vin: bundle.vehicle.vin,
      remoteAccessToken: remoteAccess,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Fernbedienung konnte nicht vorbereitet werden.",
    };
  }
}

async function runLiveWakeupCommand(
  supabase: SupabaseClient,
  userId: string,
  bundle: VehicleBundle,
): Promise<CommandResult> {
  const remote = await ensureLiveRemoteSession(supabase, userId, bundle);
  if (!remote.ok) {
    return { ok: false, message: remote.message, vehicle: bundle.vehicle };
  }
  try {
    const { sendVehicleWakeup } = await import("@/lib/stellantis/remote");
    await sendVehicleWakeup({
      customerId: remote.customerId,
      vin: remote.vin,
      remoteAccessToken: remote.remoteAccessToken,
    });
    return {
      ok: true,
      message: "Aufweck-Befehl gesendet — Stand folgt in wenigen Sekunden.",
      vehicle: bundle.vehicle,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Aufwecken fehlgeschlagen.",
      vehicle: bundle.vehicle,
    };
  }
}

async function runLiveRemoteSignalCommand(
  supabase: SupabaseClient,
  userId: string,
  bundle: VehicleBundle,
  command: "lock" | "unlock" | "horn" | "flash",
): Promise<CommandResult> {
  const remote = await ensureLiveRemoteSession(supabase, userId, bundle);
  if (!remote.ok) {
    return { ok: false, message: remote.message, vehicle: bundle.vehicle };
  }

  try {
    const { sendDoorLock, sendHorn, sendLights } = await import(
      "@/lib/stellantis/remote"
    );
    const { touchLock } = await import("@/lib/vehicle/commands");

    if (command === "lock" || command === "unlock") {
      await sendDoorLock({
        customerId: remote.customerId,
        vin: remote.vin,
        remoteAccessToken: remote.remoteAccessToken,
        lock: command === "lock",
      });
      return {
        ok: true,
        message:
          command === "lock" ? "Türen verriegelt." : "Türen entriegelt.",
        vehicle: touchLock(bundle.vehicle, command === "lock"),
      };
    }

    if (command === "horn") {
      await sendHorn({
        customerId: remote.customerId,
        vin: remote.vin,
        remoteAccessToken: remote.remoteAccessToken,
        count: 2,
      });
      return {
        ok: true,
        message: "Hupe ausgelöst.",
        vehicle: bundle.vehicle,
      };
    }

    await sendLights({
      customerId: remote.customerId,
      vin: remote.vin,
      remoteAccessToken: remote.remoteAccessToken,
      durationSec: 10,
    });
    return {
      ok: true,
      message: "Lichter geblinkt.",
      vehicle: bundle.vehicle,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? humanizeRemoteSignalError(error.message)
          : "Fernbefehl fehlgeschlagen.",
      vehicle: bundle.vehicle,
    };
  }
}

function humanizeRemoteSignalError(message: string): string {
  if (/no\.matching\.service\.key|authorization\.denied/i.test(message)) {
    return "Fernbedienung für Schloss/Signal nicht freigeschaltet (Connect Plus / Remote Control).";
  }
  if (/Remote-Fehler 400/i.test(message)) {
    return "Befehl abgelehnt — Fernbedienung erneuern (Einstellungen → PIN).";
  }
  return message;
}

async function runLiveClimateCommand(
  supabase: SupabaseClient,
  userId: string,
  bundle: VehicleBundle,
  activate: boolean,
): Promise<CommandResult> {
  const remote = await ensureLiveRemoteSession(supabase, userId, bundle);
  if (!remote.ok) {
    return { ok: false, message: remote.message, vehicle: bundle.vehicle };
  }

  try {
    const {
      climateSchedulesToPrograms,
      emptyPrecondPrograms,
      sendThermalPreconditioning,
    } = await import("@/lib/stellantis/remote");
    const { touchClimate } = await import("@/lib/vehicle/commands");

    const climateSchedules = await listClimateSchedules(supabase, userId);
    // Prefer app Klima plans; if none, keep Peugeot slots so start/stop
    // does not wipe MyPeugeot schedules.
    const programs =
      climateSchedules.length > 0
        ? climateSchedulesToPrograms(climateSchedules)
        : ((await tryLoadVehiclePrograms(supabase, userId, bundle)) ??
          emptyPrecondPrograms());

    await sendThermalPreconditioning({
      customerId: remote.customerId,
      vin: remote.vin,
      remoteAccessToken: remote.remoteAccessToken,
      activate,
      programs,
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
        error instanceof Error
          ? error.message
          : "Vorklima-Befehl fehlgeschlagen.",
      vehicle: bundle.vehicle,
    };
  }
}

async function tryLoadVehiclePrograms(
  supabase: SupabaseClient,
  userId: string,
  bundle: VehicleBundle,
) {
  if (!bundle.connection.vehicleApiId || !bundle.connection.hasAccessToken) {
    return null;
  }
  try {
    const { data: connection } = await supabase
      .from("peugeot_connections")
      .select(
        "access_token, refresh_token, token_expires_at, country_code, vehicle_api_id, oauth_meta",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (!connection?.access_token || !connection.vehicle_api_id) return null;

    const accessToken = await ensurePeugeotAccessToken(supabase, userId, {
      accessToken: String(connection.access_token),
      refreshToken: connection.refresh_token
        ? String(connection.refresh_token)
        : null,
      tokenExpiresAt: connection.token_expires_at
        ? String(connection.token_expires_at)
        : null,
      countryCode: String(connection.country_code ?? "DE"),
      oauthMeta: asOAuthMeta(connection.oauth_meta),
    });
    const { fetchVehicleStatus } = await import("@/lib/stellantis/api");
    const { programsFromVehicleStatus } = await import(
      "@/lib/stellantis/remote"
    );
    const status = await fetchVehicleStatus(
      accessToken,
      String(connection.country_code ?? "DE"),
      String(connection.vehicle_api_id),
    );
    return programsFromVehicleStatus(status);
  } catch {
    return null;
  }
}

async function listClimateSchedules(
  supabase: SupabaseClient,
  userId: string,
): Promise<VehicleSchedule[]> {
  const { data, error } = await supabase
    .from("vehicle_schedules")
    .select("id, kind, enabled, time_local, days_of_week, payload")
    .eq("user_id", userId)
    .eq("kind", "climate")
    .order("time_local");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSchedule);
}

/**
 * Replace app climate schedules with programs from a Peugeot status payload.
 * Vehicle is source of truth for onboard Vorklima plans.
 */
async function replaceClimateSchedulesFromStatus(
  supabase: SupabaseClient,
  userId: string,
  vehicleId: string,
  status: unknown,
): Promise<{ schedules: VehicleSchedule[]; imported: number; error?: string }> {
  const { climateScheduleDraftsFromStatus } = await import(
    "@/lib/stellantis/remote"
  );
  const drafts = climateScheduleDraftsFromStatus(status);
  // Keep existing app plans when Peugeot returns no programs (common on
  // soft/cached status). Manual import surfaces this as a message instead.
  if (!drafts.length) {
    return {
      schedules: await listClimateSchedules(supabase, userId),
      imported: 0,
    };
  }

  const { error: delError } = await supabase
    .from("vehicle_schedules")
    .delete()
    .eq("user_id", userId)
    .eq("kind", "climate");
  if (delError) {
    return {
      schedules: await listClimateSchedules(supabase, userId),
      imported: 0,
      error: delError.message,
    };
  }

  const rows = drafts.map((draft) => ({
    user_id: userId,
    vehicle_id: vehicleId,
    kind: "climate" as const,
    enabled: draft.enabled,
    time_local: draft.timeLocal,
    days_of_week: draft.daysOfWeek,
    payload: {
      source: "vehicle",
      slot: draft.slot,
    },
  }));

  const { data, error } = await supabase
    .from("vehicle_schedules")
    .insert(rows)
    .select("id, kind, enabled, time_local, days_of_week, payload");
  if (error) {
    return {
      schedules: await listClimateSchedules(supabase, userId),
      imported: 0,
      error: error.message,
    };
  }
  return { schedules: (data ?? []).map(mapSchedule), imported: drafts.length };
}

/** Force-pull vehicle status and import Vorklima programs into the app. */
export async function importClimateSchedulesFromVehicle(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ schedules: VehicleSchedule[]; imported: number; message: string }> {
  const { vehicleId, vehicle } = await ensureVehicle(supabase, userId);

  const { data: connection } = await supabase
    .from("peugeot_connections")
    .select(
      "connected, country_code, vehicle_api_id, access_token, refresh_token, token_expires_at, oauth_meta, remote_ready, customer_id, otp_state, remote_access_token, remote_refresh_token",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!connection?.connected || !connection.access_token || !connection.vehicle_api_id) {
    return {
      schedules: await listClimateSchedules(supabase, userId),
      imported: 0,
      message: "MyPeugeot nicht verbunden.",
    };
  }

  const oauthMeta = asOAuthMeta(connection.oauth_meta);
  if (oauthMeta.needsReconnect) {
    return {
      schedules: await listClimateSchedules(supabase, userId),
      imported: 0,
      message: "MyPeugeot-Anmeldung abgelaufen — bitte neu verbinden.",
    };
  }

  try {
    const { fetchVehicleStatus } = await import("@/lib/stellantis/api");
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

    // Wake so Peugeot pushes a fresh preconditioning snapshot when possible.
    if (connection.remote_ready && vehicle.vin && !/x{4,}/i.test(vehicle.vin)) {
      try {
        const bundle = await getVehicleBundle(supabase, userId);
        const remote = await ensureLiveRemoteSession(supabase, userId, bundle);
        if (remote.ok) {
          const { sendVehicleWakeup } = await import("@/lib/stellantis/remote");
          await sendVehicleWakeup({
            customerId: remote.customerId,
            vin: remote.vin,
            remoteAccessToken: remote.remoteAccessToken,
          });
          await new Promise((r) => setTimeout(r, 8_000));
        }
      } catch {
        // Wake is best-effort — status may still be current.
      }
    }

    const status = await fetchVehicleStatus(
      accessToken,
      countryCode,
      String(connection.vehicle_api_id),
    );

    const result = await replaceClimateSchedulesFromStatus(
      supabase,
      userId,
      vehicleId,
      status,
    );

    await supabase
      .from("peugeot_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (result.error && result.imported === 0) {
      return {
        schedules: result.schedules,
        imported: 0,
        message: result.error,
      };
    }

    return {
      schedules: result.schedules,
      imported: result.imported,
      message:
        result.imported > 0
          ? `${result.imported} Vorklima-Plan${result.imported === 1 ? "" : "e"} vom Fahrzeug übernommen.`
          : "Keine Vorklima-Programme vom Fahrzeug.",
    };
  } catch (error) {
    return {
      schedules: await listClimateSchedules(supabase, userId),
      imported: 0,
      message:
        error instanceof Error
          ? error.message
          : "Import vom Fahrzeug fehlgeschlagen.",
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

/** Push Klima Zeitpläne to the car’s 4 ThermalPrecond slots (when remote ready). */
async function syncClimateProgramsToVehicle(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const bundle = await getVehicleBundle(supabase, userId);
  if (bundle.vehicle.mode !== "live") {
    return { ok: true };
  }
  if (!bundle.connection.remoteReady) {
    return {
      ok: false,
      message:
        "Zeitplan gespeichert, aber Fernbedienung fehlt — Pläne gehen noch nicht ans Auto.",
    };
  }

  const remote = await ensureLiveRemoteSession(supabase, userId, bundle);
  if (!remote.ok) {
    return { ok: false, message: remote.message };
  }

  try {
    const {
      climateSchedulesToPrograms,
      sendThermalPreconditioningPrograms,
    } = await import("@/lib/stellantis/remote");
    const programs = climateSchedulesToPrograms(
      await listClimateSchedules(supabase, userId),
    );
    await sendThermalPreconditioningPrograms({
      customerId: remote.customerId,
      vin: remote.vin,
      remoteAccessToken: remote.remoteAccessToken,
      programs,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Zeitplan gespeichert, Sync ans Auto fehlgeschlagen.",
    };
  }
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
): Promise<{ vehicleSyncWarning?: string }> {
  const { data: existing } = await supabase
    .from("vehicle_schedules")
    .select("kind")
    .eq("id", scheduleId)
    .eq("user_id", userId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    enabled: input.enabled,
    time_local: input.timeLocal,
    days_of_week: input.daysOfWeek,
    updated_at: new Date().toISOString(),
  };
  if (input.payload) {
    const payload = { ...input.payload };
    delete payload.targetTempC;
    // Edits in the app are app-owned going forward.
    if (existing?.kind === "climate") {
      payload.source = "app";
    }
    patch.payload = payload;
  }

  const { error } = await supabase
    .from("vehicle_schedules")
    .update(patch)
    .eq("id", scheduleId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  if (existing?.kind === "climate") {
    const sync = await syncClimateProgramsToVehicle(supabase, userId);
    if (!sync.ok) return { vehicleSyncWarning: sync.message };
  }
  return {};
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
): Promise<{ schedule: VehicleSchedule; vehicleSyncWarning?: string }> {
  const { vehicleId } = await ensureVehicle(supabase, userId);
  const defaults: Record<
    VehicleSchedule["kind"],
    { timeLocal: string; payload: Record<string, unknown> }
  > = {
    charge: { timeLocal: "22:00", payload: { chargeLimitPercent: 80 } },
    climate: { timeLocal: "07:15", payload: { source: "app" } },
    battery_preheat: { timeLocal: "06:45", payload: {} },
  };
  const preset = defaults[input.kind];
  const payload = { ...(input.payload ?? preset.payload) };
  delete payload.targetTempC;
  if (input.kind === "climate" && payload.source == null) {
    payload.source = "app";
  }

  const { data, error } = await supabase
    .from("vehicle_schedules")
    .insert({
      user_id: userId,
      vehicle_id: vehicleId,
      kind: input.kind,
      enabled: input.enabled ?? true,
      time_local: input.timeLocal ?? preset.timeLocal,
      days_of_week: input.daysOfWeek ?? [1, 2, 3, 4, 5],
      payload,
    })
    .select("id, kind, enabled, time_local, days_of_week, payload")
    .single();

  if (error) throw new Error(error.message);
  const schedule = mapSchedule(data);

  if (schedule.kind === "climate") {
    const sync = await syncClimateProgramsToVehicle(supabase, userId);
    if (!sync.ok) {
      return { schedule, vehicleSyncWarning: sync.message };
    }
  }
  return { schedule };
}

export async function deleteSchedule(
  supabase: SupabaseClient,
  userId: string,
  scheduleId: string,
): Promise<{ vehicleSyncWarning?: string }> {
  const { data: existing } = await supabase
    .from("vehicle_schedules")
    .select("kind")
    .eq("id", scheduleId)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from("vehicle_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  if (existing?.kind === "climate") {
    const sync = await syncClimateProgramsToVehicle(supabase, userId);
    if (!sync.ok) return { vehicleSyncWarning: sync.message };
  }
  return {};
}
