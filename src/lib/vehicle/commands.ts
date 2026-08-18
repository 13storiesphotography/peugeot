import type { CommandRequest, CommandResult, VehicleState } from "@/lib/types";
import type { Translator } from "@/i18n/translate";
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

/** Apply local climate status after a successful live remote. */
export function touchClimate(state: VehicleState, activate: boolean): VehicleState {
  if (!activate) return touch(state, { climateStatus: "off" });
  return touch(state, {
    climateStatus: "preconditioning",
  });
}

/** Apply local lock status after a successful live remote. */
export function touchLock(state: VehicleState, locked: boolean): VehicleState {
  return touch(state, { locked });
}

export function applyCommandToState(
  state: VehicleState,
  request: CommandRequest,
  t: Translator,
): CommandResult {
  const { command } = request;

  switch (command) {
    case "lock":
      return {
        ok: true,
        message: t("cmd.lockOk"),
        vehicle: touch(state, { locked: true }),
      };
    case "unlock":
      return {
        ok: true,
        message: t("cmd.unlockOk"),
        vehicle: touch(state, { locked: false }),
      };
    case "horn":
      return { ok: true, message: t("cmd.hornOk"), vehicle: touch(state, {}) };
    case "flash":
      return {
        ok: true,
        message: t("cmd.flashOk"),
        vehicle: touch(state, {}),
      };
    case "wakeup":
      return {
        ok: true,
        message: t("cmd.wakeOk"),
        vehicle: touch(state, {}),
      };
    case "charge_start": {
      if (state.mode === "live") {
        return {
          ok: false,
          message: t("cmd.chargeStartUnavailable"),
          vehicle: state,
        };
      }
      if (state.chargeStatus === "idle") {
        return {
          ok: false,
          message: t("cmd.notPlugged"),
          vehicle: state,
        };
      }
      const power = 11;
      return {
        ok: true,
        message: t("cmd.chargeStarted"),
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
    case "set_charge_limit": {
      const limit = Math.min(100, Math.max(50, request.chargeLimitPercent ?? 80));
      const next: Partial<VehicleState> = {
        preferredChargeLimitPercent: limit,
        chargeLimitPercent: limit,
        chargeLimitKnown: state.mode !== "live" || state.chargeLimitKnown,
        chargeLimitEnforcedAt: null,
      };
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
        message:
          limit <= 80 ? t("cmd.limit80") : t("cmd.limit100"),
        vehicle: touch(state, next),
      };
    }
    case "climate_start": {
      if (state.mode === "live") {
        return {
          ok: false,
          message: t("cmd.climateStartUnavailable"),
          vehicle: state,
        };
      }
      const target = state.targetTempC;
      return {
        ok: true,
        message: t("cmd.climateStarted", { temp: target }),
        vehicle: touch(state, {
          climateStatus: "preconditioning",
        }),
      };
    }
    case "climate_stop":
      if (state.mode === "live") {
        return {
          ok: false,
          message: t("cmd.climateStopUnavailable"),
          vehicle: state,
        };
      }
      return {
        ok: true,
        message: t("cmd.climateStopped"),
        vehicle: touch(state, { climateStatus: "off" }),
      };
    case "set_climate_temp": {
      const target = Math.min(
        28,
        Math.max(16, Math.round(request.targetTempC ?? state.targetTempC)),
      );
      const climateOn = state.mode !== "live" && state.climateStatus !== "off";
      return {
        ok: true,
        message: t("cmd.targetTemp", { temp: target }),
        vehicle: touch(state, {
          targetTempC: target,
          climateStatus: climateOn
            ? "preconditioning"
            : state.climateStatus,
        }),
      };
    }
    case "battery_preheat_start":
      if (state.mode === "live") {
        return {
          ok: false,
          message: t("cmd.preheatUnavailable"),
          vehicle: state,
        };
      }
      return {
        ok: true,
        message: t("cmd.preheatOn"),
        vehicle: touch(state, { batteryPreheat: true }),
      };
    case "battery_preheat_stop":
      if (state.mode === "live") {
        return {
          ok: false,
          message: t("cmd.preheatUnavailable"),
          vehicle: state,
        };
      }
      return {
        ok: true,
        message: t("cmd.preheatOff"),
        vehicle: touch(state, { batteryPreheat: false }),
      };
    default:
      return { ok: false, message: t("cmd.unknown"), vehicle: state };
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
