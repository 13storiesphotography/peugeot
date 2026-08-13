/** Convert PSA chargingRate (km of range gained per hour) → estimated kW. */

export function estimateKmPerKwh(input: {
  rangeKm: number;
  batteryPercent: number;
  batteryCapacityKwh: number;
}): number {
  const soc = input.batteryPercent / 100;
  if (
    soc >= 0.05 &&
    input.rangeKm > 0 &&
    Number.isFinite(input.rangeKm) &&
    input.batteryCapacityKwh > 0
  ) {
    const fromLive = input.rangeKm / (soc * input.batteryCapacityKwh);
    // Sanity band for E-3008-class EVs (roughly 4–9 km/kWh).
    if (fromLive >= 4 && fromLive <= 9) return fromLive;
  }
  // Fallback: ~460 km WLTP-ish / 73 kWh ≈ 6.3 km/kWh
  return Math.max(1, (input.batteryCapacityKwh > 0 ? 460 : 400) / Math.max(1, input.batteryCapacityKwh));
}

export function chargingRateKmhToKw(
  rateKmh: number,
  efficiency: number,
): number {
  if (!Number.isFinite(rateKmh) || rateKmh <= 0) return 0;
  const kmPerKwh = Number.isFinite(efficiency) && efficiency > 0 ? efficiency : 6.3;
  return Math.round((rateKmh / kmPerKwh) * 10) / 10;
}

/**
 * Resolve display power from Stellantis status fields.
 * `chargingRate` is ALWAYS treated as km/h (PSA convention), never as kW.
 */
export function resolveChargePower(input: {
  rateKmh: number | null;
  powerKwHint: number | null;
  rangeKm: number;
  batteryPercent: number;
  batteryCapacityKwh: number;
}): { chargePowerKw: number | null; chargeRateKmh: number | null } {
  const rateKmh =
    input.rateKmh != null && Number.isFinite(input.rateKmh) && input.rateKmh > 0
      ? input.rateKmh
      : null;

  // Prefer an explicit power reading when present and plausible (0.5–350 kW).
  if (
    input.powerKwHint != null &&
    Number.isFinite(input.powerKwHint) &&
    input.powerKwHint >= 0.5 &&
    input.powerKwHint <= 350
  ) {
    const kw =
      input.powerKwHint > 80
        ? Math.round((input.powerKwHint / 1000) * 10) / 10
        : Math.round(input.powerKwHint * 10) / 10;
    return { chargePowerKw: kw, chargeRateKmh: rateKmh };
  }

  if (rateKmh != null) {
    const eff = estimateKmPerKwh(input);
    return {
      chargePowerKw: chargingRateKmhToKw(rateKmh, eff),
      chargeRateKmh: rateKmh,
    };
  }

  return { chargePowerKw: null, chargeRateKmh: null };
}
