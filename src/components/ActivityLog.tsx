"use client";

import type { ActivityItem } from "@/lib/vehicle/repository";
import { useI18n } from "@/components/i18n/I18nProvider";
import { intlLocale } from "@/i18n/format";

export function ActivityLog({ items }: { items: ActivityItem[] }) {
  const { locale, t } = useI18n();
  if (items.length === 0) return null;

  const formatWhen = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale(locale), {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <section>
      <p className="eyebrow">{t("dash.recent")}</p>
      <ul className="mt-2.5 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <p className="min-w-0 truncate text-[var(--fg)]">{item.message}</p>
            <p
              className={`shrink-0 tabular-nums text-xs ${
                item.ok ? "text-[var(--fg-muted)]" : "text-[var(--danger)]"
              }`}
            >
              {formatWhen(item.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
