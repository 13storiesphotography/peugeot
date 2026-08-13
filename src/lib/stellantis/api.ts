import type { VehicleState } from "@/lib/types";
import { createDefaultVehicleState } from "@/lib/vehicle/defaults";
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
  const batteryPercent = Number(
    dig(status, ["energy", 0, "level"]) ??
      dig(status, ["batteries", "main", "level"]) ??
      base.batteryPercent,
  );
  const rangeKm = Number(
    dig(status, ["energy", 0, "autonomy"]) ??
      dig(status, ["energies", 0, "autonomy"]) ??
      base.rangeKm,
  );
  const mileageKm = Number(
    dig(status, ["odometer", "mileage"]) ?? base.mileageKm,
  );
  const cabinTempC = Number(
    dig(status, ["environment", "air", "temp"]) ?? base.cabinTempC,
  );
  const locked = Boolean(
    dig(status, ["privacy", "lockStatus"]) === "locked" ||
      dig(status, ["doorsState", "lockedStates"]) === "locked" ||
      base.locked,
  );

  const charging =
    String(dig(status, ["energy", 0, "charging", "status"]) ?? "").toLowerCase();
  let chargeStatus: VehicleState["chargeStatus"] = base.chargeStatus;
  if (charging.includes("inprogress") || charging.includes("charging")) {
    chargeStatus = "charging";
  } else if (charging.includes("complete") || charging.includes("finished")) {
    chargeStatus = "complete";
  } else if (charging.includes("stopped") || charging.includes("connected")) {
    chargeStatus = "plugged";
  } else if (charging.includes("disconnected") || charging.includes("unplugged")) {
    chargeStatus = "idle";
  }

  const lat = Number(
    dig(status, ["lastPosition", "geometry", "coordinates", 1]) ??
      dig(status, ["lastPosition", "geometry", "coordinates", 0]) ??
      base.location.latitude,
  );
  const lon = Number(
    dig(status, ["lastPosition", "geometry", "coordinates", 0]) ??
      base.location.longitude,
  );

  // GeoJSON is usually [lon, lat]
  const coords = dig(status, ["lastPosition", "geometry", "coordinates"]);
  let latitude = base.location.latitude;
  let longitude = base.location.longitude;
  if (Array.isArray(coords) && coords.length >= 2) {
    longitude = Number(coords[0]);
    latitude = Number(coords[1]);
  } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
    latitude = lat;
    longitude = lon;
  }

  return {
    ...createDefaultVehicleState({
      ...base,
      id: meta.vehicleId,
      vin: meta.vin,
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
      chargePowerKw:
        chargeStatus === "charging"
          ? Number(dig(status, ["energy", 0, "charging", "chargingRate"]) ?? 11)
          : null,
      lastUpdatedAt: new Date().toISOString(),
      location: {
        latitude,
        longitude,
        address: base.location.address.includes("Demo")
          ? "Live-Standort"
          : base.location.address,
        updatedAt: new Date().toISOString(),
      },
    }),
  };
}
