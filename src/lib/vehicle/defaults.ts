import type { VehicleState } from "@/lib/types";

/** Official Peugeot 3D side view — Perla Nera E-3008 (demo placeholder). */
const DEMO_E3008_PICTURE =
  "https://visuel3d-secure.peugeot.com/V3DImage.ashx?client=miseco&back=0&format=png&version=1PPDSYRFAFC0A0C0&color=0MM00N9V&trim=0PW60RFX&OPT1=D180&OPT2=D190&OPT3=DAB1&OPT4=DAQ0&OPT5=DDX0&OPT6=DE30&OPT7=DI30&OPT8=DLW0&OPT9=DNM0&OPT10=DZJG&OPT11=DZVG&view=001";

export function createDefaultVehicleState(
  overrides: Partial<VehicleState> = {},
): VehicleState {
  const now = new Date().toISOString();
  return {
    id: "pending",
    vin: "VR3UKZKXZRJxxxxxx",
    model: "Peugeot E-3008",
    nickname: "E-3008",
    color: "Perla Nera Black",
    colorHex: "#0c0d10",
    pictureUrl: DEMO_E3008_PICTURE,
    mode: "demo",
    batteryPercent: 68,
    batteryCapacityKwh: 73,
    rangeKm: 312,
    chargeStatus: "plugged",
    chargeLimitPercent: 80,
    chargeLimitKnown: false,
    preferredChargeLimitPercent: 80,
    chargingMode: null,
    chargingType: null,
    chargePowerKw: null,
    chargeRateKmh: null,
    estimatedFullAt: null,
    locked: true,
    climateStatus: "off",
    outdoorTempC: 18,
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
