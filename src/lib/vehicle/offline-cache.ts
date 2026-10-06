import type { VehicleBundle } from "@/lib/vehicle/repository";

const STORAGE_KEY_PREFIX = "e3008.vehicleBundle.v2.";
const LEGACY_KEY = "e3008.vehicleBundle.v1";

function storageKey(vehicleId: string): string {
  return `${STORAGE_KEY_PREFIX}${vehicleId}`;
}

/** Persist last good vehicle snapshot for offline / flaky network. */
export function saveVehicleBundleCache(bundle: VehicleBundle): void {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      savedAt: new Date().toISOString(),
      bundle,
    };
    localStorage.setItem(storageKey(bundle.vehicleId), JSON.stringify(payload));
    // Drop the old single-slot cache so another account cannot reuse it.
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Quota / private mode — ignore.
  }
}

export function loadVehicleBundleCache(vehicleId: string): {
  savedAt: string;
  bundle: VehicleBundle;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(storageKey(vehicleId)) ??
      localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt?: string;
      bundle?: VehicleBundle;
    };
    if (!parsed?.bundle?.vehicle || !parsed.savedAt) return null;
    // Never apply another account's snapshot.
    if (parsed.bundle.vehicleId !== vehicleId) return null;
    return { savedAt: parsed.savedAt, bundle: parsed.bundle };
  } catch {
    return null;
  }
}
