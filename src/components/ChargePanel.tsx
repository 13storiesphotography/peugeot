"use client";

import { ChargeCurve } from "@/components/ChargeCurve";
import { DataFreshnessBadge } from "@/components/DataFreshnessBadge";
import { SectionHeader } from "@/components/SectionHeader";
import type { VehicleCommand, VehicleState } from "@/lib/types";
import type { ChargeSample } from "@/lib/vehicle/repository";
import {
  chargeSpeedHint,
  chargeSpeedLabel,
  effectiveChargeTargetPercent,
  isEightyPercentLimitActive,
  normalizeChargeSpeedMode,
} from "@/lib/stellantis/charge-mode";

interface ChargePanelProps {
  vehicle: VehicleState;
  busy: boolean;
  chargeCurve?: ChargeSample[];
  isPro?: boolean;
  nowMs?: number;
  offline?: boolean;
  refreshing?: boolean;
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

function formatKw(kw: number | null): string {
  if (kw == null || !Number.isFinite(kw)) return "—";
  return `${kw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW`;
}

function formatRate(kmh: number | null): string {
  if (kmh == null || !Number.isFinite(kmh) || kmh <= 0) return "—";
  return `+${Math.round(kmh)} km/h`;
}

const statusLabel: Record<VehicleState["chargeStatus"], string> = {
  idle: "Nicht am Ladekabel",
  plugged: "Am Ladekabel",
  charging: "Lädt",
  complete: "Ziel erreicht",
  error: "Fehler",
};

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[var(--fg-muted)]">{label}</p>
      <p className="mt-1 truncate font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-[var(--fg-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ChargePanel({
  vehicle,
  busy,
  chargeCurve = [],
  isPro = false,
  nowMs,
  offline = false,
  refreshing = false,
  onCommand,
}: ChargePanelProps) {
  const charging = vehicle.chargeStatus === "charging";
  const pluggedIn =
    vehicle.chargeStatus === "plugged" ||
    vehicle.chargeStatus === "charging" ||
    vehicle.chargeStatus === "complete";
  const live = vehicle.mode === "live";
  const speed = normalizeChargeSpeedMode(vehicle.chargingMode);
  const eightyOn = isPro && isEightyPercentLimitActive(vehicle);
  const targetPercent = isPro
    ? effectiveChargeTargetPercent(vehicle)
    : 100;
  const vehicleReportsFull =
    live &&
    vehicle.chargeLimitKnown &&
    vehicle.chargeLimitPercent >= 100 &&
    eightyOn;

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
    <section className="animate-rise space-y-6 pt-2 lg:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader title="Laden" hint={statusLine} hideTitleOnDesktop />
        {/* Colored badge only when on cable — idle stays quiet text. */}
        <DataFreshnessBadge
          lastUpdatedAt={vehicle.lastUpdatedAt}
          nowMs={nowMs}
          mode={vehicle.mode}
          offline={offline}
          refreshing={refreshing}
          showDetail={pluggedIn}
          variant={pluggedIn ? "badge" : "plain"}
          className="lg:pt-1"
        />
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
        <div className="flex flex-col items-center py-2 lg:items-start lg:py-0">
          <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tabular-nums leading-none">
            {Math.round(vehicle.batteryPercent)}
            <span
              className="text-2xl"
              style={{
                color:
                  charging && speed === "quick"
                    ? "var(--warn)"
                    : "var(--accent-bright)",
              }}
            >
              %
            </span>
          </p>
          <div
            className="mt-5 h-1.5 w-40 overflow-hidden rounded-full lg:w-full lg:max-w-xs"
            style={{ background: "rgba(143,168,181,0.15)" }}
          >
            <div
              className={`h-full rounded-full transition-all duration-700 ${charging ? "charge-progress-fill is-charging" : ""}`}
              style={{
                width: `${Math.min(100, vehicle.batteryPercent)}%`,
                background: charging
                  ? speed === "quick"
                    ? "linear-gradient(90deg, #d4924a, #e8b86d, #d4924a)"
                    : "linear-gradient(90deg, #3da8a0, #5fe3c0, #3da8a0)"
                  : "#3da8a0",
              }}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--fg-muted)] lg:text-left">
            {vehicle.rangeKm} km Reichweite · Ziel {Math.round(targetPercent)}%
          </p>
        </div>

        <div className="space-y-3">
          {charging ? (
            <div className="ui-surface grid grid-cols-2 gap-x-4 gap-y-4 px-4 py-4">
              <Metric
                label="Leistung"
                value={formatKw(vehicle.chargePowerKw)}
                hint={chargeSpeedHint(speed)}
              />
              <Metric
                label="Tempo"
                value={formatRate(vehicle.chargeRateKmh)}
                hint={chargeSpeedLabel(speed)}
              />
              <Metric
                label="Fertig gegen"
                value={formatEta(vehicle.estimatedFullAt)}
                hint="Schätzung vom Fahrzeug"
              />
            </div>
          ) : null}

          <div
            className={`ui-surface flex items-center justify-between gap-4 px-4 py-4 ${eightyOn ? "ui-surface-active" : ""}`}
          >
            <div className="min-w-0">
              <p className="font-semibold">
                Limit 80%{" "}
                {isPro ? null : (
                  <span className="ml-1 rounded-full bg-[var(--accent-bright)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-bright)]">
                    Pro
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                {!isPro
                  ? "Ansehen frei — Umschalten mit Pro"
                  : live
                    ? eightyOn
                      ? vehicleReportsFull
                        ? "App begrenzt auf 80% — Fahrzeug meldet noch 100%"
                        : "Aktiv — stoppt beim Erreichen von 80%"
                      : "Aus — lädt bis 100%"
                    : "Schont die Batterie im Alltag"}
              </p>
            </div>
            {isPro ? (
              <button
                type="button"
                role="switch"
                aria-checked={eightyOn}
                disabled={busy}
                title={live ? "Ladeziel per Fernbedienung umschalten" : undefined}
                onClick={() =>
                  onCommand("set_charge_limit", {
                    chargeLimitPercent: eightyOn ? 100 : 80,
                  })
                }
                className="action-btn relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-55"
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
            ) : (
              <a
                href="/control/settings#pro"
                className="action-btn shrink-0 rounded-full px-3 py-2 text-xs font-semibold"
                style={{
                  background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
                  color: "#031016",
                }}
              >
                Pro ansehen
              </a>
            )}
          </div>
        </div>
      </div>

      <ChargeCurve samples={chargeCurve} live={live} />
    </section>
  );
}
