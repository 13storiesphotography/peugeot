"use client";

import type { ReactNode } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import type { VehicleCommand, VehicleState } from "@/lib/types";

interface ControlsPanelProps {
  vehicle: VehicleState;
  busy: boolean;
  remoteReady?: boolean;
  remoteSignalsOk?: boolean | null;
  onCommand: (command: VehicleCommand) => void;
}

type ControlTile = {
  id: string;
  label: string;
  onClick: () => void;
  icon: ReactNode;
  disabled?: boolean;
};

/** Vehicle controls only — Klima/Laden live in their own tabs. */
export function ControlsPanel({
  vehicle,
  busy,
  remoteReady = false,
  remoteSignalsOk = null,
  onCommand,
}: ControlsPanelProps) {
  const locked = vehicle.locked;
  const live = vehicle.mode === "live";
  const wakeDisabled = live && !remoteReady;
  const signalsDenied = live && remoteSignalsOk === false;

  const actions: ControlTile[] = [
    {
      id: "flash",
      label: "Finden",
      onClick: () => onCommand("flash"),
      icon: <IconFind />,
      disabled: signalsDenied,
    },
    {
      id: "horn",
      label: "Hupe",
      onClick: () => onCommand("horn"),
      icon: <IconHorn />,
      disabled: signalsDenied,
    },
    {
      id: "wakeup",
      label: "Wecken",
      onClick: () => onCommand("wakeup"),
      icon: <IconWake />,
      disabled: wakeDisabled,
    },
  ];

  return (
    <section className="animate-rise space-y-6 pt-2">
      <SectionHeader
        title="Steuern"
        hint={
          signalsDenied
            ? "Schloss/Signal: Connect PLUS in MyPeugeot nötig"
            : wakeDisabled
              ? "Wecken braucht Fernbedienung"
              : "Schloss und Signale"
        }
      />

      {signalsDenied ? (
        <p className="rounded-2xl border border-[var(--line)] px-4 py-3 text-xs text-[var(--fg-muted)]">
          Peugeot hat Schloss/Hupe/Licht für dieses Konto abgelehnt. In
          MyPeugeot unter Connected Services prüfen, ob{" "}
          <span className="text-[var(--fg)]">Connect PLUS / Remote Control</span>{" "}
          aktiv ist (e-Remote allein steuert nur Klima/Laden).
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || signalsDenied}
        onClick={() => onCommand(locked ? "unlock" : "lock")}
        className="action-btn ui-surface flex w-full flex-col items-center gap-3 px-5 py-7"
        style={{
          opacity: signalsDenied ? 0.55 : 1,
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
          <IconLock locked={locked} />
        </span>
        <span className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {locked ? "Entriegeln" : "Verriegeln"}
        </span>
        <span className="text-xs text-[var(--fg-muted)]">
          {locked ? "Aktuell verriegelt" : "Aktuell entriegelt"}
        </span>
      </button>

      <div className="grid grid-cols-3 gap-3">
        {actions.map((tile) => (
          <button
            key={tile.id}
            type="button"
            disabled={busy || tile.disabled}
            title={
              tile.disabled
                ? tile.id === "wakeup"
                  ? "Fernbedienung unter Einstellungen einrichten"
                  : "Connect PLUS / Remote Control in MyPeugeot nötig"
                : undefined
            }
            onClick={tile.onClick}
            className="action-btn ui-surface ui-tile disabled:opacity-55"
          >
            <span className="ui-tile-icon">{tile.icon}</span>
            <span className="ui-tile-label">{tile.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function IconLock({ locked }: { locked: boolean }) {
  return locked ? (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconFind() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2"
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
