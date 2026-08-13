"use client";

import { LocationLink } from "@/components/LocationLink";
import { SchedulePanel } from "@/components/SchedulePanel";
import type { VehicleCommand, VehicleState } from "@/lib/types";
import type { VehicleSchedule } from "@/lib/vehicle/repository";

interface ClimatePanelProps {
  vehicle: VehicleState;
  busy: boolean;
  schedules: VehicleSchedule[];
  onCommand: (
    command: VehicleCommand,
    opts?: { targetTempC?: number },
  ) => void;
  onSchedulesChanged: () => void;
}

export function ClimatePanel({
  vehicle,
  busy,
  schedules,
  onCommand,
  onSchedulesChanged,
}: ClimatePanelProps) {
  const live = vehicle.mode === "live";
  const active = vehicle.climateStatus !== "off";
  const target = vehicle.targetTempC;

  const nudge = (delta: number) => {
    onCommand("set_climate_temp", { targetTempC: target + delta });
  };

  return (
    <section className="animate-rise space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Klima
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {live
            ? "Live: Kabinentemp vom Auto · Vorklima-Remote folgt noch."
            : "Demo: Zieltemperatur und Vorklima lokal simuliert."}
        </p>
      </div>

      <div className="flex flex-col items-center py-6">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--fg-muted)]">
          Wunschtemperatur
        </p>
        <div className="mt-4 flex items-center gap-6">
          <button
            type="button"
            disabled={busy || target <= 16}
            onClick={() => nudge(-1)}
            className="action-btn grid h-14 w-14 place-items-center rounded-full border border-[var(--line)] text-2xl font-semibold"
            aria-label="Kälter"
          >
            −
          </button>
          <p className="font-[family-name:var(--font-display)] text-7xl font-semibold tabular-nums leading-none">
            {target}
            <span className="text-3xl text-[var(--accent-bright)]">°</span>
          </p>
          <button
            type="button"
            disabled={busy || target >= 28}
            onClick={() => nudge(1)}
            className="action-btn grid h-14 w-14 place-items-center rounded-full border border-[var(--line)] text-2xl font-semibold"
            aria-label="Wärmer"
          >
            +
          </button>
        </div>
        <p className="mt-4 text-sm text-[var(--fg-muted)]">
          Kabine {vehicle.cabinTempC}°
          {!live && active
            ? vehicle.climateStatus === "heating"
              ? " · heizt"
              : vehicle.climateStatus === "cooling"
                ? " · kühlt"
                : " · aktiv"
            : " · gemessen"}
        </p>
      </div>

      {live ? (
        <p className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--fg-muted)]">
          MyPeugeot erlaubt Vorklima typischerweise nur als An/Aus (ohne freies
          °C). Die Wunschtemperatur hier speichern wir in der App — die
          Komfort-Temperatur setzt du im Fahrzeug bzw. in der Peugeot-App.
          Echte Remote-Vorklima (MQTT + PIN) können wir als Nächstes anbinden.
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || live}
        onClick={() => onCommand(active ? "climate_stop" : "climate_start")}
        className="action-btn w-full rounded-full px-5 py-4 text-sm font-semibold"
        style={{
          background: active
            ? "rgba(224,122,106,0.16)"
            : "linear-gradient(135deg, #5fe3c0, #3da8a0)",
          color: active ? "var(--danger)" : "#031016",
          border: active ? "1px solid rgba(224,122,106,0.4)" : "none",
          opacity: live ? 0.55 : 1,
        }}
      >
        {live
          ? "Vorklima: Peugeot-App (Remote folgt)"
          : active
            ? "Klima stoppen"
            : "Klima starten"}
      </button>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy || live}
          onClick={() =>
            onCommand(
              vehicle.batteryPreheat
                ? "battery_preheat_stop"
                : "battery_preheat_start",
            )
          }
          className="action-btn rounded-2xl border px-4 py-4 text-left"
          style={{
            borderColor: vehicle.batteryPreheat
              ? "rgba(95,227,192,0.45)"
              : "var(--line)",
            background: vehicle.batteryPreheat
              ? "rgba(95,227,192,0.1)"
              : "rgba(14,28,40,0.4)",
            opacity: live ? 0.55 : 1,
          }}
        >
          <p className="font-semibold">Batterie vorwärmen</p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]">
            {live
              ? "Live noch nicht angebunden"
              : vehicle.batteryPreheat
                ? "Aktiv — schnelleres Laden"
                : "Aus"}
          </p>
        </button>
        <LocationLink
          location={vehicle.location}
          className="block rounded-2xl border border-[var(--line)] px-4 py-4 transition hover:border-[var(--accent-bright)]/40"
        />
      </div>

      <div className="border-t border-[var(--line)] pt-6">
        <SchedulePanel
          schedules={schedules}
          onChanged={onSchedulesChanged}
          kinds={["climate"]}
          defaultTargetTempC={target}
          compact
          title="Vorklima planen"
          hint={
            live
              ? "Nur in der App gespeichert — startet das Auto noch nicht. Live-Vorklima braucht noch Remote (MQTT + PIN); bis dahin Peugeot-App nutzen."
              : "Demo: Pläne werden gespeichert und lokal simuliert. Live-Start am Auto folgt mit Remote."
          }
        />
      </div>
    </section>
  );
}
