import type { VehicleState } from "@/lib/types";
import {
  enrichVehicleLocationAddress,
  isPlaceholderAddress,
} from "@/lib/geo/reverse-geocode";
import { estimateFullAt } from "@/lib/vehicle/defaults";
import { resolveChargePower } from "@/lib/stellantis/charge-power";
import { parseIsoDurationToMinutes } from "@/lib/stellantis/duration";
import { extractPaintFromPictures } from "@/lib/stellantis/paint";
import {
  getAuthorizeUrl,
  getBasicToken,
  getCountryConfig,
  getRedirectUri,
  MYPEUGEOT,
} from "./peugeot-config";

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  idToken?: string;
};

export type RemoteVehicle = {
  vehicleId: string;
  vin: string;
  motorization?: string;
  brand?: string;
  pictures?: string[];
  color?: string;
  colorHex?: string;
  pictureUrl?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function dig(obj: unknown, path: Array<string | number>): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (Array.isArray(cur) && typeof key === "number") {
      cur = cur[key];
      continue;
    }
    const rec = asRecord(cur);
    if (!rec) return undefined;
    cur = rec[String(key)];
  }
  return cur;
}

export { getAuthorizeUrl };

export async function exchangeAuthorizationCode(
  countryCode: string,
  oauthCode: string,
): Promise<OAuthTokens> {
  const redirectUri = getRedirectUri(countryCode);
  const url = new URL(`${MYPEUGEOT.oauth_url}/am/oauth2/access_token`);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("code", oauthCode.trim());

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getBasicToken(countryCode)}`,
    },
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || !data.access_token) {
    throw new Error(
      formatOAuthErrorPayload(data, `Token-Austausch fehlgeschlagen (${res.status})`),
    );
  }

  const expiresIn = Number(data.expires_in ?? 3600);
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token ?? ""),
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    idToken: data.id_token ? String(data.id_token) : undefined,
  };
}

export async function refreshAccessToken(
  countryCode: string,
  refreshToken: string,
): Promise<OAuthTokens> {
  const url = new URL(`${MYPEUGEOT.oauth_url}/am/oauth2/access_token`);
  url.searchParams.set("grant_type", "refresh_token");
  url.searchParams.set("refresh_token", refreshToken);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getBasicToken(countryCode)}`,
    },
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || !data.access_token) {
    throw new Error(formatOAuthErrorPayload(data, "Token-Refresh fehlgeschlagen"));
  }

  const expiresIn = Number(data.expires_in ?? 3600);
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token ?? refreshToken),
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/** Normalize Peugeot OAuth error bodies into a stable message. */
export function formatOAuthErrorPayload(
  data: Record<string, unknown>,
  fallback: string,
): string {
  const code = typeof data.error === "string" ? data.error : "";
  const desc =
    typeof data.error_description === "string" ? data.error_description : "";
  const combined = `${code} ${desc}`.trim();
  return humanizePeugeotOAuthError(combined || fallback);
}

/** Map Peugeot OAuth failures to a clear German reconnect hint. */
export function humanizePeugeotOAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid_grant") ||
    lower.includes("grant invalid") ||
    lower.includes("invalid grant") ||
    lower.includes("token has expired") ||
    (lower.includes("refresh token") && lower.includes("expired")) ||
    lower.includes("not authorized")
  ) {
    return "MyPeugeot-Anmeldung abgelaufen. Bitte unter Einstellungen neu verbinden.";
  }
  return message || "Peugeot-Anmeldung fehlgeschlagen.";
}

export function isPeugeotAuthFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid_grant") ||
    lower.includes("grant invalid") ||
    lower.includes("abgelaufen") ||
    lower.includes("neu verbinden")
  );
}

