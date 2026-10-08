/**
 * Battery SoC accent — matches Peugeot cluster: warm only when critically low.
 * (Previously we tinted orange for DC/Quick charging; that was wrong.)
 */
export const BATTERY_LOW_PERCENT = 12;

export function isBatteryLow(percent: number): boolean {
  return Number.isFinite(percent) && percent < BATTERY_LOW_PERCENT;
}

/** CSS color for % digits and “Lädt”-labels. */
export function batteryAccentColor(percent: number): string {
  return isBatteryLow(percent) ? "var(--warn)" : "var(--accent-bright)";
}

/** Hex for SVG / inline paints that cannot use CSS variables. */
export function batteryAccentHex(percent: number): string {
  return isBatteryLow(percent) ? "#e8b86d" : "#5fe3c0";
}

export function batteryAccentBrightHex(percent: number): string {
  return isBatteryLow(percent) ? "#ffe0a8" : "#a8fff0";
}

export function batteryHaloRgba(percent: number, charging: boolean): string {
  if (!charging) return "";
  return isBatteryLow(percent)
    ? "rgba(232,184,109,0.38)"
    : "rgba(95,227,192,0.35)";
}

export function batteryStripBorder(percent: number): string {
  return isBatteryLow(percent)
    ? "rgba(232,184,109,0.35)"
    : "rgba(95,227,192,0.28)";
}

export function batteryStripBackground(percent: number): string {
  return isBatteryLow(percent)
    ? "linear-gradient(135deg, rgba(232,184,109,0.12), rgba(14,28,40,0.55))"
    : "linear-gradient(135deg, rgba(95,227,192,0.12), rgba(14,28,40,0.55))";
}

/** Progress-bar fill; animated gradient while charging. */
export function batteryBarFill(percent: number, charging: boolean): string {
  if (isBatteryLow(percent)) {
    return charging
      ? "linear-gradient(90deg, #d4924a, #e8b86d, #d4924a)"
      : "#e8b86d";
  }
  return charging
    ? "linear-gradient(90deg, #3da8a0, #5fe3c0, #3da8a0)"
    : "#3da8a0";
}
