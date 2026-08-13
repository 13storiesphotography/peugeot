import type { CommandRequest, CommandResult, VehicleState } from "@/lib/types";
import { estimateFullAt, estimateRange } from "./defaults";

function touch(
  state: VehicleState,
  next: Partial<VehicleState>,
): VehicleState {
  return {
    ...state,
    ...next,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function applyCommandToState(
  state: VehicleState,
  request: CommandRequest,
): CommandResult {
  const { command } = request;

  switch (command) {
    case "lock":
      return {
        ok: true,
        message: "Türen verriegelt.",
        vehicle: touch(state, { locked: true }),
      };
    case "unlock":
      return {
        ok: true,
        message: "Türen entriegelt.",
        vehicle: touch(state, { locked: false }),
      };
    case "horn":
      return { ok: true, message: "Hupe ausgelöst.", vehicle: touch(state, {}) };
    case "flash":
      return {
        ok: true,
        message: "Lichter geblinkt.",
        vehicle: touch(state, {}),
      };
    case "wakeup":
      return {
        ok: true,
        message: "Fahrzeug aufgeweckt.",
        vehicle: touch(state, {}),
      };
    case "charge_start": {
      if (state.mode === "live") {
        return {
          ok: false,
          message:
            "Live-Laden steuert das Fahrzeug über MyPeugeot. Status wird vom Auto gelesen — bitte am Wagen oder in der Peugeot-App starten.",
          vehicle: state,
        };
      }
      if (state.chargeStatus === "idle") {
        return {
          ok: false,
          message: "Fahrzeug ist nicht angeschlossen.",
          vehicle: state,
        };
      }
      const power = 11;
      return {
        ok: true,
        message: "Laden gestartet (Demo).",
        vehicle: touch(state, {
          chargeStatus: "charging",
          chargePowerKw: power,
          chargeRateKmh: Math.round(power * 6.3),
          estimatedFullAt: estimateFullAt(
            state.batteryPercent,
            state.chargeLimitPercent,
            state.batteryCapacityKwh,
            power,
          ),
        }),
      };
    }
    case "charge_stop":
      if (state.mode === "live") {
        return {
          ok: false,
          message:
            "Live-Stopp noch nicht angebunden — bitte in der Peugeot-App oder am Ladepunkt stoppen.",
          vehicle: state,
        };
      }
      return {
        ok: true,
        message: "Laden gestoppt (Demo).",
        vehicle: touch(state, {
          chargeStatus: state.chargeStatus === "idle" ? "idle" : "plugged",
          chargePowerKw: null,
          chargeRateKmh: null,
          estimatedFullAt: null,
        }),
      };
    case "set_charge_limit": {
      const limit = Math.min(100, Math.max(50, request.chargeLimitPercent ?? 80));
      const next: Partial<VehicleState> = { chargeLimitPercent: limit };
      if (state.chargeStatus === "charging" && state.chargePowerKw) {
        next.estimatedFullAt = estimateFullAt(
          state.batteryPercent,
          limit,
          state.batteryCapacityKwh,
          state.chargePowerKw,
        );
      }
      return {
        ok: true,
        message: `Ladelimit auf ${limit}% gesetzt.`,
        vehicle: touch(state, next),
      };
    }
    case "climate_start": {
      const target = state.targetTempC;
      return {
        ok: true,
        message: `Vorklimatisierung gestartet (${target}°C).`,
        vehicle: touch(state, {
          climateStatus: state.cabinTempC < target ? "heating" : "cooling",
        }),
      };
    }
    case "climate_stop":
      return {
        ok: true,
        message: "Vorklimatisierung gestoppt.",
        vehicle: touch(state, { climateStatus: "off" }),
      };
    case "set_climate_temp": {
      const target = Math.min(
        28,
        Math.max(16, Math.round(request.targetTempC ?? state.targetTempC)),
      );
      const climateOn = state.climateStatus !== "off";
      return {
        ok: true,
        message: `Zieltemperatur ${target}°C.`,
        vehicle: touch(state, {
          targetTempC: target,
          climateStatus: climateOn
            ? state.cabinTempC < target
              ? "heating"
              : "cooling"
            : "off",
        }),
      };
    }
    case "battery_preheat_start":
      return {
        ok: true,
        message: "Batterie-Vorwärmung gestartet (E-3008).",
        vehicle: touch(state, { batteryPreheat: true }),
      };
    case "battery_preheat_stop":
      return {
        ok: true,
        message: "Batterie-Vorwärmung gestoppt.",
        vehicle: touch(state, { batteryPreheat: false }),
      };
    default:
      return { ok: false, message: "Unbekannter Befehl.", vehicle: state };
  }
}

export function tickChargeState(
  state: VehicleState,
  nowMs: number = Date.now(),
): VehicleState {
  // Live vehicles must never simulate SoC — only MyPeugeot status updates %.
  if (state.mode === "live") {
    return state;
  }
  if (state.chargeStatus !== "charging" || !state.chargePowerKw) {
    return state;
  }

  const lastMs = new Date(state.lastUpdatedAt).getTime();
  if (!Number.isFinite(lastMs)) {
    return state;
  }

  // Physics: percent/hour ≈ power_kW / capacity_kWh * 100
  // e.g. 11 kW / 73 kWh ≈ 15 %/h → ~0.033 % per 8s poll (not 0.4 %).
  const elapsedHours = Math.max(0, (nowMs - lastMs) / 3_600_000);
  if (elapsedHours < 1 / 3_600) {
    return state;
  }

  const percentPerHour =
    (state.chargePowerKw / Math.max(1, state.batteryCapacityKwh)) * 100;
  const nextPercent = Math.min(
    state.chargeLimitPercent,
    Math.round((state.batteryPercent + percentPerHour * elapsedHours) * 10) /
      10,
  );
  const done = nextPercent >= state.chargeLimitPercent;

  return touch(state, {
    batteryPercent: nextPercent,
    rangeKm: estimateRange(nextPercent),
    chargeStatus: done ? "complete" : "charging",
    chargePowerKw: done ? null : state.chargePowerKw,
    chargeRateKmh: done ? null : state.chargeRateKmh,
    estimatedFullAt: done
      ? null
      : estimateFullAt(
          nextPercent,
          state.chargeLimitPercent,
          state.batteryCapacityKwh,
          state.chargePowerKw,
        ),
  });
}
