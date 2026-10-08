"use client";

import { useState } from "react";
import type { ActivityItem } from "@/lib/vehicle/repository";

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Compact de-DE stamp: heute/gestern or day.month — always with time. */
function formatWhen(iso: string, now = new Date()): string {
  const at = new Date(iso);
  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);

  const dayDiff = Math.round(
    (startOfLocalDay(now) - startOfLocalDay(at)) / 86_400_000,
  );
  if (dayDiff === 0) return `heute ${time}`;
  if (dayDiff === 1) return `gestern ${time}`;

  const date = new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "numeric",
    ...(at.getFullYear() !== now.getFullYear()
      ? { year: "numeric" as const }
      : {}),
  }).format(at);

  return `${date}, ${time}`;
}

export function ActivityLog({ items }: { items: ActivityItem[] }) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  const latest = items[0];
  const summary = latest
    ? latest.message.length > 42
      ? `${latest.message.slice(0, 40)}…`
      : latest.message
    : "";

  return (
    <section>
      <button
        type="button"
        className="flex w-full items-baseline justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <p className="eyebrow">Zuletzt</p>
        <span className="shrink-0 text-[11px] text-[var(--fg-muted)]">
          {open ? "Einklappen" : "Anzeigen"}
        </span>
      </button>
      {!open && summary ? (
        <p className="mt-1.5 truncate text-sm text-[var(--fg-muted)]">
          {summary}
        </p>
      ) : null}
      {open ? (
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
                title={new Date(item.createdAt).toLocaleString("de-DE")}
              >
                {formatWhen(item.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
