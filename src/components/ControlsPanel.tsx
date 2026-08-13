"use client";

import type { ReactNode } from "react";
import type { VehicleCommand, VehicleState } from "@/lib/types";

interface ControlsPanelProps {
  vehicle: VehicleState;
  busy: boolean;
  onCommand: (command: VehicleCommand) => void;
}

type ControlTile = {
  id: string;
  label: string;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
};

/** Vehicle controls only — Klima/Laden live in their own tabs. */
export function ControlsPanel({
  vehicle,
  busy,
  onCommand,
}: ControlsPanelProps) {
  const live = vehicle.mode === "live";
  const locked = vehicle.locked;

  const actions: ControlTile[] = [
    {
      id: "flash",
      label: "Lichter",
      hint: "Blinken / Finden",
      onClick: () => onCommand("flash"),
      icon: <IconFlash />,
    },
    {
      id: "horn",
      label: "Hupe",
      hint: "Kurz",
      onClick: () => onCommand("horn"),
      icon: <IconHorn />,
    },
    {
      id: "wakeup",
      label: "Aufwecken",
      hint: "Online holen",
      onClick: () => onCommand("wakeup"),
      icon: <IconWake />,
    },
  ];

  return (
    <section className="animate-rise space-y-7">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Steuern
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Schloss und Signale
          {live ? " · Live" : " · Demo"}
        </p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onCommand(locked ? "unlock" : "lock")}
        className="action-btn flex w-full flex-col items-center gap-3 rounded-[1.75rem] border px-5 py-7"
        style={{
          borderColor: locked
            ? "rgba(95,227,192,0.45)"
            : "rgba(232,184,109,0.4)",
          background: locked
            ? "linear-gradient(160deg, rgba(95,227,192,0.14), rgba(14,28,40,0.55))"
            : "linear-gradient(160deg, rgba(232,184,109,0.12), rgba(14,28,40,0.55))",
        }}
      >
        <span
          className="grid h-16 w-16 place-items-center rounded-full"
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
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
          {locked ? "Türen geschlossen" : "Türen offen"}
        </span>
      </button>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--fg-muted)]">
          Signale & Verbindung
        </p>
        <div className="grid grid-cols-3 gap-3">
          {actions.map((tile) => (
            <TileButton key={tile.id} tile={tile} busy={busy} />
          ))}
        </div>
      </div>

      {live ? (
        <p className="text-center text-xs text-[var(--fg-muted)]">
          Klima und Laden liegen in den eigenen Tabs. Schloss/Signale lokal,
          bis MQTT-Remotes angebunden sind.
        </p>
      ) : (
        <p className="text-center text-xs text-[var(--fg-muted)]">
          Klima und Laden liegen in den eigenen Tabs.
        </p>
      )}
    </section>
  );
}

function TileButton({
  tile,
  busy,
}: {
  tile: ControlTile;
  busy: boolean;
}) {
  const disabled = busy || tile.disabled;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={tile.onClick}
      className="action-btn flex flex-col items-center gap-2.5 rounded-2xl border px-2 py-5 text-center"
      style={{
        borderColor: tile.active ? "rgba(95,227,192,0.45)" : "var(--line)",
        background: tile.active
          ? "rgba(95,227,192,0.1)"
          : "rgba(14,28,40,0.45)",
        opacity: tile.disabled ? 0.5 : 1,
      }}
    >
      <span
        className="grid h-12 w-12 place-items-center rounded-full"
        style={{
          background: tile.active
            ? "rgba(95,227,192,0.2)"
            : "rgba(0,0,0,0.28)",
          color: tile.active ? "var(--accent-bright)" : "var(--fg)",
        }}
      >
        {tile.icon}
      </span>
      <span className="text-sm font-semibold">{tile.label}</span>
      {tile.hint ? (
        <span className="text-[11px] leading-tight text-[var(--fg-muted)]">
          {tile.hint}
        </span>
      ) : null}
    </button>
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
