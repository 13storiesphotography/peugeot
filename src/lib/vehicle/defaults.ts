import type { VehicleState } from "@/lib/types";

export function createDefaultVehicleState(
  overrides: Partial<VehicleState> = {},
): VehicleState {
  const now = new Date().toISOString();
  return {
    id: "pending",
    vin: "VR3UKZKXZRJxxxxxx",
    model: "Peugeot E-3008",
    nickname: "E-3008",
    color: "Obsession Blue",
    colorHex: "#1a3f5c",
    pictureUrl: null,
    mode: "demo",
    batteryPercent: 68,
    batteryCapacityKwh: 73,
    rangeKm: 312,
    chargeStatus: "plugged",
    chargeLimitPercent: 80,
    chargeLimitKnown: false,
    chargingMode: null,
    chargingType: null,
    chargePowerKw: null,
    chargeRateKmh: null,
    estimatedFullAt: null,
    locked: true,
    climateStatus: "off",
    cabinTempC: 18,
    targetTempC: 21,
    batteryPreheat: false,
    mileageKm: 12480,
    lastUpdatedAt: now,
    location: {
      latitude: 52.520008,
      longitude: 13.404954,
      address: "Berlin · Demo-Standort",
      updatedAt: now,
    },
    ...overrides,
  };
}

export function estimateRange(percent: number): number {
  return Math.round(percent * 4.6);
}

export function estimateFullAt(
  percent: number,
  limit: number,
  capacityKwh: number,
  powerKw: number,
): string {
  const kwhNeeded = Math.max(0, ((limit - percent) / 100) * capacityKwh);
  const hours = powerKw > 0 ? kwhNeeded / powerKw : 0;
  return new Date(Date.now() + hours * 3600_000).toISOString();
}
