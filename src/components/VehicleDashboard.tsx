"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { BatteryRing } from "@/components/BatteryRing";
import { ChargePanel } from "@/components/ChargePanel";
import { ClimatePanel } from "@/components/ClimatePanel";
import { QuickActions } from "@/components/QuickActions";
import type { CommandResult, VehicleCommand, VehicleState } from "@/lib/types";

function formatUpdated(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export function VehicleDashboard({ initial }: { initial: VehicleState }) {
  const [vehicle, setVehicle] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/vehicle", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as VehicleState;
    startTransition(() => setVehicle(data));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, 8000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const runCommand = async (
    command: VehicleCommand,
    chargeLimitPercent?: number,
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/vehicle/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, chargeLimitPercent }),
      });
      const data = (await res.json()) as CommandResult;
      setVehicle(data.vehicle);
      setMessage(data.message);
    } catch {
      setMessage("Befehl fehlgeschlagen – bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  };

  const climateOn = vehicle.climateStatus !== "off";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="animate-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--accent-bright)]">
            Peugeot
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl">
            {vehicle.nickname}
          </h1>
          <p className="mt-2 max-w-md text-sm text-[var(--fg-muted)] sm:text-base">
            Direkte Steuerung für Laden, Klima und Fernbedienung – klarer als
            die Serien-App, ohne Ballast.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className="rounded-full border px-3 py-1"
            style={{
              borderColor:
                vehicle.mode === "demo"
                  ? "rgba(232,184,109,0.45)"
                  : "rgba(95,227,192,0.45)",
              color:
                vehicle.mode === "demo" ? "var(--warn)" : "var(--accent-bright)",
            }}
          >
            {vehicle.mode === "demo" ? "Demo-Modus" : "Live"}
          </span>
          <span className="rounded-full border border-[var(--line)] px-3 py-1 text-[var(--fg-muted)]">
            {vehicle.color}
          </span>
          <span className="rounded-full border border-[var(--line)] px-3 py-1 text-[var(--fg-muted)] tabular-nums">
            {vehicle.mileageKm.toLocaleString("de-DE")} km
          </span>
        </div>
      </header>

      <section className="animate-rise-delay-1 panel relative overflow-hidden rounded-[1.75rem] px-4 py-8 sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(120deg, transparent 20%, rgba(95,227,192,0.06) 50%, transparent 80%)",
          }}
        />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
          <BatteryRing vehicle={vehicle} />
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--fg-muted)]">
                Status
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
                {vehicle.locked ? "Verriegelt" : "Entriegelt"}
                {vehicle.chargeStatus === "charging"
                  ? " · lädt"
                  : vehicle.chargeStatus === "plugged"
                    ? " · bereit zum Laden"
                    : ""}
              </p>
              <p className="mt-2 text-sm text-[var(--fg-muted)]">
                Aktualisiert {formatUpdated(vehicle.lastUpdatedAt)}
                {isPending ? " · sync…" : ""}
              </p>
            </div>
            <QuickActions
              locked={vehicle.locked}
              climateOn={climateOn}
              batteryPreheat={vehicle.batteryPreheat}
              busy={busy}
              onCommand={(command) => void runCommand(command)}
            />
            {message ? (
              <p
                role="status"
                className="rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2 text-sm text-[var(--accent-bright)]"
              >
                {message}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChargePanel
          vehicle={vehicle}
          busy={busy}
          onCommand={(command, limit) => void runCommand(command, limit)}
        />
        <ClimatePanel vehicle={vehicle} />
      </div>

      <footer className="pb-6 text-center text-xs text-[var(--fg-muted)]">
        VIN {vehicle.vin} · MyPeugeot / Stellantis Remote E-Controls kompatibel
        vorbereitet · Demo ohne Live-Token
      </footer>
    </div>
  );
}
