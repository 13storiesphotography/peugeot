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

function formatCabinTemp(tempC: number): string {
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
  const cabin = formatCabinTemp(vehicle.cabinTempC);

  const statusHint = active
    ? vehicle.climateStatus === "heating"
      ? "heizt"
      : vehicle.climateStatus === "cooling"
        ? "kühlt"
        : "aktiv"
    : "aus";

  return (
    <section className="animate-rise space-y-6">
      <SectionHeader title="Klima" hint={`Status · ${statusHint}`} />

      <div className="flex flex-col items-center py-6">
        <p className="eyebrow mb-3">Innentemperatur</p>
        <p className="font-[family-name:var(--font-display)] text-6xl font-semibold tabular-nums leading-none">
          {cabin}
          <span className="text-3xl text-[var(--accent-bright)]">°</span>
        </p>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          {live
            ? "Aktueller Wert vom Fahrzeug"
            : "Demo-Wert — nach Verbindung vom Auto"}
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

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy || live}
          onClick={() =>
            onCommand(
              vehicle.batteryPreheat
                ? "battery_preheat_stop"
                : "battery_preheat_start",
            )
          }
          className={`action-btn ui-surface px-4 py-4 text-left ${
            vehicle.batteryPreheat ? "ui-surface-active" : ""
          }`}
          style={{ opacity: live ? 0.55 : 1 }}
        >
          <p className="font-semibold">Batterie vorwärmen</p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            {vehicle.batteryPreheat ? "Aktiv" : "Aus"}
            {live ? " · nur Demo" : ""}
          </p>
        </button>
        {onOpenSchedule ? (
          <button
            type="button"
            onClick={onOpenSchedule}
            className="action-btn ui-surface px-4 py-4 text-left"
          >
            <p className="font-semibold">Zeitpläne</p>
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              Vorklima unter Planen
            </p>
          </button>
        ) : null}
      </div>
    </section>
  );
}
