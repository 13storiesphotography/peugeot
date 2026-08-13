export type ChargeStatus = "idle" | "plugged" | "charging" | "complete" | "error";
export type LockStatus = "locked" | "unlocked";
export type ClimateStatus = "off" | "heating" | "cooling" | "preconditioning";

export type VehicleCommand =
  | "lock"
  | "unlock"
  | "horn"
  | "flash"
  | "charge_start"
  | "charge_stop"
  | "climate_start"
  | "climate_stop"
  | "battery_preheat_start"
  | "battery_preheat_stop"
  | "wakeup"
  | "set_charge_limit";

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
  mode: "demo" | "live";
  batteryPercent: number;
  batteryCapacityKwh: number;
  rangeKm: number;
  chargeStatus: ChargeStatus;
  chargeLimitPercent: number;
  chargePowerKw: number | null;
  estimatedFullAt: string | null;
  locked: boolean;
  climateStatus: ClimateStatus;
  cabinTempC: number;
  targetTempC: number;
  batteryPreheat: boolean;
  mileageKm: number;
  lastUpdatedAt: string;
  location: VehicleLocation;
}

export interface CommandRequest {
  command: VehicleCommand;
  chargeLimitPercent?: number;
}

export interface CommandResult {
  ok: boolean;
  message: string;
  vehicle: VehicleState;
}
