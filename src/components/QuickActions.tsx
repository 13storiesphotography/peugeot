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
  onOpenCharge?: () => void;
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

type Slot =
  | {
      kind: "button";
      id: string;
      label: string;
      active?: boolean;
      disabled?: boolean;
      icon: ReactNode;
      onClick: () => void;
    }
  | {
      kind: "status";
      id: string;
      label: string;
      active?: boolean;
      icon: ReactNode;
    };

/** Tesla-style row of primary actions under the vehicle. */
export function QuickActions({
  locked,
  climateOn,
  charging,
  plugged,
  busy,
  onCommand,
  onOpenClimate,
  onOpenCharge,
}: QuickActionsProps) {
  const chargeSlot: Slot = charging
    ? {
        kind: "status",
        id: "charge",
        label: "Lädt",
        active: true,
        icon: <IconCharge />,
      }
    : plugged
      ? {
          kind: "button",
          id: "charge",
          label: "Laden",
          icon: <IconCharge />,
          onClick: () => {
            if (onOpenCharge) onOpenCharge();
            else onCommand("charge_start");
          },
        }
      : {
          kind: "status",
          id: "charge",
          label: "Frei",
          icon: <IconCharge />,
        };

  const slots: Slot[] = [
    {
      kind: "button",
      id: "lock",
      label: locked ? "Entriegeln" : "Verriegeln",
      active: locked,
      icon: <IconLock locked={locked} />,
      onClick: () => onCommand(locked ? "unlock" : "lock"),
    },
    {
      kind: "button",
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
    chargeSlot,
    {
      kind: "button",
      id: "flash",
      label: "Finden",
      icon: <IconFind />,
      onClick: () => onCommand("flash"),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {slots.map((slot) => {
        const shellStyle = {
          background: slot.active
            ? "rgba(95,227,192,0.12)"
            : "rgba(14,28,40,0.45)",
          border: `1px solid ${slot.active ? "rgba(95,227,192,0.4)" : "var(--line)"}`,
        } as const;

        const content = (
          <>
            <span
              className="grid h-10 w-10 place-items-center rounded-full"
              style={{
                background: slot.active
                  ? "rgba(95,227,192,0.2)"
                  : "rgba(0,0,0,0.25)",
                color: slot.active ? "var(--accent-bright)" : "var(--fg)",
              }}
            >
              {slot.icon}
            </span>
            <span className="text-[11px] font-semibold leading-tight text-[var(--fg)]">
              {slot.label}
            </span>
          </>
        );

        if (slot.kind === "status") {
          return (
            <div
              key={slot.id}
              className="flex flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center"
              style={shellStyle}
              aria-label={slot.label}
            >
              {content}
            </div>
          );
        }

        return (
          <button
            key={slot.id}
            type="button"
            disabled={busy || slot.disabled}
            onClick={slot.onClick}
            className="action-btn flex flex-col items-center gap-2 rounded-2xl px-1 py-3 text-center"
            style={shellStyle}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
