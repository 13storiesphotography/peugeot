"use client";

import { RemotePinForm } from "@/components/RemotePinForm";
import { SectionHeader } from "@/components/SectionHeader";
import type { VehicleCommand, VehicleState } from "@/lib/types";

interface ClimatePanelProps {
  vehicle: VehicleState;
  busy: boolean;
  remoteReady?: boolean;
  onCommand: (
    command: VehicleCommand,
    opts?: { targetTempC?: number },
  ) => void;
  onOpenSchedule?: () => void;
  /** Refresh vehicle bundle after one-time remote PIN setup. */
  onRemoteReady?: () => void;
}

export function ClimatePanel({
  vehicle,
  busy,
  remoteReady = false,
  onCommand,
  onOpenSchedule,
  onRemoteReady,
}: ClimatePanelProps) {
  const live = vehicle.mode === "live";
  const active = vehicle.climateStatus !== "off";
  const target = vehicle.targetTempC;
  const climateRemoteOk = !live || remoteReady;

  const nudge = (delta: number) => {
    onCommand("set_climate_temp", { targetTempC: target + delta });
  };

  const statusHint = active
    ? vehicle.climateStatus === "heating"
      ? "heizt"
      : vehicle.climateStatus === "cooling"
        ? "kühlt"
        : "aktiv"
    : "aus";

  return (
    <section className="animate-rise space-y-6">
      <SectionHeader
        title="Klima"
        hint={`Kabine ${vehicle.cabinTempC}° · ${statusHint}`}
      />

      {live && !remoteReady ? (
        <RemotePinForm
          ready={false}
          compact
          onReady={() => onRemoteReady?.()}
        />
      ) : null}

      <div className="flex flex-col items-center py-4">
        <div className="flex items-center gap-6">
          <button
            type="button"
            disabled={busy || target <= 16}
            onClick={() => nudge(-1)}
            className="action-btn grid h-14 w-14 place-items-center rounded-full border border-[var(--line)] text-2xl font-semibold"
            aria-label="Kälter"
          >
            −
          </button>
          <p className="font-[family-name:var(--font-display)] text-6xl font-semibold tabular-nums leading-none">
            {target}
            <span className="text-3xl text-[var(--accent-bright)]">°</span>
          </p>
          <button
            type="button"
            disabled={busy || target >= 28}
            onClick={() => nudge(1)}
            className="action-btn grid h-14 w-14 place-items-center rounded-full border border-[var(--line)] text-2xl font-semibold"
            aria-label="Wärmer"
          >
            +
          </button>
        </div>
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
          Oben einmal freischalten — danach startet Klima mit einem Tippen.
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
