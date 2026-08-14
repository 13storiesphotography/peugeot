export type ChargeStatus = "idle" | "plugged" | "charging" | "complete" | "error";
export type LockStatus = "locked" | "unlocked";
export type ClimateStatus = "off" | "heating" | "cooling" | "preconditioning";

export type VehicleCommand =
  | "lock"
  | "unlock"
  | "horn"
  | "flash"
  | "charge_start"
  | "climate_start"
  | "climate_stop"
  | "battery_preheat_start"
  | "battery_preheat_stop"
  | "wakeup"
  | "set_charge_limit"
  | "set_climate_temp";

export interface VehicleLocation {
  latitude: number;
  longitude: number;
  address: string;
  updatedAt: string;
}

export interface VehicleState {
  id: string;
  vin: string;
  model: string;
  nickname: string;
  color: string;
  /** Approximate body color for UI accents / silhouette. */
  colorHex: string | null;
  /** Official Peugeot 3D render URL when available. */
  pictureUrl: string | null;
  mode: "demo" | "live";
  batteryPercent: number;
  batteryCapacityKwh: number;
  rangeKm: number;
  chargeStatus: ChargeStatus;
  /** Effective limit used for ETA / demo physics (API when known, else preferred). */
  chargeLimitPercent: number;
  /** True only when MyPeugeot reported a numeric limit or chargingType Full→100%. */
  chargeLimitKnown: boolean;
  /** User-chosen App-Ziel (always editable; may differ from vehicle Full). */
  preferredChargeLimitPercent: number;
  /** PSA chargingMode: Slow | Quick | No */
  chargingMode: string | null;
  /** PSA charging type e.g. Full / Delayed */
  chargingType: string | null;
  chargePowerKw: number | null;
  /** PSA chargingRate — km of range gained per hour (null if unknown). */
  chargeRateKmh: number | null;
  estimatedFullAt: string | null;
  locked: boolean;
  climateStatus: ClimateStatus;
  /** Outside air temperature from Peugeot `environment.air.temp` (°C). */
  outdoorTempC: number;
  targetTempC: number;
  batteryPreheat: boolean;
  mileageKm: number;
  lastUpdatedAt: string;
  location: VehicleLocation;
}

export interface CommandRequest {
  command: VehicleCommand;
  chargeLimitPercent?: number;
  targetTempC?: number;
}

export interface CommandResult {
  ok: boolean;
  message: string;
  vehicle: VehicleState;
  /** Climate start/stop still waiting for vehicle confirmation. */
  climatePending?: boolean;
  /** Climate status was confirmed from Peugeot after the command. */
  climateConfirmed?: boolean;
}
