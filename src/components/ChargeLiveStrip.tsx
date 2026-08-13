"use client";

import type { VehicleState } from "@/lib/types";
import {
  chargeSpeedLabel,
  normalizeChargeSpeedMode,
} from "@/lib/stellantis/charge-mode";

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
export function ChargeLiveStrip({ vehicle }: { vehicle: VehicleState }) {
  if (vehicle.chargeStatus !== "charging") return null;

  const speed = normalizeChargeSpeedMode(vehicle.chargingMode);
  const parts = [
    chargeSpeedLabel(speed),
    formatKw(vehicle.chargePowerKw),
    formatRate(vehicle.chargeRateKmh),
    vehicle.estimatedFullAt
      ? `fertig ~${formatEta(vehicle.estimatedFullAt)}`
      : null,
  ].filter(Boolean);

  const accent =
    speed === "quick" ? "var(--warn)" : "var(--accent-bright)";

  return (
    <div
      className="animate-rise overflow-hidden rounded-2xl border px-4 py-3"
      style={{
        borderColor:
          speed === "quick"
            ? "rgba(232,184,109,0.35)"
            : "rgba(95,227,192,0.28)",
        background:
          speed === "quick"
            ? "linear-gradient(135deg, rgba(232,184,109,0.12), rgba(14,28,40,0.55))"
            : "linear-gradient(135deg, rgba(95,227,192,0.12), rgba(14,28,40,0.55))",
      }}
      role="status"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold" style={{ color: accent }}>
          Lädt · {Math.round(vehicle.batteryPercent)}%
        </p>
        <p className="text-xs tabular-nums text-[var(--fg-muted)]">
          Ziel {Math.round(vehicle.chargeLimitPercent)}%
        </p>
      </div>
      <p className="mt-1 text-xs text-[var(--fg-muted)]">{parts.join(" · ")}</p>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full"
        style={{ background: "rgba(143,168,181,0.15)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, vehicle.batteryPercent)}%`,
            background:
              speed === "quick"
                ? "linear-gradient(90deg, #d4924a, #e8b86d)"
                : "linear-gradient(90deg, #3da8a0, #5fe3c0)",
          }}
        />
      </div>
    </div>
  );
}
