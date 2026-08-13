import type { VehicleState } from "@/lib/types";
import { estimateFullAt } from "@/lib/vehicle/defaults";
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
      typeof data.error_description === "string"
        ? data.error_description
        : typeof data.error === "string"
          ? data.error
          : `Token-Austausch fehlgeschlagen (${res.status})`,
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
    throw new Error(
      typeof data.error_description === "string"
        ? data.error_description
        : "Token-Refresh fehlgeschlagen",
    );
  }

  const expiresIn = Number(data.expires_in ?? 3600);
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token ?? refreshToken),
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
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
    const vehicle: RemoteVehicle = {
      vehicleId: String(rec.id),
      vin: String(rec.vin),
      motorization:
        typeof rec.motorization === "string" ? rec.motorization : undefined,
    };
    return [vehicle];
  });
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
  const chargingBlock = dig(energy0, ["charging"]);

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
  let chargeStatus: VehicleState["chargeStatus"] = base.chargeStatus;
  if (
    chargingRaw.includes("inprogress") ||
    chargingRaw.includes("in_progress") ||
    chargingRaw.includes("charging") ||
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
    chargingRaw.includes("stopped") ||
    chargingRaw.includes("connected") ||
    chargingRaw.includes("plugged") ||
    chargingRaw.includes("pending") ||
    chargingRaw.includes("delayed")
  ) {
    chargeStatus = "plugged";
  } else {
    const plugged = dig(chargingBlock, ["plugged"]);
    if (plugged === true || plugged === "true") chargeStatus = "plugged";
    else if (plugged === false || plugged === "false") chargeStatus = "idle";
    else if (
      chargingRaw.includes("disconnected") ||
      chargingRaw.includes("unplugged")
    ) {
      chargeStatus = "idle";
    }
  }

  const limitFromApi = Number(
    dig(chargingBlock, ["chargeLimit"]) ??
      dig(chargingBlock, ["chargingLimit"]),
  );

  // PSA often reports chargingRate as km/h of gained range, not kW.
  const rateRaw = Number(
    dig(chargingBlock, ["chargingRate"]) ??
      dig(chargingBlock, ["chgRate"]) ??
      dig(chargingBlock, ["rate"]),
  );
  const powerRaw = Number(
    dig(chargingBlock, ["instantaneousPower"]) ??
      dig(chargingBlock, ["power"]) ??
      dig(chargingBlock, ["chargingPower"]),
  );

  let chargePowerKw: number | null = null;
  if (chargeStatus === "charging") {
    if (Number.isFinite(powerRaw) && powerRaw > 0 && powerRaw < 400) {
      chargePowerKw = powerRaw > 80 ? powerRaw / 1000 : powerRaw;
    } else if (Number.isFinite(rateRaw) && rateRaw > 0) {
      // Convert km/h range gain → rough kW (~6.3 km/kWh for E-3008)
      chargePowerKw = Math.round((rateRaw / 6.3) * 10) / 10;
    } else if (base.chargePowerKw && base.chargePowerKw > 0) {
      chargePowerKw = base.chargePowerKw;
    }
  }

  const remainingMin = Number(
    dig(chargingBlock, ["remainingTime"]) ??
      dig(chargingBlock, ["remaining_time"]) ??
      dig(chargingBlock, ["timeToComplete"]),
  );
  const limit =
    Number.isFinite(limitFromApi) && limitFromApi >= 50 && limitFromApi <= 100
      ? Math.round(limitFromApi)
      : base.chargeLimitPercent;

  let estimatedFullAt: string | null = null;
  if (
    chargeStatus === "charging" &&
    Number.isFinite(remainingMin) &&
    remainingMin > 0
  ) {
    estimatedFullAt = new Date(
      Date.now() + remainingMin * 60_000,
    ).toISOString();
  } else if (
    chargeStatus === "charging" &&
    chargePowerKw &&
    Number.isFinite(batteryPercent)
  ) {
    estimatedFullAt = estimateFullAt(
      batteryPercent,
      limit,
      base.batteryCapacityKwh,
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

  return {
    ...base,
    id: base.id,
    vin: meta.vin || base.vin,
    mode: "live",
    batteryPercent: Number.isFinite(batteryPercent)
      ? batteryPercent
      : base.batteryPercent,
    rangeKm: Number.isFinite(rangeKm) ? Math.round(rangeKm) : base.rangeKm,
    mileageKm: Number.isFinite(mileageKm)
      ? Math.round(mileageKm)
      : base.mileageKm,
    cabinTempC: Number.isFinite(cabinTempC) ? cabinTempC : base.cabinTempC,
    locked,
    chargeStatus,
    chargeLimitPercent: limit,
    chargePowerKw,
    estimatedFullAt,
    lastUpdatedAt: updatedFromApi || new Date().toISOString(),
    location: {
      latitude: Number.isFinite(latitude) ? latitude : base.location.latitude,
      longitude: Number.isFinite(longitude)
        ? longitude
        : base.location.longitude,
      address:
        base.location.address.includes("Demo") || !base.location.address
          ? "Live-Standort (MyPeugeot)"
          : base.location.address,
      updatedAt: updatedFromApi || new Date().toISOString(),
    },
  };
}
