"use client";

import type { VehicleState } from "@/lib/types";
import {
  chargeSpeedLabel,
  normalizeChargeSpeedMode,
} from "@/lib/stellantis/charge-mode";
import {
  batteryAccentColor,
  batteryBarFill,
  batteryStripBackground,
  batteryStripBorder,
} from "@/lib/vehicle/battery-tone";

function formatEta(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatKw(kw: number | null): string | null {
  if (kw == null || !Number.isFinite(kw)) return null;
  return `${kw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW`;
}

function formatRate(kmh: number | null): string | null {
  if (kmh == null || !Number.isFinite(kmh) || kmh <= 0) return null;
  return `+${Math.round(kmh)} km/h`;
}

/** Compact live metrics while the car is charging — home overview. */
export function ChargeLiveStrip({
  vehicle,
}: {
  vehicle: VehicleState;
  /** Kept for call-site compat; freshness lives on the Laden tab. */
  nowMs?: number;
}) {
  if (vehicle.chargeStatus !== "charging") return null;

  const speed = normalizeChargeSpeedMode(vehicle.chargingMode);
  const percent = vehicle.batteryPercent;
  const parts = [
    chargeSpeedLabel(speed),
    formatKw(vehicle.chargePowerKw),
    formatRate(vehicle.chargeRateKmh),
    vehicle.estimatedFullAt
      ? `fertig ~${formatEta(vehicle.estimatedFullAt)}`
      : null,
  ].filter(Boolean);

  return (
    <div
      className="animate-rise overflow-hidden rounded-2xl border px-4 py-3"
      style={{
        borderColor: batteryStripBorder(percent),
        background: batteryStripBackground(percent),
      }}
      role="status"
    >
      <p
        className="text-sm font-semibold"
        style={{ color: batteryAccentColor(percent) }}
      >
        Lädt · {Math.round(percent)}%
      </p>
      <p className="mt-1 text-xs text-[var(--fg-muted)]">
        {parts.join(" · ")}
        {` · Ziel ${Math.round(vehicle.chargeLimitPercent)}%`}
      </p>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full"
        style={{ background: "rgba(143,168,181,0.15)" }}
      >
        <div
          className="charge-progress-fill is-charging h-full rounded-full"
          style={{
            width: `${Math.min(100, percent)}%`,
            background: batteryBarFill(percent, true),
          }}
        />
      </div>
    </div>
  );
}
