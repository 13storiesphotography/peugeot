"use client";

import { useState } from "react";
import Link from "next/link";
import { ClimateProgressBanner } from "@/components/ClimateProgressBanner";
import { SchedulePanel } from "@/components/SchedulePanel";
import { SectionHeader } from "@/components/SectionHeader";
import type { VehicleCommand, VehicleState } from "@/lib/types";
import type { VehicleSchedule } from "@/lib/vehicle/repository";

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
  schedules?: VehicleSchedule[];
  onCommand: (command: VehicleCommand) => void;
  onSchedulesChanged?: () => void;
  isPro?: boolean;
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
  schedules = [],
  onCommand,
  onSchedulesChanged,
  isPro = false,
}: ClimatePanelProps) {
  const live = vehicle.mode === "live";
  const active = vehicle.climateStatus !== "off";
  const climateRemoteOk = !live || remoteReady;
  const pending = Boolean(climateJob);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const statusHint = pending
    ? climateJob!.phaseLabel
    : active
      ? vehicle.climateStatus === "heating"
        ? "Vorklima · heizt"
        : vehicle.climateStatus === "cooling"
          ? "Vorklima · kühlt"
          : "Vorklima aktiv"
      : "Fernstart und Pläne für Vorklima";

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
      onSchedulesChanged?.();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Fehler");
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <section className="animate-rise space-y-6 pt-2 lg:mx-auto lg:max-w-md lg:pt-0">
      <SectionHeader title="Klima" hint={statusHint} hideTitleOnDesktop />

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

      {isPro ? (
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
      ) : (
        <div className="ui-surface space-y-3 px-4 py-4 text-center">
          <p className="text-sm text-[var(--fg-muted)]">
            Vorklima starten und planen ist in{" "}
            <span className="font-semibold text-[var(--fg)]">Pro</span>{" "}
            enthalten.
          </p>
          <a
            href="/control/settings#pro"
            className="action-btn btn-primary inline-flex rounded-full px-5 py-3 text-sm font-semibold"
          >
            Pro ansehen
          </a>
        </div>
      )}

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

      {onSchedulesChanged ? (
        <>
          <SchedulePanel
            schedules={schedules}
            onChanged={onSchedulesChanged}
            kinds={["climate"]}
            compact
            title="Vorklima planen"
            hint={
              isPro
                ? live
                  ? "Wie in MyPeugeot — Speichern geht ans Fahrzeug."
                  : "Demo: Pläne nur in der App."
                : "Mit Pro Zeitpläne anlegen und ans Auto senden."
            }
            editable={isPro}
            onImportFromVehicle={
              isPro && live ? importFromVehicle : undefined
            }
            importBusy={importBusy}
          />
          {importMsg ? (
            <p className="text-center text-xs text-[var(--fg-muted)]">
              {importMsg}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
