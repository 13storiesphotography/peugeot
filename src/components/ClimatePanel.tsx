"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { SchedulePanel } from "@/components/SchedulePanel";
import type { VehicleCommand, VehicleState } from "@/lib/types";
import type { VehicleSchedule } from "@/lib/vehicle/repository";

interface ClimatePanelProps {
  vehicle: VehicleState;
  busy: boolean;
  remoteReady?: boolean;
  schedules: VehicleSchedule[];
  onCommand: (command: VehicleCommand) => void;
  onSchedulesChanged: () => void;
}

function formatTemp(tempC: number): string {
  if (!Number.isFinite(tempC)) return "—";
  return `${Math.round(tempC)}°`;
}

export function ClimatePanel({
  vehicle,
  busy,
  remoteReady = false,
  schedules,
  onCommand,
  onSchedulesChanged,
}: ClimatePanelProps) {
  const live = vehicle.mode === "live";
  const active = vehicle.climateStatus !== "off";
  const climateRemoteOk = !live || remoteReady;
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const statusHint = active
    ? vehicle.climateStatus === "heating"
      ? "Vorklima · heizt"
      : vehicle.climateStatus === "cooling"
        ? "Vorklima · kühlt"
        : "Vorklima aktiv"
    : "Fernstart für Vorklima";

  const importFromVehicle = async () => {
    setImportBusy(true);
    setImportMsg(null);
    try {
      const res = await fetch("/api/vehicle/schedules/import-climate", {
        method: "POST",
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Import fehlgeschlagen");
      setImportMsg(data.message ?? "Übernommen.");
      onSchedulesChanged();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Fehler");
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <section className="animate-rise space-y-6 pt-2">
      <SectionHeader title="Klima" hint={statusHint} />

      {active ? (
        <div className="ui-surface px-4 py-4 text-center">
          <p className="text-sm font-semibold text-[var(--accent-bright)]">
            Vorklima läuft
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

      <SchedulePanel
        schedules={schedules}
        onChanged={onSchedulesChanged}
        kinds={["climate"]}
        compact
        title="Vorklima-Pläne"
        hint={
          live
            ? "Pläne kommen vom Fahrzeug (MyPeugeot). Sync übernimmt sie automatisch — hier manuell nachladen."
            : "Demo: Pläne nur in der App."
        }
        onImportFromVehicle={live ? importFromVehicle : undefined}
        importBusy={importBusy}
      />

      {importMsg ? (
        <p className="text-center text-xs text-[var(--fg-muted)]">{importMsg}</p>
      ) : null}
    </section>
  );
}
