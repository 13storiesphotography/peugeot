import type { VehicleBundle } from "@/lib/vehicle/repository";

const STORAGE_KEY = "e3008.vehicleBundle.v1";

/** Persist last good vehicle snapshot for offline / flaky network. */
export function saveVehicleBundleCache(bundle: VehicleBundle): void {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      savedAt: new Date().toISOString(),
      bundle,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function loadVehicleBundleCache(): {
  savedAt: string;
  bundle: VehicleBundle;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      savedAt?: string;
      bundle?: VehicleBundle;
    };
    if (!parsed?.bundle?.vehicle || !parsed.savedAt) return null;
    return { savedAt: parsed.savedAt, bundle: parsed.bundle };
  } catch {
    return null;
  }
}
