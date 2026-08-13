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
  return String(Math.round(tempC));
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
  const outdoor = formatTemp(vehicle.outdoorTempC);

  const statusHint = active
    ? vehicle.climateStatus === "heating"
      ? "heizt"
      : vehicle.climateStatus === "cooling"
        ? "kühlt"
        : "aktiv"
    : "aus";

  return (
    <section className="animate-rise space-y-6 pt-2">
      <SectionHeader title="Klima" hint={`Status · ${statusHint}`} />

      <div className="flex flex-col items-center py-4">
        <p className="eyebrow mb-3">Außentemperatur</p>
        <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tabular-nums leading-none">
          {outdoor}
          <span className="text-2xl text-[var(--accent-bright)]">°</span>
        </p>
        <p className="mt-3 max-w-xs text-center text-sm text-[var(--fg-muted)]">
          {live
            ? "Vom Fahrzeug gemessen — Innentemperatur liefert Peugeot nicht."
            : "Demo-Wert"}
        </p>
      </div>

      <button
        type="button"
        disabled={busy || !climateRemoteOk}
        onClick={() => onCommand(active ? "climate_stop" : "climate_start")}
        className={`action-btn w-full rounded-full px-5 py-4 text-sm font-semibold ${
          active ? "btn-danger-soft" : "btn-primary"
        }`}
        style={{ opacity: climateRemoteOk ? 1 : 0.55 }}
      >
        {active ? "Klima stoppen" : "Klima starten"}
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
