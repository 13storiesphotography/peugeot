"use client";

import Link from "next/link";
import { ClimateProgressBanner } from "@/components/ClimateProgressBanner";
import { SectionHeader } from "@/components/SectionHeader";
import { useI18n } from "@/components/i18n/I18nProvider";
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
  onCommand,
  isPro = false,
}: ClimatePanelProps) {
  const { t } = useI18n();
  const live = vehicle.mode === "live";
  const active = vehicle.climateStatus !== "off";
  const climateRemoteOk = !live || remoteReady;
  const pending = Boolean(climateJob);

  const statusHint = pending
    ? climateJob!.phaseLabel
    : active
      ? vehicle.climateStatus === "heating"
        ? t("climate.heating")
        : vehicle.climateStatus === "cooling"
          ? t("climate.cooling")
          : t("climate.active")
      : t("climate.remoteStart");

  const setupParts = t("climate.setupRemote").split("{settings}");

  return (
    <section className="animate-rise space-y-6 pt-2">
      <SectionHeader title={t("climate.title")} hint={statusHint} />

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
            {t("climate.running")}
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
          ? t("climate.wait")
          : active
            ? t("climate.stopClimate")
            : t("climate.start")}
      </button>
      ) : (
        <a
          href="/control/settings#pro"
          className="action-btn btn-primary block w-full rounded-full px-5 py-4 text-center text-sm font-semibold"
        >
          {t("climate.controlWithPro")}
        </a>
      )}

      {!climateRemoteOk ? (
        <p className="text-center text-xs text-[var(--fg-muted)]">
          {setupParts[0]}
          <Link
            href="/control/settings"
            className="text-[var(--accent-bright)] underline-offset-2 hover:underline"
          >
            {t("climate.settings")}
          </Link>
          {setupParts[1] ?? ""}
        </p>
      ) : (
        <p className="text-center text-xs text-[var(--fg-muted)]">
          {pending
            ? t("climate.dontTap")
            : live
              ? t("climate.outdoor", { temp: formatTemp(vehicle.outdoorTempC) })
              : t("climate.outdoorDemo", {
                  temp: formatTemp(vehicle.outdoorTempC),
                })}
        </p>
      )}
    </section>
  );
}
