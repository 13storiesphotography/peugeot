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
      : climateRemoteOk
        ? `Außen ${formatTemp(vehicle.outdoorTempC)}${live ? "" : " · Demo"}`
        : "Fernbedienung einrichten";

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
    <section className="animate-rise space-y-6 pt-2 lg:pt-0">
      <SectionHeader title="Klima" hint={statusHint} hideTitleOnDesktop />

      {!isPro ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--fg-muted)]">
          Vorklima starten und planen ist in{" "}
          <span className="font-semibold text-[var(--fg)]">Pro</span>.{" "}
          <a
            href="/control/settings#pro"
            className="font-semibold text-[var(--accent-bright)] underline-offset-2 hover:underline"
          >
            Pro ansehen
          </a>
        </div>
      ) : null}

      {!climateRemoteOk && isPro ? (
        <p className="text-sm text-[var(--fg-muted)]">
          Einmal unter{" "}
          <Link
            href="/control/settings"
            className="font-semibold text-[var(--accent-bright)] underline-offset-2 hover:underline"
          >
            Einstellungen
          </Link>{" "}
          die Fernbedienung einrichten.
        </p>
      ) : null}

      {climateJob ? (
        <ClimateProgressBanner
          action={climateJob.action}
          progress={climateJob.progress}
          phaseLabel={climateJob.phaseLabel}
          detail={climateJob.detail}
        />
      ) : null}

      {isPro ? (
        <button
          type="button"
          disabled={busy || pending || !climateRemoteOk}
          onClick={() => onCommand(active ? "climate_stop" : "climate_start")}
          className={`action-btn w-full rounded-2xl px-5 py-4 text-sm font-semibold ${
            active ? "btn-danger-soft" : "btn-primary"
          }`}
        >
          {pending
            ? "Bitte warten…"
            : active
              ? "Vorklima stoppen"
              : "Vorklima starten"}
        </button>
      ) : null}

      {pending ? (
        <p className="text-sm text-[var(--fg-muted)]">
          Nicht erneut tippen — das Auto bestätigt oft erst nach 30–60 Sekunden.
        </p>
      ) : null}

      {onSchedulesChanged ? (
        <div className="space-y-3">
          <SchedulePanel
            schedules={schedules}
            onChanged={onSchedulesChanged}
            kinds={["climate"]}
            title="Vorklima-Pläne"
            hint={
              isPro
                ? live
                  ? "Änderungen gehen ans Fahrzeug."
                  : "Demo: nur in der App."
                : "Mit Pro Zeitpläne anlegen."
            }
            editable={isPro}
            onImportFromVehicle={
              isPro && live ? importFromVehicle : undefined
            }
            importBusy={importBusy}
          />
          {importMsg ? (
            <p className="text-sm text-[var(--fg-muted)]">{importMsg}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
