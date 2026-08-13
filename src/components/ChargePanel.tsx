"use client";

import type { VehicleCommand, VehicleState } from "@/lib/types";

interface ChargePanelProps {
  vehicle: VehicleState;
  busy: boolean;
  onCommand: (command: VehicleCommand, chargeLimitPercent?: number) => void;
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
  complete: "Ladeziel erreicht",
  error: "Fehler",
};

export function ChargePanel({ vehicle, busy, onCommand }: ChargePanelProps) {
  const charging = vehicle.chargeStatus === "charging";
  const plugged = vehicle.chargeStatus !== "idle";

  return (
    <section className="panel animate-rise-delay-2 rounded-[1.5rem] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
            Laden
          </h2>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            {statusLabel[vehicle.chargeStatus]}
            {vehicle.chargePowerKw ? ` · ${vehicle.chargePowerKw} kW` : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={busy || (!plugged && !charging)}
          onClick={() => onCommand(charging ? "charge_stop" : "charge_start")}
          className="action-btn rounded-full px-4 py-2 text-sm font-semibold"
          style={{
            background: charging
              ? "rgba(224,122,106,0.16)"
              : "rgba(95,227,192,0.16)",
            border: `1px solid ${charging ? "rgba(224,122,106,0.4)" : "rgba(95,227,192,0.4)"}`,
            color: charging ? "var(--danger)" : "var(--accent-bright)",
          }}
        >
          {charging ? "Stoppen" : "Starten"}
        </button>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[var(--fg-muted)]">Ladelimit</span>
          <span className="font-semibold tabular-nums">{vehicle.chargeLimitPercent}%</span>
        </div>
        <input
          type="range"
          min={50}
          max={100}
          step={5}
          value={vehicle.chargeLimitPercent}
          disabled={busy}
          onChange={(e) =>
            onCommand("set_charge_limit", Number(e.target.value))
          }
          className="w-full accent-[var(--accent-bright)]"
          aria-label="Ladelimit"
        />
        <div className="mt-2 flex justify-between text-xs text-[var(--fg-muted)]">
          <span>50%</span>
          <span>Empfohlen 80%</span>
          <span>100%</span>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-[var(--fg-muted)]">Fertig gegen</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatEta(vehicle.estimatedFullAt)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--fg-muted)]">Kapazität</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {vehicle.batteryCapacityKwh} kWh
          </dd>
        </div>
      </dl>
    </section>
  );
}
