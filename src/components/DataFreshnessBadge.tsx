"use client";

type FreshnessTone = "live" | "ok" | "stale" | "demo" | "offline";

export type DataFreshness = {
  tone: FreshnessTone;
  label: string;
  detail?: string;
  ageMinutes: number;
};

/** Classify how fresh vehicle telemetry is for UI badges. */
export function classifyDataFreshness(
  lastUpdatedAt: string,
  opts: {
    nowMs?: number;
    mode?: "demo" | "live";
    offline?: boolean;
    refreshing?: boolean;
  } = {},
): DataFreshness {
  const nowMs = opts.nowMs ?? Date.now();
  const ageMinutes = Math.max(
    0,
    Math.round((nowMs - new Date(lastUpdatedAt).getTime()) / 60_000),
  );

  if (opts.offline) {
    return {
      tone: "offline",
      label: "Offline",
      detail: `Letzter Stand ${formatAgeShort(ageMinutes)}`,
      ageMinutes,
    };
  }
  if (opts.mode === "demo") {
    return {
      tone: "demo",
      label: "Demo",
      detail: "Beispieldaten",
      ageMinutes,
    };
  }
  if (opts.refreshing) {
    return {
      tone: ageMinutes < 2 ? "live" : "ok",
      label: "Aktualisiere…",
      detail: `Bisher ${formatAgeShort(ageMinutes)}`,
      ageMinutes,
    };
  }
  if (ageMinutes < 2) {
    return {
      tone: "live",
      label: "Nahezu live",
      detail: ageMinutes < 1 ? "gerade eben" : "vor 1 Min.",
      ageMinutes,
    };
  }
  if (ageMinutes < 10) {
    return {
      tone: "ok",
      label: `Stand ${formatAgeShort(ageMinutes)}`,
      detail: "Aktuell genug für die Anzeige",
      ageMinutes,
    };
  }
  return {
    tone: "stale",
    label: `Veraltet · ${formatAgeShort(ageMinutes)}`,
    detail: "Fahrzeug evtl. im Ruhemodus — oben aktualisieren",
    ageMinutes,
  };
}

function formatAgeShort(mins: number): string {
  if (mins < 1) return "gerade eben";
  if (mins === 1) return "vor 1 Min.";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  return hours === 1 ? "vor 1 Std." : `vor ${hours} Std.`;
}

const TONE_STYLES: Record<
  FreshnessTone,
  { dot: string; text: string; border: string; bg: string }
> = {
  live: {
    dot: "var(--accent-bright)",
    text: "var(--accent-bright)",
    border: "rgba(95,227,192,0.35)",
    bg: "rgba(95,227,192,0.1)",
  },
  ok: {
    dot: "rgba(143,168,181,0.85)",
    text: "var(--fg-muted)",
    border: "var(--line)",
    bg: "rgba(255,255,255,0.03)",
  },
  stale: {
    dot: "var(--warn)",
    text: "var(--warn)",
    border: "rgba(232,184,109,0.35)",
    bg: "rgba(232,184,109,0.1)",
  },
  demo: {
    dot: "rgba(143,168,181,0.7)",
    text: "var(--fg-muted)",
    border: "var(--line)",
    bg: "rgba(255,255,255,0.03)",
  },
  offline: {
    dot: "var(--danger)",
    text: "var(--danger)",
    border: "rgba(224,122,106,0.35)",
    bg: "rgba(224,122,106,0.08)",
  },
};

/** Compact freshness label — pill badge or quiet plain text. */
export function DataFreshnessBadge({
  lastUpdatedAt,
  nowMs,
  mode,
  offline,
  refreshing,
  className = "",
  showDetail = false,
  /** `badge` = colored pill (Laden when plugged). `plain` = muted text only. */
  variant = "badge",
}: {
  lastUpdatedAt: string;
  nowMs?: number;
  mode?: "demo" | "live";
  offline?: boolean;
  refreshing?: boolean;
  className?: string;
  showDetail?: boolean;
  variant?: "badge" | "plain";
}) {
  const freshness = classifyDataFreshness(lastUpdatedAt, {
    nowMs,
    mode,
    offline,
    refreshing,
  });
  const style = TONE_STYLES[freshness.tone];
  const pulse = freshness.tone === "live" || Boolean(refreshing);

  if (variant === "plain") {
    // Quiet header copy — no "Veraltet"/pill chrome; age only.
    const plainLabel = refreshing
      ? "Aktualisiere…"
      : freshness.tone === "demo"
        ? "Demo"
        : freshness.tone === "offline"
          ? "Offline"
          : `Stand ${formatAgeShort(freshness.ageMinutes)}`;
    return (
      <div className={`min-w-0 ${className}`} title={freshness.detail} role="status">
        <p className="truncate text-[11px] text-[var(--fg-muted)]">{plainLabel}</p>
        {showDetail && freshness.detail && !refreshing ? (
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)] opacity-80">
            {freshness.detail}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <div
        className="inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1"
        style={{ borderColor: style.border, background: style.bg }}
        title={freshness.detail}
        role="status"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${pulse ? "animate-pulse" : ""}`}
          style={{
            background: style.dot,
            boxShadow: pulse ? `0 0 8px ${style.dot}` : undefined,
          }}
          aria-hidden
        />
        <span
          className="truncate text-[11px] font-semibold tracking-wide"
          style={{ color: style.text }}
        >
          {freshness.label}
        </span>
      </div>
      {showDetail && freshness.detail ? (
        <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
          {freshness.detail}
        </p>
      ) : null}
    </div>
  );
}
