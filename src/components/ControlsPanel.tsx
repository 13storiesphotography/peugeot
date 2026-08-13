"use client";

import type { VehicleCommand, VehicleState } from "@/lib/types";

interface ControlsPanelProps {
  vehicle: VehicleState;
  busy: boolean;
  onCommand: (command: VehicleCommand) => void;
}

export function ControlsPanel({
  vehicle,
  busy,
  onCommand,
}: ControlsPanelProps) {
  const items: {
    id: string;
    title: string;
    hint: string;
    command: VehicleCommand;
    active?: boolean;
  }[] = [
    {
      id: "lock",
      title: vehicle.locked ? "Entriegeln" : "Verriegeln",
      hint: vehicle.locked ? "Türen geschlossen" : "Türen offen",
      command: vehicle.locked ? "unlock" : "lock",
      active: vehicle.locked,
    },
    {
      id: "flash",
      title: "Lichter blinken",
      hint: "Fahrzeug finden",
      command: "flash",
    },
    {
      id: "horn",
      title: "Hupe",
      hint: "Kurz hupen",
      command: "horn",
    },
    {
      id: "wakeup",
      title: "Aufwecken",
      hint: "Fahrzeug aus dem Schlaf holen",
      command: "wakeup",
    },
    {
      id: "preheat",
      title: vehicle.batteryPreheat
        ? "Vorwärmung stoppen"
        : "Batterie vorwärmen",
      hint: "E-3008 Schnellladen bei Kälte",
      command: vehicle.batteryPreheat
        ? "battery_preheat_stop"
        : "battery_preheat_start",
      active: vehicle.batteryPreheat,
    },
  ];

  return (
    <section className="animate-rise space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Steuern
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Verriegeln, Signale und Systemfunktionen.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            onClick={() => onCommand(item.command)}
            className="action-btn flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left"
            style={{
              borderColor: item.active
                ? "rgba(95,227,192,0.45)"
                : "var(--line)",
              background: item.active
                ? "rgba(95,227,192,0.1)"
                : "rgba(14,28,40,0.4)",
            }}
          >
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">{item.hint}</p>
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-[0.16em]"
              style={{
                color: item.active
                  ? "var(--accent-bright)"
                  : "var(--fg-muted)",
              }}
            >
              {item.active ? "An" : "Tippen"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
