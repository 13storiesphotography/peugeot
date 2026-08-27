"use client";

import { useEffect, useState } from "react";
import type { TrafficStats } from "@/lib/traffic/stats";

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fg-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--fg-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function StatsDashboard({ initial }: { initial: TrafficStats }) {
  const [stats, setStats] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setError("Aktualisierung fehlgeschlagen");
          return;
        }
        const data = (await res.json()) as TrafficStats;
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Offline — letzte Zahlen bleiben sichtbar");
      }
    };

    const id = window.setInterval(() => void tick(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--accent-bright)]">
            Live
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
            Traffic & Interesse
          </h2>
        </div>
        <p className="text-right text-[11px] text-[var(--fg-muted)]">
          Stand {formatWhen(stats.generatedAt)}
          <br />
          alle 30 Sek. neu
        </p>
      </div>

      {error ? (
        <p className="text-xs text-[var(--warn)]" role="status">
          {error}
        </p>
      ) : null}

      <section aria-label="Seitenaufrufe">
        <h3 className="mb-2 text-sm font-semibold text-[var(--fg-muted)]">
          Website
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Heute"
            value={stats.today.views}
            hint={`${stats.today.visitors} Besucher`}
          />
          <StatCard
            label="7 Tage"
            value={stats.days7.views}
            hint={`${stats.days7.visitors} Besucher`}
          />
          <StatCard
            label="30 Tage"
            value={stats.days30.views}
            hint={`${stats.days30.visitors} Besucher`}
          />
          <StatCard
            label="Neue User 7d"
            value={stats.users.last7Days}
            hint={`${stats.users.total} gesamt`}
          />
        </div>
      </section>

      <section aria-label="Produkt">
        <h3 className="mb-2 text-sm font-semibold text-[var(--fg-muted)]">
          Produkt
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Accounts" value={stats.users.total} />
          <StatCard label="MyPeugeot verbunden" value={stats.users.connected} />
          <StatCard label="Pro aktiv" value={stats.users.pro} />
        </div>
      </section>

      <section aria-label="Beliebte Seiten">
        <h3 className="mb-2 text-sm font-semibold text-[var(--fg-muted)]">
          Top-Seiten (7 Tage)
        </h3>
        {stats.topPaths.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">
            Noch keine Aufrufe erfasst — nach dem Deploy zählen Besuche ab jetzt.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)]">
            {stats.topPaths.map((row) => (
              <li
                key={row.path}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate font-medium">{row.path}</span>
                <span className="shrink-0 tabular-nums text-[var(--fg-muted)]">
                  {row.views}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Neue Anmeldungen">
        <h3 className="mb-2 text-sm font-semibold text-[var(--fg-muted)]">
          Letzte Anmeldungen
        </h3>
        {stats.recentSignups.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">Keine Signups bisher.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)]">
            {stats.recentSignups.map((row) => (
              <li
                key={`${row.email}-${row.createdAt}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate">
                  {row.email ?? "ohne E-Mail"}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--fg-muted)]">
                  {formatWhen(row.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
