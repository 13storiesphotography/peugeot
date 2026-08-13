"use client";

import { ChargeCurve } from "@/components/ChargeCurve";
import { SectionHeader } from "@/components/SectionHeader";
import type { VehicleCommand, VehicleState } from "@/lib/types";
import type { ChargeSample } from "@/lib/vehicle/repository";
import {
  chargeSpeedLabel,
  normalizeChargeSpeedMode,
} from "@/lib/stellantis/charge-mode";

interface ChargePanelProps {
  vehicle: VehicleState;
  busy: boolean;
  chargeCurve?: ChargeSample[];
  onCommand: (
    command: VehicleCommand,
    opts?: { chargeLimitPercent?: number },
  ) => void;
}

function formatEta(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const statusLabel: Record<VehicleState["chargeStatus"], string> = {
  idle: "Nicht angeschlossen",
  plugged: "Angeschlossen",
  charging: "Lädt",
  complete: "Ziel erreicht",
  error: "Fehler",
};

export function ChargePanel({
  vehicle,
  busy,
  chargeCurve = [],
  onCommand,
}: ChargePanelProps) {
  const charging = vehicle.chargeStatus === "charging";
  const plugged = vehicle.chargeStatus !== "idle";
  const live = vehicle.mode === "live";
  const speed = normalizeChargeSpeedMode(vehicle.chargingMode);

  const statusLine = charging
    ? [
        chargeSpeedLabel(speed),
        vehicle.chargePowerKw != null
          ? `${vehicle.chargePowerKw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : statusLabel[vehicle.chargeStatus];

  return (
    <section className="animate-rise space-y-6 pt-2">
      <SectionHeader title="Laden" hint={statusLine} />

      <div className="flex flex-col items-center py-2">
        <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tabular-nums leading-none">
          {Math.round(vehicle.batteryPercent)}
          <span className="text-2xl text-[var(--accent-bright)]">%</span>
        </p>
        <div
          className="mt-5 h-1.5 w-40 overflow-hidden rounded-full"
          style={{ background: "rgba(143,168,181,0.15)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, vehicle.batteryPercent)}%`,
              background: charging
                ? speed === "quick"
                  ? "linear-gradient(90deg, #d4924a, #e8b86d)"
                  : "linear-gradient(90deg, #3da8a0, #5fe3c0)"
                : "#3da8a0",
            }}
          />
        </div>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          {vehicle.rangeKm} km Reichweite
        </p>
      </div>

      {charging ? (
        <div className="ui-surface px-4 py-4 text-center">
          <p className="text-sm font-semibold text-[var(--accent-bright)]">
            Ladevorgang aktiv
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Fertig gegen {formatEta(vehicle.estimatedFullAt)}
            {vehicle.chargePowerKw != null
              ? ` · ${vehicle.chargePowerKw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW`
              : ""}
          </p>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy || !plugged || live}
          onClick={() => onCommand("charge_start")}
          className="action-btn btn-primary w-full rounded-full px-5 py-4 text-sm font-semibold"
        >
          Laden starten
        </button>
      )}

      {!charging ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="ui-surface px-4 py-4">
            <dt className="text-xs text-[var(--fg-muted)]">Fertig gegen</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {formatEta(vehicle.estimatedFullAt)}
            </dd>
          </div>
          <div className="ui-surface px-4 py-4">
            <dt className="text-xs text-[var(--fg-muted)]">Reichweite</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {vehicle.rangeKm} km
            </dd>
          </div>
        </dl>
      ) : null}

      <ChargeCurve samples={chargeCurve} live={live} />
    </section>
  );
}
