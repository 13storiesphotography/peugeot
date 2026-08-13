import type { CommandRequest, CommandResult, VehicleState } from "./types";

const DEMO_VIN = "VR3UKZKXZRJxxxxxx";

function nowIso() {
  return new Date().toISOString();
}

function createDemoVehicle(): VehicleState {
  return {
    id: "e3008-demo",
    vin: DEMO_VIN,
    model: "Peugeot E-3008",
    nickname: "E-3008",
    color: "Obsession Blue",
    mode: "demo",
    batteryPercent: 68,
    batteryCapacityKwh: 73,
    rangeKm: 312,
    chargeStatus: "plugged",
    chargeLimitPercent: 80,
    chargePowerKw: null,
    estimatedFullAt: null,
    locked: true,
    climateStatus: "off",
    cabinTempC: 18,
    targetTempC: 21,
    batteryPreheat: false,
    mileageKm: 12480,
    lastUpdatedAt: nowIso(),
    location: {
      latitude: 52.520008,
      longitude: 13.404954,
      address: "Berlin · Demo-Standort",
      updatedAt: nowIso(),
    },
  };
}

let state: VehicleState = createDemoVehicle();

function touch(next: Partial<VehicleState>): VehicleState {
  state = {
    ...state,
    ...next,
    lastUpdatedAt: nowIso(),
  };
  return state;
}

function estimateRange(percent: number): number {
  // Rough long-range estimate for demo UX (~4.6 km/%)
  return Math.round(percent * 4.6);
}

function estimateFullAt(percent: number, limit: number, powerKw: number): string {
  const capacity = state.batteryCapacityKwh;
  const kwhNeeded = Math.max(0, ((limit - percent) / 100) * capacity);
  const hours = powerKw > 0 ? kwhNeeded / powerKw : 0;
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function getVehicle(): VehicleState {
  return { ...state, location: { ...state.location } };
}

export function resetVehicle(): VehicleState {
  state = createDemoVehicle();
  return getVehicle();
}

export function applyCommand(request: CommandRequest): CommandResult {
  const { command } = request;

  switch (command) {
    case "lock":
      touch({ locked: true });
      return { ok: true, message: "Türen verriegelt.", vehicle: getVehicle() };
    case "unlock":
      touch({ locked: false });
      return { ok: true, message: "Türen entriegelt.", vehicle: getVehicle() };
    case "horn":
      return { ok: true, message: "Hupe ausgelöst.", vehicle: getVehicle() };
    case "flash":
      return { ok: true, message: "Lichter geblinkt.", vehicle: getVehicle() };
    case "wakeup":
      touch({});
      return { ok: true, message: "Fahrzeug aufgeweckt.", vehicle: getVehicle() };
    case "charge_start": {
      if (state.chargeStatus === "idle") {
        return {
          ok: false,
          message: "Fahrzeug ist nicht angeschlossen.",
          vehicle: getVehicle(),
        };
      }
      const power = 11;
      touch({
        chargeStatus: "charging",
        chargePowerKw: power,
        estimatedFullAt: estimateFullAt(
          state.batteryPercent,
          state.chargeLimitPercent,
          power,
        ),
      });
      return { ok: true, message: "Laden gestartet.", vehicle: getVehicle() };
    }
    case "charge_stop":
      touch({
        chargeStatus: state.chargeStatus === "idle" ? "idle" : "plugged",
        chargePowerKw: null,
        estimatedFullAt: null,
      });
      return { ok: true, message: "Laden gestoppt.", vehicle: getVehicle() };
    case "set_charge_limit": {
      const limit = Math.min(100, Math.max(50, request.chargeLimitPercent ?? 80));
      const next: Partial<VehicleState> = { chargeLimitPercent: limit };
      if (state.chargeStatus === "charging" && state.chargePowerKw) {
        next.estimatedFullAt = estimateFullAt(
          state.batteryPercent,
          limit,
          state.chargePowerKw,
        );
      }
      touch(next);
      return {
        ok: true,
        message: `Ladelimit auf ${limit}% gesetzt.`,
        vehicle: getVehicle(),
      };
    }
    case "climate_start":
      touch({
        climateStatus: state.cabinTempC < state.targetTempC ? "heating" : "cooling",
      });
      return {
        ok: true,
        message: "Vorklimatisierung gestartet (21°C).",
        vehicle: getVehicle(),
      };
    case "climate_stop":
      touch({ climateStatus: "off" });
      return {
        ok: true,
        message: "Vorklimatisierung gestoppt.",
        vehicle: getVehicle(),
      };
    case "battery_preheat_start":
      touch({ batteryPreheat: true });
      return {
        ok: true,
        message: "Batterie-Vorwärmung gestartet (E-3008).",
        vehicle: getVehicle(),
      };
    case "battery_preheat_stop":
      touch({ batteryPreheat: false });
      return {
        ok: true,
        message: "Batterie-Vorwärmung gestoppt.",
        vehicle: getVehicle(),
      };
    default:
      return { ok: false, message: "Unbekannter Befehl.", vehicle: getVehicle() };
  }
}

/** Simulate slow SOC drift while charging (called optionally by refresh). */
export function tickDemoCharge(): VehicleState {
  if (state.chargeStatus !== "charging" || !state.chargePowerKw) {
    return getVehicle();
  }

  const nextPercent = Math.min(
    state.chargeLimitPercent,
    state.batteryPercent + 0.4,
  );
  const done = nextPercent >= state.chargeLimitPercent;

  touch({
    batteryPercent: Math.round(nextPercent * 10) / 10,
    rangeKm: estimateRange(nextPercent),
    chargeStatus: done ? "complete" : "charging",
    chargePowerKw: done ? null : state.chargePowerKw,
    estimatedFullAt: done
      ? null
      : estimateFullAt(nextPercent, state.chargeLimitPercent, state.chargePowerKw),
  });

  return getVehicle();
}
