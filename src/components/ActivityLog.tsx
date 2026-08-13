"use client";

import type { ActivityItem } from "@/lib/vehicle/repository";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ActivityLog({ items }: { items: ActivityItem[] }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fg-muted)]">
        Aktivität
      </h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--fg-muted)]">
          Noch keine Aktivität.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{item.message}</p>
              </div>
              <div className="text-right text-xs text-[var(--fg-muted)]">
                <p
                  className={
                    item.ok ? "text-[var(--accent-bright)]" : "text-[var(--danger)]"
                  }
                >
                  {item.ok ? "OK" : "Fehler"}
                </p>
                <p className="mt-1 tabular-nums">{formatWhen(item.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
