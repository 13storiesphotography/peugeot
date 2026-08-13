"use client";

import type { ReactNode } from "react";

export type ControlTab =
  | "home"
  | "climate"
  | "charge"
  | "controls"
  | "schedule";

const TABS: {
  id: ControlTab;
  label: string;
  icon: (active: boolean) => ReactNode;
}[] = [
  {
    id: "home",
    label: "Home",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.18 : 0}
        />
      </svg>
    ),
  },
  {
    id: "climate",
    label: "Klima",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3v18M5.5 6.5l13 11M18.5 6.5l-13 11"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "charge",
    label: "Laden",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.2 : 0}
        />
      </svg>
    ),
  },
  {
    id: "controls",
    label: "Steuern",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="3"
          stroke="currentColor"
          strokeWidth="1.7"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.2 : 0}
        />
        <path
          d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "schedule",
    label: "Planen",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x="3.5"
          y="5"
          width="17"
          height="15"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.7"
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.15 : 0}
        />
        <path
          d="M8 3v4M16 3v4M3.5 10h17"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function ControlBottomNav({
  tab,
  onChange,
}: {
  tab: ControlTab;
  onChange: (tab: ControlTab) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)]"
      style={{
        background: "rgba(7, 16, 24, 0.88)",
        backdropFilter: "blur(18px)",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
      }}
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition"
              style={{
                color: active ? "var(--accent-bright)" : "var(--fg-muted)",
              }}
              aria-current={active ? "page" : undefined}
            >
              {item.icon(active)}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
