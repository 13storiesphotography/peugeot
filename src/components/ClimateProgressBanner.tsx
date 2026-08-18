"use client";

import { useI18n } from "@/components/i18n/I18nProvider";

type Props = {
  action: "start" | "stop";
  /** 0–1 progress toward expected confirmation window. */
  progress: number;
  phaseLabel: string;
  detail?: string;
};

export function ClimateProgressBanner({
  action,
  progress,
  phaseLabel,
  detail,
}: Props) {
  const { t } = useI18n();
  const pct = Math.max(4, Math.min(100, Math.round(progress * 100)));

  return (
    <div
      className="ui-surface overflow-hidden px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--accent-bright)]">
            {action === "start" ? t("climate.starting") : t("climate.stopping")}
          </p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">{phaseLabel}</p>
          {detail ? (
            <p className="mt-1 text-[11px] leading-snug text-[var(--fg-muted)]">
              {detail}
            </p>
          ) : null}
        </div>
        <span
          className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent-bright)]"
          style={{
            animation: "climate-pulse 1.2s ease-in-out infinite",
          }}
          aria-hidden
        />
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full"
        style={{ background: "rgba(95,227,192,0.15)" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #3da8a0, #5fe3c0)",
          }}
        />
      </div>
    </div>
  );
}
