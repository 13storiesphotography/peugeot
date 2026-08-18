"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { Translator } from "@/i18n/translate";
import type { VehicleLocation } from "@/lib/types";
import { navigationUrl } from "@/lib/geo/reverse-geocode";

type Props = {
  location: VehicleLocation;
  className?: string;
};

function formatLocationAge(iso: string, nowMs: number, t: Translator): string {
  const mins = Math.max(
    0,
    Math.round((nowMs - new Date(iso).getTime()) / 60_000),
  );
  if (mins < 1) return t("location.justNow");
  if (mins === 1) return t("location.minAgo1");
  if (mins < 60) return t("location.minAgo", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return hours === 1
      ? t("location.hourAgo1")
      : t("location.hourAgo", { n: hours });
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? t("location.dayAgo1") : t("location.dayAgo", { n: days });
}

export function LocationLink({ location, className }: Props) {
  const { t } = useI18n();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const canNavigate =
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
  const href = canNavigate
    ? navigationUrl(location.latitude, location.longitude)
    : null;
  const ageLabel = location.updatedAt
    ? formatLocationAge(location.updatedAt, nowMs, t)
    : null;
  const ageMinutes = location.updatedAt
    ? Math.max(
        0,
        Math.round((nowMs - new Date(location.updatedAt).getTime()) / 60_000),
      )
    : 0;
  const staleWhileDrivingHint = ageMinutes >= 5;

  const body = (
    <>
      <div className="min-w-0">
        <p className="eyebrow">{t("location.title")}</p>
        <p className="mt-1 text-sm font-medium leading-snug">{location.address}</p>
        {ageLabel ? (
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            {t("location.position", { age: ageLabel })}
            {staleWhileDrivingHint ? t("location.delayed") : ""}
          </p>
        ) : null}
      </div>
      {href ? (
        <span className="shrink-0 text-[var(--fg-muted)]" aria-hidden>
          ›
        </span>
      ) : null}
    </>
  );

  if (!href) {
    return <div className={className ?? "ui-link-row items-start"}>{body}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "ui-link-row items-start transition hover:text-[var(--accent-bright)]"
      }
      aria-label={t("location.navigateAria", { address: location.address })}
    >
      {body}
    </a>
  );
}
