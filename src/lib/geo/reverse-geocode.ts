import type { VehicleLocation, VehicleState } from "@/lib/types";

const NOMINATIM_UA =
  "E3008ControlApp/1.0 (https://e3008-control.vercel.app; contact: florian@tutzinger-knolls.de)";

export function isPlaceholderAddress(address: string): boolean {
  const a = address.trim();
  if (!a || a === "—") return true;
  return /demo|live-standort|wird ermittelt|unbekannt|mypeugeot/i.test(a);
}

/** Rough distance check — ~75 m default. */
export function coordsMovedSignificantly(
  a: Pick<VehicleLocation, "latitude" | "longitude">,
  b: Pick<VehicleLocation, "latitude" | "longitude">,
  thresholdMeters = 75,
): boolean {
  if (
    !Number.isFinite(a.latitude) ||
    !Number.isFinite(a.longitude) ||
    !Number.isFinite(b.latitude) ||
    !Number.isFinite(b.longitude)
  ) {
    return true;
  }
  const dLat = (a.latitude - b.latitude) * 111_000;
  const dLng =
    (a.longitude - b.longitude) *
    111_000 *
    Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));
  return Math.hypot(dLat, dLng) > thresholdMeters;
}

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  path?: string;
  residential?: string;
  house_number?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  city_district?: string;
  county?: string;
  postcode?: string;
};

function formatNominatimAddress(
  addr: NominatimAddress | undefined,
  displayName?: string,
): string | null {
  if (addr) {
    const road =
      addr.road || addr.pedestrian || addr.path || addr.residential || addr.suburb;
    const street = road
      ? addr.house_number
        ? `${road} ${addr.house_number}`
        : road
      : null;
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.city_district;
    const parts = [street, city].filter(Boolean) as string[];
    if (parts.length) return parts.join(", ");
    if (city && addr.postcode) return `${addr.postcode} ${city}`;
  }
  if (displayName) {
    return displayName
      .split(",")
      .map((p) => p.trim())
      .slice(0, 3)
      .join(", ");
  }
  return null;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", "de");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": NOMINATIM_UA,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: NominatimAddress;
      display_name?: string;
    };
    return formatNominatimAddress(data.address, data.display_name);
  } catch {
    return null;
  }
}

/** Google Maps directions — opens app or web navigation to the pin. */
export function navigationUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

/**
 * Fill street/city from GPS when missing or when the car moved.
 * Keeps a previous real address if geocoding fails.
 */
export async function enrichVehicleLocationAddress(
  vehicle: VehicleState,
  previous?: VehicleState,
): Promise<VehicleState> {
  const loc = vehicle.location;
  const prevLoc = previous?.location;
  const needsRefresh =
    isPlaceholderAddress(loc.address) ||
    !prevLoc ||
    coordsMovedSignificantly(loc, prevLoc);

  if (!needsRefresh) return vehicle;

  const label = await reverseGeocode(loc.latitude, loc.longitude);
  if (label) {
    return {
      ...vehicle,
      location: { ...loc, address: label },
    };
  }

  if (prevLoc && !isPlaceholderAddress(prevLoc.address)) {
    return {
      ...vehicle,
      location: { ...loc, address: prevLoc.address },
    };
  }

  if (isPlaceholderAddress(loc.address)) {
    const fallback =
      Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)
        ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
        : "Standort unbekannt";
    return {
      ...vehicle,
      location: { ...loc, address: fallback },
    };
  }

  return vehicle;
}
