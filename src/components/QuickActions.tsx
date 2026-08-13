"use client";

import type { ReactNode } from "react";
import type { VehicleCommand } from "@/lib/types";

interface QuickActionsProps {
  locked: boolean;
  climateOn: boolean;
  charging: boolean;
  plugged: boolean;
  busy: boolean;
  onCommand: (command: VehicleCommand) => void;
  onOpenClimate?: () => void;
}

function IconLock({ locked }: { locked: boolean }) {
  return locked ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 0 1 7.5-1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconClimate() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v18M5.5 6.5l13 11M18.5 6.5l-13 11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCharge() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2 6 13h5l-1 9 8-12h-5V2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFind() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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

/** Tesla-style row of 4 primary actions under the vehicle. */
export function QuickActions({
  locked,
  climateOn,
  charging,
  plugged,
  busy,
  onCommand,
  onOpenClimate,
}: QuickActionsProps) {
  const actions: {
    id: string;
    label: string;
    active?: boolean;
    icon: ReactNode;
    onClick: () => void;
  }[] = [
    {
      id: "lock",
      label: locked ? "Entriegeln" : "Verriegeln",
      active: locked,
      icon: <IconLock locked={locked} />,
      onClick: () => onCommand(locked ? "unlock" : "lock"),
    },
    {
      id: "climate",
      label: climateOn ? "Klima aus" : "Klima",
      active: climateOn,
      icon: <IconClimate />,
      onClick: () => {
        if (climateOn) onCommand("climate_stop");
        else if (onOpenClimate) onOpenClimate();
        else onCommand("climate_start");
      },
    },
    {
      id: "charge",
      label: charging ? "Lädt" : "Laden",
      active: charging,
      icon: <IconCharge />,
      onClick: () => {
        if (!charging) onCommand("charge_start");
      },
    },
    {
      id: "flash",
      label: "Finden",
      icon: <IconFind />,
      onClick: () => onCommand("flash"),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={
            busy ||
            (action.id === "charge" && (charging || !plugged))
          }
          onClick={action.onClick}
          className="action-btn flex flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center"
          style={{
            background: action.active
              ? "rgba(95,227,192,0.12)"
              : "rgba(14,28,40,0.45)",
            border: `1px solid ${action.active ? "rgba(95,227,192,0.4)" : "var(--line)"}`,
          }}
        >
          <span
            className="grid h-10 w-10 place-items-center rounded-full"
            style={{
              background: action.active
                ? "rgba(95,227,192,0.2)"
                : "rgba(0,0,0,0.25)",
              color: action.active ? "var(--accent-bright)" : "var(--fg)",
            }}
          >
            {action.icon}
          </span>
          <span className="text-[11px] font-semibold leading-tight text-[var(--fg)]">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
