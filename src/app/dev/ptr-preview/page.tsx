"use client";

import { useCallback, useState } from "react";
import { PullToRefresh } from "@/components/PullToRefresh";

/** Local QA harness for Safari-like pull-to-refresh (no auth). */
export default function PtrPreviewPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [count, setCount] = useState(0);
  const [log, setLog] = useState("Zieh von ganz oben — Totzone, dann wachsender Pfeil.");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLog("Refresh ausgelöst…");
    await new Promise((r) => window.setTimeout(r, 1200));
    setCount((n) => n + 1);
    setLog(`Fertig (#${count + 1})`);
    setRefreshing(false);
  }, [count]);

  return (
    <main className="min-h-[180vh] bg-[var(--bg)] text-[var(--fg)]">
      <PullToRefresh onRefresh={onRefresh} refreshing={refreshing}>
        <div className="mx-auto max-w-lg px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--accent-bright)]">
            PTR Preview
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
            Pull-to-Refresh
          </h1>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">{log}</p>
          <p className="mt-6 text-sm text-[var(--fg-muted)]">
            Kurz ziehen = nichts. Weiter ziehen = Pfeil wächst. Loslassen unter
            der Schwelle = kein Refresh. Erst darüber = Aktualisierung.
          </p>
          <div className="mt-8 space-y-3">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--line)] bg-[var(--bg-deep)]/60 px-4 py-5 text-sm text-[var(--fg-muted)]"
              >
                Scroll-Inhalt {i + 1}
              </div>
            ))}
          </div>
        </div>
      </PullToRefresh>
    </main>
  );
}
