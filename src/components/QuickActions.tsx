"use client";

import type { ReactNode } from "react";
import type { VehicleCommand } from "@/lib/types";

interface QuickActionsProps {
  locked: boolean;
  climateOn: boolean;
  busy: boolean;
  remoteReady?: boolean;
  onCommand: (command: VehicleCommand) => void;
  onOpenClimate?: () => void;
}

type Action = {
  id: string;
  label: string;
  active?: boolean;
  icon: ReactNode;
  onClick: () => void;
};

/** Three primary actions under the vehicle — lock, climate, find. */
export function QuickActions({
  locked,
  climateOn,
  busy,
  remoteReady = true,
  onCommand,
  onOpenClimate,
}: QuickActionsProps) {
  const actions: Action[] = [
    {
      id: "lock",
      label: locked ? "Entriegeln" : "Verriegeln",
      active: !locked,
      icon: <IconLock locked={locked} />,
      onClick: () => onCommand(locked ? "unlock" : "lock"),
    },
    {
      id: "climate",
      label: climateOn ? "Vorklima aus" : "Vorklima",
      active: climateOn,
      icon: <IconClimate />,
      onClick: () => {
        if (climateOn) {
          onCommand("climate_stop");
          return;
        }
        if (!remoteReady && onOpenClimate) {
          onOpenClimate();
          return;
        }
        onCommand("climate_start");
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
    <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-3">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={busy}
          onClick={action.onClick}
          className={`action-btn ui-surface ui-tile ${
            action.active ? "ui-surface-active" : ""
          }`}
        >
          <span
            className="ui-tile-icon"
            style={{
              background: action.active
                ? "rgba(95,227,192,0.2)"
                : "rgba(0,0,0,0.28)",
              color: action.active ? "var(--accent-bright)" : "var(--fg)",
            }}
          >
            {action.icon}
          </span>
          <span className="ui-tile-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

function IconLock({ locked }: { locked: boolean }) {
  return locked ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconClimate() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v18M5.5 6.5l13 11M18.5 6.5l-13 11"
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
