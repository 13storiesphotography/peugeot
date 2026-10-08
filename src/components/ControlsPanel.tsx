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
  isPro?: boolean;
}

type ControlTile = {
  id: string;
  label: string;
  onClick: () => void;
  icon: ReactNode;
  disabled?: boolean;
  title?: string;
};

/** Vehicle controls — Klima/Laden live in their own tabs. */
export function ControlsPanel({
  vehicle,
  busy,
  remoteReady = false,
  remoteSignalsOk = null,
  onCommand,
  isPro = false,
}: ControlsPanelProps) {
  const locked = vehicle.locked;
  const live = vehicle.mode === "live";
  const wakeDisabled = live && !remoteReady;
  const signalsLikelyMissing = live && remoteSignalsOk === false;

  const goPro = () => {
    window.location.href = "/control/settings#pro";
  };

  const actions: ControlTile[] = [
    {
      id: "flash",
      label: "Finden",
      onClick: () => (isPro ? onCommand("flash") : goPro()),
      icon: <IconFind />,
    },
    {
      id: "horn",
      label: "Hupe",
      onClick: () => (isPro ? onCommand("horn") : goPro()),
      icon: <IconHorn />,
    },
    {
      id: "wakeup",
      label: "Wecken",
      onClick: () => (isPro ? onCommand("wakeup") : goPro()),
      icon: <IconWake />,
      disabled: wakeDisabled,
      title: wakeDisabled
        ? "Fernbedienung unter Einstellungen einrichten"
        : undefined,
    },
  ];

  const lockAction = () =>
    isPro
      ? onCommand(locked ? "unlock" : "lock")
      : goPro();

  return (
    <section className="animate-rise space-y-6 pt-2 lg:pt-0">
      <SectionHeader
        title="Steuern"
        hint={
          wakeDisabled
            ? "Wecken braucht Fernbedienung"
            : isPro
              ? "Schloss und Signale"
              : "Fernbedienung mit Pro"
        }
        hideTitleOnDesktop
      />

      {!isPro ? (
        <div className="rounded-2xl border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--fg-muted)]">
          Schloss, Finden und Hupe sind in{" "}
          <span className="font-semibold text-[var(--fg)]">Pro</span>.{" "}
          <a
            href="/control/settings#pro"
            className="font-semibold text-[var(--accent-bright)] underline-offset-2 hover:underline"
          >
            Pro ansehen
          </a>
        </div>
      ) : null}

      {signalsLikelyMissing ? (
        <p className="text-sm text-[var(--fg-muted)]">
          Schloss/Signale brauchen{" "}
          <span className="text-[var(--fg)]">Connect PLUS</span> in MyPeugeot.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-4">
        <button
          type="button"
          disabled={busy}
          onClick={lockAction}
          className="action-btn ui-surface flex w-full flex-col items-center gap-3 px-5 py-7 lg:gap-2.5 lg:px-3 lg:py-5"
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
            className="grid h-14 w-14 place-items-center rounded-full lg:h-11 lg:w-11"
            style={{
              background: locked
                ? "rgba(95,227,192,0.18)"
                : "rgba(232,184,109,0.18)",
              color: locked ? "var(--accent-bright)" : "var(--warn)",
            }}
          >
            <IconLock locked={locked} />
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl font-semibold lg:text-sm">
            {locked ? "Entriegeln" : "Verriegeln"}
          </span>
          <span className="text-xs text-[var(--fg-muted)] lg:text-[11px]">
            {locked ? "Aktuell verriegelt" : "Aktuell entriegelt"}
          </span>
        </button>
        <div className="grid grid-cols-3 gap-3 lg:contents">
          {actions.map((tile) => (
            <button
              key={tile.id}
              type="button"
              disabled={busy || tile.disabled}
              title={tile.title}
              onClick={tile.onClick}
              className="action-btn ui-surface ui-tile disabled:opacity-55 lg:py-5"
            >
              <span className="ui-tile-icon">{tile.icon}</span>
              <span className="ui-tile-label lg:text-sm">{tile.label}</span>
            </button>
          ))}
        </div>
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
        d="M4 10v4h3l5 3V7l-5 3H4z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M16 9.5a4 4 0 0 1 0 5M18.5 7.5a7 7 0 0 1 0 9"
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
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
