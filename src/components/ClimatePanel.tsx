"use client";

import Link from "next/link";
import { ClimateProgressBanner } from "@/components/ClimateProgressBanner";
import { SectionHeader } from "@/components/SectionHeader";
import type { VehicleCommand, VehicleState } from "@/lib/types";

interface ClimatePanelProps {
  vehicle: VehicleState;
  busy: boolean;
  remoteReady?: boolean;
  climateJob?: {
    action: "start" | "stop";
    progress: number;
    phaseLabel: string;
    detail?: string;
  } | null;
  onCommand: (command: VehicleCommand) => void;
}

function formatTemp(tempC: number): string {
  if (!Number.isFinite(tempC)) return "—";
  return `${Math.round(tempC)}°`;
}

export function ClimatePanel({
  vehicle,
  busy,
  remoteReady = false,
  climateJob = null,
  onCommand,
}: ClimatePanelProps) {
  const live = vehicle.mode === "live";
  const active = vehicle.climateStatus !== "off";
  const climateRemoteOk = !live || remoteReady;
  const pending = Boolean(climateJob);

  const statusHint = pending
    ? climateJob!.phaseLabel
    : active
      ? vehicle.climateStatus === "heating"
        ? "Vorklima · heizt"
        : vehicle.climateStatus === "cooling"
          ? "Vorklima · kühlt"
          : "Vorklima aktiv"
      : "Fernstart für Vorklima";

  return (
    <section className="animate-rise space-y-6 pt-2">
      <SectionHeader title="Klima" hint={statusHint} />

      {climateJob ? (
        <ClimateProgressBanner
          action={climateJob.action}
          progress={climateJob.progress}
          phaseLabel={climateJob.phaseLabel}
          detail={climateJob.detail}
        />
      ) : active ? (
        <div className="ui-surface px-4 py-4 text-center">
          <p className="text-sm font-semibold text-[var(--accent-bright)]">
            Vorklima läuft
          </p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy || pending || !climateRemoteOk}
        onClick={() => onCommand(active ? "climate_stop" : "climate_start")}
        className={`action-btn w-full rounded-full px-5 py-4 text-sm font-semibold ${
          active ? "btn-danger-soft" : "btn-primary"
        }`}
        style={{ opacity: climateRemoteOk ? 1 : 0.55 }}
      >
        {pending
          ? "Bitte warten…"
          : active
            ? "Vorklima stoppen"
            : "Vorklima starten"}
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
      ) : (
        <p className="text-center text-xs text-[var(--fg-muted)]">
          {pending
            ? "Nicht erneut tippen — das Auto bestätigt oft erst nach 30–60 Sekunden."
            : `Außen ${formatTemp(vehicle.outdoorTempC)}${live ? "" : " · Demo"}`}
        </p>
      )}
    </section>
  );
}
