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
    <section className="panel animate-rise-delay-3 rounded-[1.5rem] p-5 sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
        Aktivität
      </h2>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">
        Letzte Befehle an deinen E-3008.
      </p>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-[var(--fg-muted)]">
          Noch keine Aktionen — starte Laden oder Klima.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{item.message}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--fg-muted)]">
                  {item.command}
                </p>
              </div>
              <div className="text-right text-xs text-[var(--fg-muted)]">
                <p className={item.ok ? "text-[var(--accent-bright)]" : "text-[var(--danger)]"}>
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
