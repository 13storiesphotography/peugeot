"use client";

import { ChargeCurve } from "@/components/ChargeCurve";
import type { VehicleCommand, VehicleState } from "@/lib/types";
import type { ChargeSample } from "@/lib/vehicle/repository";
import {
  chargeSpeedHint,
  chargeSpeedLabel,
  describeVehicleChargeTarget,
  isEightyPercentLimitActive,
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
  complete: "Ladeziel erreicht",
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
  const vehicleTarget = describeVehicleChargeTarget(vehicle);
  const eightyOn = isEightyPercentLimitActive(vehicle);
  const preferred = vehicle.preferredChargeLimitPercent ?? (eightyOn ? 80 : 100);
  const vehicleSaysEighty =
    vehicle.chargeLimitKnown && vehicle.chargeLimitPercent <= 80;
  const vehicleSaysFull =
    vehicle.chargeLimitKnown && vehicle.chargeLimitPercent >= 100;

  return (
    <section className="animate-rise space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Laden
          </h2>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            {statusLabel[vehicle.chargeStatus]}
          </p>
          {charging && vehicle.chargePowerKw != null ? (
            <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums text-[var(--accent-bright)]">
              {vehicle.chargePowerKw.toLocaleString("de-DE", {
                maximumFractionDigits: 1,
              })}{" "}
              kW
              {vehicle.chargeRateKmh != null ? (
                <span className="ml-2 text-sm font-normal text-[var(--fg-muted)]">
                  {Math.round(vehicle.chargeRateKmh)} km/h
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <p className="font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums">
          {Math.round(vehicle.batteryPercent)}
          <span className="text-lg text-[var(--accent-bright)]">%</span>
        </p>
      </div>

      <div
        className="rounded-2xl border px-4 py-4"
        style={{
          borderColor:
            speed === "quick"
              ? "rgba(232,184,109,0.45)"
              : speed === "slow" && charging
                ? "rgba(95,227,192,0.4)"
                : "var(--line)",
          background:
            speed === "quick"
              ? "rgba(232,184,109,0.1)"
              : speed === "slow" && charging
                ? "rgba(95,227,192,0.08)"
                : "rgba(14,28,40,0.4)",
        }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
          Lademodus
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
          {chargeSpeedLabel(speed)}
        </p>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          {chargeSpeedHint(speed)}
        </p>
      </div>

      <div
        className="h-3 overflow-hidden rounded-full"
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

      {charging ? (
        <p
          className="rounded-full px-5 py-4 text-center text-sm font-semibold"
          style={{
            background:
              speed === "quick"
                ? "rgba(232,184,109,0.14)"
                : "rgba(95,227,192,0.12)",
            border: `1px solid ${
              speed === "quick"
                ? "rgba(232,184,109,0.4)"
                : "rgba(95,227,192,0.35)"
            }`,
            color: speed === "quick" ? "var(--warn)" : "var(--accent-bright)",
          }}
        >
          Lädt · {chargeSpeedLabel(speed)}
        </p>
      ) : (
        <button
          type="button"
          disabled={busy || !plugged || live}
          onClick={() => onCommand("charge_start")}
          className="action-btn w-full rounded-full px-5 py-4 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
            opacity: live || !plugged ? 0.55 : 1,
          }}
        >
          Laden starten
        </button>
      )}

      <div
        className="rounded-2xl border px-4 py-4"
        style={{
          borderColor: eightyOn ? "rgba(95,227,192,0.45)" : "var(--line)",
          background: eightyOn
            ? "rgba(95,227,192,0.1)"
            : "rgba(14,28,40,0.4)",
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold">Laden auf 80% begrenzen</p>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              Schont die Batterie im Alltag
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={eightyOn}
            disabled={busy}
            onClick={() =>
              onCommand("set_charge_limit", {
                chargeLimitPercent: eightyOn ? 100 : 80,
              })
            }
            className="action-btn relative h-8 w-14 shrink-0 rounded-full transition"
            style={{
              background: eightyOn
                ? "linear-gradient(135deg, #5fe3c0, #3da8a0)"
                : "rgba(143,168,181,0.25)",
            }}
          >
            <span
              className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition"
              style={{ left: eightyOn ? "1.75rem" : "0.25rem" }}
            />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span
            className="rounded-full px-2.5 py-1 font-semibold"
            style={{
              background: vehicleSaysEighty
                ? "rgba(95,227,192,0.18)"
                : vehicleSaysFull
                  ? "rgba(232,184,109,0.15)"
                  : "rgba(143,168,181,0.12)",
              color: vehicleSaysEighty
                ? "var(--accent-bright)"
                : vehicleSaysFull
                  ? "var(--warn)"
                  : "var(--fg-muted)",
            }}
          >
            Fahrzeug: {vehicleTarget.label}
          </span>
          <span className="rounded-full bg-black/25 px-2.5 py-1 text-[var(--fg-muted)]">
            Ziel: {preferred <= 80 ? "80%" : "100%"}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
          <dt className="text-[var(--fg-muted)]">Fertig gegen</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatEta(vehicle.estimatedFullAt)}
          </dd>
        </div>
        <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
          <dt className="text-[var(--fg-muted)]">Reichweite</dt>
          <dd className="mt-1 font-semibold tabular-nums">{vehicle.rangeKm} km</dd>
        </div>
        <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
          <dt className="text-[var(--fg-muted)]">Kapazität</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {vehicle.batteryCapacityKwh} kWh
          </dd>
        </div>
        <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
          <dt className="text-[var(--fg-muted)]">Leistung</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {vehicle.chargePowerKw != null
              ? `${vehicle.chargePowerKw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW`
              : "—"}
          </dd>
        </div>
      </dl>

      <ChargeCurve samples={chargeCurve} live={live} />
    </section>
  );
}
