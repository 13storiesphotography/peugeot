"use client";

import type { ActivityItem } from "@/lib/vehicle/repository";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ActivityLog({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <p className="eyebrow">Zuletzt</p>
      <ul className="mt-3 space-y-2">
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
