"use client";

import type { ReactNode } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { useI18n } from "@/components/i18n/I18nProvider";
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
  const { t } = useI18n();
  const locked = vehicle.locked;
  const live = vehicle.mode === "live";
  const wakeDisabled = live && !remoteReady;
  const showSignals = !live || remoteSignalsOk !== false;

  const actions: ControlTile[] = [];
  if (showSignals) {
    actions.push(
      {
        id: "flash",
        label: t("controls.find"),
        onClick: () =>
          isPro ? onCommand("flash") : (window.location.href = "/control/settings#pro"),
        icon: <IconFind />,
      },
      {
        id: "horn",
        label: t("controls.horn"),
        onClick: () =>
          isPro ? onCommand("horn") : (window.location.href = "/control/settings#pro"),
        icon: <IconHorn />,
      },
    );
  }
  actions.push({
    id: "wakeup",
    label: t("controls.wake"),
    onClick: () =>
      isPro ? onCommand("wakeup") : (window.location.href = "/control/settings#pro"),
    icon: <IconWake />,
    disabled: wakeDisabled,
    title: wakeDisabled
      ? t("controls.setupRemoteTitle")
      : undefined,
  });

  return (
    <section className="animate-rise space-y-6 pt-2">
      <SectionHeader
        title={t("controls.title")}
        hint={
          !showSignals
            ? t("controls.noSignals")
            : wakeDisabled
              ? t("controls.wakeNeedsRemote")
              : t("controls.lockAndSignals")
        }
      />

      {!showSignals ? (
        <div className="rounded-2xl border border-[var(--line)] px-4 py-4 text-sm">
          <p className="font-semibold">
            {locked ? t("dash.locked") : t("dash.unlocked")}
            <span className="ml-2 text-xs font-normal text-[var(--fg-muted)]">
              {t("controls.displayOnly")}
            </span>
          </p>
          <p className="mt-2 text-xs text-[var(--fg-muted)]">
            {t("controls.noRemoteUnlock")}
          </p>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            isPro
              ? onCommand(locked ? "unlock" : "lock")
              : (window.location.href = "/control/settings#pro")
          }
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
            <IconLock locked={locked} />
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl font-semibold">
            {locked ? t("controls.unlock") : t("controls.lock")}
          </span>
          <span className="text-xs text-[var(--fg-muted)]">
            {locked ? t("controls.currentlyLocked") : t("controls.currentlyUnlocked")}
          </span>
        </button>
      )}

      <div
        className={`grid gap-3 ${
          actions.length === 1 ? "grid-cols-1" : "grid-cols-3"
        }`}
      >
        {actions.map((tile) => (
          <button
            key={tile.id}
            type="button"
            disabled={busy || tile.disabled}
            title={tile.title}
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
        d="M4 14v-3a2 2 0 0 1 2-2h3l7-4v14l-7-4H6a2 2 0 0 1-2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M19 10c.8.6.8 2.4 0 3"
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