async function carApiGet(
  path: string,
  accessToken: string,
  countryCode: string,
): Promise<unknown> {
  const cfg = getCountryConfig(countryCode);
  const url = new URL(`https://api.groupe-psa.com${path}`);
  url.searchParams.set("client_id", cfg.client_id);
  url.searchParams.set("locale", cfg.locale);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-introspect-realm": MYPEUGEOT.realm,
      Accept: "application/hal+json",
      "User-Agent": "okhttp/4.8.0",
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const rec = asRecord(data);
    throw new Error(
      typeof rec?.message === "string"
        ? rec.message
        : typeof rec?.error === "string"
          ? rec.error
          : `API-Fehler ${res.status}`,
    );
  }

  return data;
}

export async function listVehicles(
  accessToken: string,
  countryCode: string,
): Promise<RemoteVehicle[]> {
  const data = await carApiGet(
    "/connectedcar/v4/user/vehicles",
    accessToken,
    countryCode,
  );
  const embedded = dig(data, ["_embedded", "vehicles"]);
  if (!Array.isArray(embedded)) return [];

  return embedded.flatMap((item) => {
    const rec = asRecord(item);
    if (!rec?.id || !rec?.vin) return [];
    const pictures = Array.isArray(rec.pictures)
      ? rec.pictures.filter((p): p is string => typeof p === "string")
      : [];
    const paint = extractPaintFromPictures(pictures);
    const vehicle: RemoteVehicle = {
      vehicleId: String(rec.id),
      vin: String(rec.vin),
      motorization:
        typeof rec.motorization === "string" ? rec.motorization : undefined,
      brand: typeof rec.brand === "string" ? rec.brand : undefined,
      pictures,
      color: paint?.label,
      colorHex: paint?.hex,
      pictureUrl: paint?.pictureUrl ?? null,
    };
    return [vehicle];
  });
}

export async function fetchVehicleDetails(
  accessToken: string,
  countryCode: string,
  vehicleId: string,
): Promise<RemoteVehicle | null> {
  const data = await carApiGet(
    `/connectedcar/v4/user/vehicles/${vehicleId}`,
    accessToken,
    countryCode,
  );
  const rec = asRecord(data);
  if (!rec?.id || !rec?.vin) return null;
  const pictures = Array.isArray(rec.pictures)
    ? rec.pictures.filter((p): p is string => typeof p === "string")
    : [];
  const paint = extractPaintFromPictures(pictures);
  return {
    vehicleId: String(rec.id),
    vin: String(rec.vin),
    motorization:
      typeof rec.motorization === "string" ? rec.motorization : undefined,
    brand: typeof rec.brand === "string" ? rec.brand : undefined,
    pictures,
    color: paint?.label,
    colorHex: paint?.hex,
    pictureUrl: paint?.pictureUrl ?? null,
  };
}

export async function fetchVehicleStatus(
  accessToken: string,
  countryCode: string,
  vehicleId: string,
): Promise<unknown> {
  return carApiGet(
    `/connectedcar/v4/user/vehicles/${vehicleId}/status`,
    accessToken,
    countryCode,
  );
}

