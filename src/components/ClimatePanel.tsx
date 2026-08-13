"use client";

import type { VehicleState } from "@/lib/types";

interface ClimatePanelProps {
  vehicle: VehicleState;
}

export function ClimatePanel({ vehicle }: ClimatePanelProps) {
  const active = vehicle.climateStatus !== "off";

  return (
    <section className="panel animate-rise-delay-3 rounded-[1.5rem] p-5 sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
        Klima & Standort
      </h2>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">
        Kabine und Batterie-Vorwärmung für den E-3008.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Kabine
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
            {vehicle.cabinTempC}°
            <span className="ml-1 text-base text-[var(--fg-muted)]">
              → {vehicle.targetTempC}°
            </span>
          </p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            {active
              ? vehicle.climateStatus === "heating"
                ? "Heizt vor"
                : vehicle.climateStatus === "cooling"
                  ? "Kühlt vor"
                  : "Vorklimatisierung"
              : "Aus"}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
            Batterie
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
            {vehicle.batteryPreheat ? "Warm" : "Bereit"}
          </p>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">
            {vehicle.batteryPreheat
              ? "Vorwärmung aktiv – schnelleres Laden bei Kälte"
              : "Vorwärmung aus"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--line)] px-4 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
          Letzter Standort
        </p>
        <p className="mt-2 text-base font-medium">{vehicle.location.address}</p>
        <p className="mt-1 text-xs text-[var(--fg-muted)]">
          {vehicle.location.latitude.toFixed(4)}, {vehicle.location.longitude.toFixed(4)}
        </p>
      </div>
    </section>
  );
}
