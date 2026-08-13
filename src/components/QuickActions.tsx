"use client";

import type { VehicleCommand } from "@/lib/types";

interface Action {
  id: string;
  label: string;
  command: VehicleCommand;
  active?: boolean;
  hint?: string;
}

interface QuickActionsProps {
  locked: boolean;
  climateOn: boolean;
  batteryPreheat: boolean;
  busy: boolean;
  onCommand: (command: VehicleCommand) => void;
}

export function QuickActions({
  locked,
  climateOn,
  batteryPreheat,
  busy,
  onCommand,
}: QuickActionsProps) {
  const actions: Action[] = [
    {
      id: "lock",
      label: locked ? "Entriegeln" : "Verriegeln",
      command: locked ? "unlock" : "lock",
      active: locked,
      hint: locked ? "Geschlossen" : "Offen",
    },
    {
      id: "climate",
      label: climateOn ? "Klima stoppen" : "Vorklima 21°",
      command: climateOn ? "climate_stop" : "climate_start",
      active: climateOn,
    },
    {
      id: "preheat",
      label: batteryPreheat ? "Vorwärmung aus" : "Akku vorwärmen",
      command: batteryPreheat ? "battery_preheat_stop" : "battery_preheat_start",
      active: batteryPreheat,
      hint: "E-3008",
    },
    {
      id: "flash",
      label: "Lichter",
      command: "flash",
    },
    {
      id: "horn",
      label: "Hupe",
      command: "horn",
    },
    {
      id: "wakeup",
      label: "Aufwecken",
      command: "wakeup",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={busy}
          onClick={() => onCommand(action.command)}
          className="action-btn panel flex min-h-[88px] flex-col items-start justify-between rounded-2xl px-4 py-3 text-left"
          style={{
            background: action.active
              ? "linear-gradient(160deg, rgba(95,227,192,0.16), rgba(14,28,40,0.7))"
              : undefined,
            borderColor: action.active ? "rgba(95,227,192,0.4)" : undefined,
          }}
        >
          <span className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
            {action.label}
          </span>
          <span className="text-xs text-[var(--fg-muted)]">
            {action.hint ?? (action.active ? "Aktiv" : "Tippen")}
          </span>
        </button>
      ))}
    </div>
  );
}