export function mapStatusToVehicleState(
  status: unknown,
  base: VehicleState,
  meta: { vehicleId: string; vin: string },
): VehicleState {
  const energy0 = dig(status, ["energy", 0]) ?? dig(status, ["energies", 0]);
  const chargingPrimary = dig(energy0, ["charging"]);
  const chargingExt =
    dig(status, ["energies", 0, "extension", "electric", "charging"]) ??
    dig(energy0, ["extension", "electric", "charging"]);
  const chargingBlock = {
    ...(asRecord(chargingPrimary) ?? {}),
    ...(asRecord(chargingExt) ?? {}),
  };

  // Prefer energies[0] battery capacity (Wh) when present.
  const capacityWh = Number(
    dig(status, ["energies", 0, "extension", "electric", "battery", "load", "capacity"]) ??
      dig(status, ["energy", 0, "battery", "load", "capacity"]) ??
      dig(energy0, ["battery", "load", "capacity"]),
  );
  const batteryCapacityKwh =
    Number.isFinite(capacityWh) && capacityWh > 1000
      ? Math.round((capacityWh / 1000) * 10) / 10
      : base.batteryCapacityKwh;

  const batteryPercent = Number(
    dig(energy0, ["level"]) ??
      dig(status, ["batteries", "main", "level"]) ??
      base.batteryPercent,
  );
  const rangeKm = Number(dig(energy0, ["autonomy"]) ?? base.rangeKm);
  const mileageKm = Number(
    dig(status, ["odometer", "mileage"]) ?? base.mileageKm,
  );
  const cabinTempC = Number(
    dig(status, ["environment", "air", "temp"]) ?? base.cabinTempC,
  );

  const lockRaw = String(
    dig(status, ["privacy", "lockStatus"]) ??
      dig(status, ["doorsState", "lockedStates"]) ??
      "",
  ).toLowerCase();
  const locked = lockRaw.includes("unlock")
    ? false
    : lockRaw.includes("lock")
      ? true
      : base.locked;

  const chargingRaw = String(dig(chargingBlock, ["status"]) ?? "").toLowerCase();
  const pluggedFlag = dig(chargingBlock, ["plugged"]);
  let chargeStatus: VehicleState["chargeStatus"] = "idle";
  // Order matters: "Disconnected".includes("connected") is true — check
  // disconnected/unplugged before connected/plugged.
  if (
    chargingRaw.includes("inprogress") ||
    chargingRaw.includes("in_progress") ||
    chargingRaw === "charging" ||
    chargingRaw === "charge"
  ) {
    chargeStatus = "charging";
  } else if (
    chargingRaw.includes("complete") ||
    chargingRaw.includes("finished") ||
    chargingRaw.includes("full")
  ) {
    chargeStatus = "complete";
  } else if (
    chargingRaw.includes("disconnected") ||
    chargingRaw.includes("unplugged") ||
    pluggedFlag === false ||
    pluggedFlag === "false"
  ) {
    chargeStatus = "idle";
  } else if (
    chargingRaw === "stopped" ||
    chargingRaw.includes("stopped") ||
    chargingRaw === "connected" ||
    chargingRaw.includes("plugged") ||
    chargingRaw.includes("pending") ||
    chargingRaw.includes("delayed") ||
    pluggedFlag === true ||
    pluggedFlag === "true"
  ) {
    chargeStatus = "plugged";
  } else if (!chargingRaw) {
    // No status string — fall back to last known only if we also lack a plug flag.
    chargeStatus = base.chargeStatus === "charging" ? "idle" : base.chargeStatus;
  }

  // Live preconditioning from Peugeot status (API spelling varies).
  const precondRaw = String(
    dig(status, ["preconditionning", "airConditioning", "status"]) ??
      dig(status, ["preconditioning", "airConditioning", "status"]) ??
      dig(status, ["preconditionning", "air_conditioning", "status"]) ??
      "",
  ).toLowerCase();
  let climateStatus: VehicleState["climateStatus"] = "off";
  if (
    precondRaw === "enabled" ||
    precondRaw.includes("enabled") ||
    precondRaw.includes("progress") ||
    precondRaw === "on"
  ) {
    const cabin = Number.isFinite(cabinTempC) ? cabinTempC : base.cabinTempC;
    const target = base.targetTempC;
    climateStatus =
      cabin < target - 0.5
        ? "heating"
        : cabin > target + 0.5
          ? "cooling"
          : "preconditioning";
  }

  const limitFromApi = Number(
    dig(chargingBlock, ["chargeLimit"]) ??
      dig(chargingBlock, ["chargingLimit"]) ??
      dig(chargingBlock, ["chargingStopThreshold"]) ??
      dig(chargingBlock, ["stopThreshold"]) ??
      dig(chargingBlock, ["socLimit"]) ??
      dig(chargingBlock, ["maxSoc"]) ??
      dig(energy0, ["extension", "electric", "battery", "chargeLimit"]) ??
      dig(energy0, ["extension", "electric", "battery", "load", "limit"]),
  );
  const eightyFlag = dig(chargingBlock, ["eightyPercentLimit"]) ??
    dig(chargingBlock, ["chargeLimit80"]) ??
    dig(chargingBlock, ["batteryChargeLimit"]) ??
    dig(chargingBlock, ["limitedTo80"]) ??
    dig(energy0, ["extension", "electric", "battery", "eightyPercentLimit"]);
  const chargingModeRaw = dig(chargingBlock, ["chargingMode"]);
  const chargingTypeRaw = dig(chargingBlock, ["type"]);
  const chargingMode =
    typeof chargingModeRaw === "string" ? chargingModeRaw : null;
  const chargingType =
    typeof chargingTypeRaw === "string" ? chargingTypeRaw : null;

  // Live status: numeric SoC limit is usually absent.
  // Official MyPeugeot toggle "Laden auf 80% begrenzen":
  // - OFF → chargingType "Full" (vehicle target 100%)
  // - ON  → often 80 / Partial / explicit flag (when reported)
  const preferred =
    base.preferredChargeLimitPercent ?? base.chargeLimitPercent ?? 80;
  let chargeLimitPercent = preferred;
  let chargeLimitKnown = false;
  const eightyOn =
    eightyFlag === true ||
    eightyFlag === "true" ||
    eightyFlag === 1 ||
    eightyFlag === "1" ||
    (typeof eightyFlag === "string" && /on|true|active|enabled/i.test(eightyFlag));
  const eightyOff =
    eightyFlag === false ||
    eightyFlag === "false" ||
    eightyFlag === 0 ||
    eightyFlag === "0" ||
    (typeof eightyFlag === "string" && /off|false|inactive|disabled/i.test(eightyFlag));

  if (eightyOn) {
    chargeLimitPercent = 80;
    chargeLimitKnown = true;
  } else if (
    Number.isFinite(limitFromApi) &&
    limitFromApi >= 50 &&
    limitFromApi <= 100
  ) {
    chargeLimitPercent = Math.round(limitFromApi);
    chargeLimitKnown = true;
  } else if (
    chargingType &&
    /(partial|limited|eighty|80|care)/i.test(chargingType)
  ) {
    chargeLimitPercent = 80;
    chargeLimitKnown = true;
  } else if (eightyOff || (chargingType && /full/i.test(chargingType))) {
    chargeLimitPercent = 100;
    chargeLimitKnown = true;
  }

  // Keep preferred in sync with what the vehicle actually reports.
  const preferredChargeLimitPercent = chargeLimitKnown
    ? chargeLimitPercent
    : preferred;

  // PSA `chargingRate` / `charging_rate` is km/h of range gain — never kW.
  const rateRaw = Number(
    dig(chargingBlock, ["chargingRate"]) ??
      dig(chargingBlock, ["charging_rate"]) ??
      dig(chargingBlock, ["chgRate"]) ??
      dig(energy0, ["extension", "electric", "charging", "chargingRate"]) ??
      dig(energy0, ["extension", "electric", "charging", "charging_rate"]),
  );

  // Rare: real power fields (prefer over rate conversion).
  const powerLevelRaw = Number(
    dig(chargingBlock, ["chargingPowerLevel"]) ??
      dig(chargingBlock, ["charging_power_level"]) ??
      dig(energy0, [
        "extension",
        "electric",
        "charging",
        "chargingPowerLevel",
      ]) ??
      dig(energy0, [
        "extension",
        "electric",
        "charging",
        "charging_power_level",
      ]),
  );
  const powerRaw = Number(
    dig(chargingBlock, ["instantaneousPower"]) ??
      dig(chargingBlock, ["instantaneous_power"]) ??
      dig(chargingBlock, ["chargingPower"]) ??
      dig(chargingBlock, ["charging_power"]) ??
      (Number.isFinite(powerLevelRaw) ? powerLevelRaw : NaN),
  );

  const resolvedPower =
    chargeStatus === "charging"
      ? resolveChargePower({
          rateKmh: Number.isFinite(rateRaw) ? rateRaw : null,
          powerKwHint: Number.isFinite(powerRaw) ? powerRaw : null,
          rangeKm: Number.isFinite(rangeKm) ? rangeKm : base.rangeKm,
          batteryPercent: Number.isFinite(batteryPercent)
            ? batteryPercent
            : base.batteryPercent,
          batteryCapacityKwh: base.batteryCapacityKwh,
        })
      : { chargePowerKw: null, chargeRateKmh: null };

  const chargePowerKw = resolvedPower.chargePowerKw;
  const chargeRateKmh = resolvedPower.chargeRateKmh;

  const remainingMin = parseIsoDurationToMinutes(
    dig(chargingBlock, ["remainingTime"]) ??
      dig(chargingBlock, ["remaining_time"]) ??
      dig(chargingBlock, ["timeToComplete"]),
  );

  let estimatedFullAt: string | null = null;
  if (chargeStatus === "charging" && remainingMin != null && remainingMin > 0) {
    estimatedFullAt = new Date(
      Date.now() + remainingMin * 60_000,
    ).toISOString();
  } else if (
    chargeStatus === "charging" &&
    chargePowerKw &&
    Number.isFinite(batteryPercent) &&
    chargeLimitKnown
  ) {
    estimatedFullAt = estimateFullAt(
      batteryPercent,
      chargeLimitPercent,
      batteryCapacityKwh,
      chargePowerKw,
    );
  }

  const coords = dig(status, ["lastPosition", "geometry", "coordinates"]);
  let latitude = base.location.latitude;
  let longitude = base.location.longitude;
  if (Array.isArray(coords) && coords.length >= 2) {
    longitude = Number(coords[0]);
    latitude = Number(coords[1]);
  }

  const updatedFromApi = String(
    dig(status, ["lastPosition", "properties", "updatedAt"]) ??
      dig(status, ["updatedAt"]) ??
      dig(energy0, ["updatedAt"]) ??
      "",
  );

  const nextLat = Number.isFinite(latitude) ? latitude : base.location.latitude;
  const nextLng = Number.isFinite(longitude)
    ? longitude
    : base.location.longitude;
  // Keep a known street address until reverse-geocode refreshes it.
  const address = isPlaceholderAddress(base.location.address)
    ? "Standort wird ermittelt…"
    : base.location.address;

  return {
    ...base,
    id: base.id,
    vin: meta.vin || base.vin,
    mode: "live",
    batteryPercent: Number.isFinite(batteryPercent)
      ? batteryPercent
      : base.batteryPercent,
    batteryCapacityKwh,
    rangeKm: Number.isFinite(rangeKm) ? Math.round(rangeKm) : base.rangeKm,
    mileageKm: Number.isFinite(mileageKm)
      ? Math.round(mileageKm)
      : base.mileageKm,
    cabinTempC: Number.isFinite(cabinTempC) ? cabinTempC : base.cabinTempC,
    locked,
    climateStatus,
    chargeStatus,
    chargeLimitPercent,
    chargeLimitKnown,
    preferredChargeLimitPercent,
    chargingMode,
    chargingType,
    chargePowerKw,
    chargeRateKmh,
    estimatedFullAt,
    lastUpdatedAt: updatedFromApi || new Date().toISOString(),
    location: {
      latitude: nextLat,
      longitude: nextLng,
      address,
      updatedAt: updatedFromApi || new Date().toISOString(),
    },
  };
}

export async function mapStatusToVehicleStateWithAddress(
  status: unknown,
  base: VehicleState,
  meta: { vehicleId: string; vin: string },
): Promise<VehicleState> {
  const mapped = mapStatusToVehicleState(status, base, meta);
  return enrichVehicleLocationAddress(mapped, base);
}
