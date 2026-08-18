"use client";

import { ChargeCurve } from "@/components/ChargeCurve";
import { SectionHeader } from "@/components/SectionHeader";
import { useI18n } from "@/components/i18n/I18nProvider";
import { intlLocale } from "@/i18n/format";
import type { VehicleCommand, VehicleState } from "@/lib/types";
import type { ChargeSample } from "@/lib/vehicle/repository";
import {
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
  onCommand: (
    command: VehicleCommand,
    opts?: { chargeLimitPercent?: number },
  ) => void;
}

function formatEta(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ChargePanel({
  vehicle,
  busy,
  chargeCurve = [],
  isPro = false,
  onCommand,
}: ChargePanelProps) {
  const { locale, t } = useI18n();
  const dates = intlLocale(locale);
  const charging = vehicle.chargeStatus === "charging";
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

  const statusLabel: Record<VehicleState["chargeStatus"], string> = {
    idle: t("charge.idle"),
    plugged: t("charge.plugged"),
    charging: t("charge.charging"),
    complete: t("charge.complete"),
    error: t("charge.error"),
  };

  const statusLine = charging
    ? [
        chargeSpeedLabel(speed, t),
        vehicle.chargePowerKw != null
          ? `${vehicle.chargePowerKw.toLocaleString(dates, { maximumFractionDigits: 1 })} kW`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : statusLabel[vehicle.chargeStatus];

  return (
    <section className="animate-rise space-y-6 pt-2">
      <SectionHeader title={t("charge.title")} hint={statusLine} />

      <div className="flex flex-col items-center py-2">
        <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tabular-nums leading-none">
          {Math.round(vehicle.batteryPercent)}
          <span className="text-2xl text-[var(--accent-bright)]">%</span>
        </p>
        <div
          className="mt-5 h-1.5 w-40 overflow-hidden rounded-full"
          style={{ background: "rgba(143,168,181,0.15)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, vehicle.batteryPercent)}%`,
              background: charging
                ? speed === "quick"
                  ? "linear-gradient(90deg, #d4924a, #e8b86d)"
                  : "linear-gradient(90deg, #3da8a0, #5fe3c0)"
                : "#3da8a0",
            }}
          />
        </div>
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          {t("charge.rangeTarget", {
            range: vehicle.rangeKm,
            n: Math.round(targetPercent),
          })}
        </p>
      </div>

      <div
        className={`ui-surface flex items-center justify-between gap-4 px-4 py-4 ${eightyOn ? "ui-surface-active" : ""}`}
      >
        <div className="min-w-0">
          <p className="font-semibold">
            {t("charge.limit80")}{" "}
            {isPro ? null : (
              <span className="ml-1 rounded-full bg-[var(--accent-bright)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-bright)]">
                Pro
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            {!isPro
              ? t("charge.viewFreePro")
              : live
                ? eightyOn
                  ? vehicleReportsFull
                    ? t("charge.appLimits80")
                    : t("charge.activeStops80")
                  : t("charge.offTo100")
                : t("charge.dailyCare")}
          </p>
        </div>
        {isPro ? (
          <button
            type="button"
            role="switch"
            aria-checked={eightyOn}
            disabled={busy}
            title={live ? t("charge.toggleLimit") : undefined}
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
            {t("charge.withPro")}
          </a>
        )}
      </div>

      {charging ? (
        <div className="ui-surface px-4 py-4 text-center">
          <p className="text-sm font-semibold text-[var(--accent-bright)]">
            {t("charge.sessionActive")}
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            {t("charge.readyAt", {
              time: formatEta(vehicle.estimatedFullAt, dates),
            })}
            {vehicle.chargePowerKw != null
              ? ` · ${vehicle.chargePowerKw.toLocaleString(dates, { maximumFractionDigits: 1 })} kW`
              : ""}
            {vehicle.chargeRateKmh != null && vehicle.chargeRateKmh > 0
              ? ` · +${Math.round(vehicle.chargeRateKmh)} km/h`
              : ""}
          </p>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="ui-surface px-4 py-4">
            <dt className="text-xs text-[var(--fg-muted)]">{t("charge.eta")}</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {formatEta(vehicle.estimatedFullAt, dates)}
            </dd>
          </div>
          <div className="ui-surface px-4 py-4">
            <dt className="text-xs text-[var(--fg-muted)]">{t("charge.range")}</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {vehicle.rangeKm} km
            </dd>
          </div>
        </dl>
      )}

      <ChargeCurve samples={chargeCurve} live={live} />
    </section>
  );
}
