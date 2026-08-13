"use client";

import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import type { VehicleCommand, VehicleState } from "@/lib/types";

interface ClimatePanelProps {
  vehicle: VehicleState;
  busy: boolean;
  remoteReady?: boolean;
  onCommand: (command: VehicleCommand) => void;
  onOpenSchedule?: () => void;
}

function formatTemp(tempC: number): string {
  if (!Number.isFinite(tempC)) return "—";
  return `${Math.round(tempC)}°`;
}

export function ClimatePanel({
  vehicle,
  busy,
  remoteReady = false,
  onCommand,
  onOpenSchedule,
}: ClimatePanelProps) {
  const live = vehicle.mode === "live";
  const active = vehicle.climateStatus !== "off";
  const climateRemoteOk = !live || remoteReady;

  // Peugeot only reports remote preconditioning — not cabin AC while driving.
  // Never imply "off" when inactive; that reads as wrong on the road.
  const statusHint = active
    ? vehicle.climateStatus === "heating"
      ? "Vorklima · heizt"
      : vehicle.climateStatus === "cooling"
        ? "Vorklima · kühlt"
        : "Vorklima aktiv"
    : "Fernstart für Vorklima";

  return (
    <section className="animate-rise space-y-6 pt-2">
      <SectionHeader title="Klima" hint={statusHint} />

      {active ? (
        <div className="ui-surface px-4 py-4 text-center">
          <p className="text-sm font-semibold text-[var(--accent-bright)]">
            Vorklima läuft
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            Status kommt von der Fernvorklimatisierung — nicht von der Klima
            während der Fahrt.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy || !climateRemoteOk}
        onClick={() => onCommand(active ? "climate_stop" : "climate_start")}
        className={`action-btn w-full rounded-full px-5 py-4 text-sm font-semibold ${
          active ? "btn-danger-soft" : "btn-primary"
        }`}
        style={{ opacity: climateRemoteOk ? 1 : 0.55 }}
      >
        {active ? "Vorklima stoppen" : "Vorklima starten"}
      </button>

      {!climateRemoteOk ? (
        <p className="text-center text-xs text-[var(--fg-muted)]">
          Einmal unter{" "}
          <Link
            href="/control/settings"
            className="text-[var(--accent-bright)] underline-offset-2 hover:underline"
          >
            Einstellungen
          </Link>{" "}
          die Fernbedienung einrichten.
        </p>
      ) : null}

      <p className="text-center text-xs text-[var(--fg-muted)]">
        Außen {formatTemp(vehicle.outdoorTempC)}
        {live ? null : " · Demo"}
      </p>

      {onOpenSchedule ? (
        <button
          type="button"
          onClick={onOpenSchedule}
          className="ui-link-row w-full text-left"
        >
          <div>
            <p className="eyebrow">Zeitpläne</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">
              Vorklima unter Planen
            </p>
          </div>
          <span className="text-[var(--fg-muted)]" aria-hidden>
            ›
          </span>
        </button>
      ) : null}
    </section>
  );
}
