"use client";

import type { ReactNode } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import type { VehicleCommand, VehicleState } from "@/lib/types";

interface ControlsPanelProps {
  vehicle: VehicleState;
  busy: boolean;
  onCommand: (command: VehicleCommand) => void;
}

type ControlTile = {
  id: string;
  label: string;
  onClick: () => void;
  icon: ReactNode;
};

/** Vehicle controls only — Klima/Laden live in their own tabs. */
export function ControlsPanel({
  vehicle,
  busy,
  onCommand,
}: ControlsPanelProps) {
  const locked = vehicle.locked;

  const actions: ControlTile[] = [
    {
      id: "flash",
      label: "Lichter",
      onClick: () => onCommand("flash"),
      icon: <IconFlash />,
    },
    {
      id: "horn",
      label: "Hupe",
      onClick: () => onCommand("horn"),
      icon: <IconHorn />,
    },
    {
      id: "wakeup",
      label: "Wecken",
      onClick: () => onCommand("wakeup"),
      icon: <IconWake />,
    },
  ];

  return (
    <section className="animate-rise space-y-6">
      <SectionHeader title="Steuern" hint="Schloss und Signale" />

      <button
        type="button"
        disabled={busy}
        onClick={() => onCommand(locked ? "unlock" : "lock")}
        className="action-btn ui-surface flex w-full flex-col items-center gap-3 px-5 py-7"
        style={{
          borderColor: locked
            ? "rgba(95,227,192,0.45)"
            : "rgba(232,184,109,0.4)",
          background: locked
            ? "rgba(95,227,192,0.1)"
            : "rgba(232,184,109,0.1)",
        }}
      >
        <span
          className="grid h-14 w-14 place-items-center rounded-full"
          style={{
            background: locked
              ? "rgba(95,227,192,0.18)"
              : "rgba(232,184,109,0.18)",
            color: locked ? "var(--accent-bright)" : "var(--warn)",
          }}
        >
          <IconLock locked={locked} large />
        </span>
        <span className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {locked ? "Entriegeln" : "Verriegeln"}
        </span>
        <span className="text-xs text-[var(--fg-muted)]">
          {locked ? "Verriegelt" : "Entriegelt"}
        </span>
      </button>

      <div className="grid grid-cols-3 gap-3">
        {actions.map((tile) => (
          <button
            key={tile.id}
            type="button"
            disabled={busy}
            onClick={tile.onClick}
            className="action-btn ui-surface flex flex-col items-center gap-2.5 px-2 py-5 text-center"
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-full"
              style={{
                background: "rgba(0,0,0,0.28)",
                color: "var(--fg)",
              }}
            >
              {tile.icon}
            </span>
            <span className="text-sm font-semibold">{tile.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function IconLock({ locked, large }: { locked: boolean; large?: boolean }) {
  const s = large ? 28 : 22;
  return locked ? (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 11V8a4 4 0 0 1 7.5-1.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFlash() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHorn() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 14v-2a4 4 0 0 1 4-4h2l7-3v14l-7-3H8a4 4 0 0 1-4-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M19 10v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconWake() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v4M12 16v4M4 12h4M16 12h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
