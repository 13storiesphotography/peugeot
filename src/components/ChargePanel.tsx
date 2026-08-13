"use client";

import type { VehicleCommand, VehicleState } from "@/lib/types";

interface ChargePanelProps {
  vehicle: VehicleState;
  busy: boolean;
  onCommand: (
    command: VehicleCommand,
    opts?: { chargeLimitPercent?: number },
  ) => void;
}

function formatEta(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const statusLabel: Record<VehicleState["chargeStatus"], string> = {
  idle: "Nicht angeschlossen",
  plugged: "Angeschlossen",
  charging: "Lädt",
  complete: "Ladeziel erreicht",
  error: "Fehler",
};

export function ChargePanel({ vehicle, busy, onCommand }: ChargePanelProps) {
  const charging = vehicle.chargeStatus === "charging";
  const plugged = vehicle.chargeStatus !== "idle";
  const live = vehicle.mode === "live";
  const limitKnown = vehicle.chargeLimitKnown;
  const chargingToFull =
    limitKnown && vehicle.chargeLimitPercent >= 100
      ? true
      : /full/i.test(vehicle.chargingType ?? "");

  return (
    <section className="animate-rise space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Laden
          </h2>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            {statusLabel[vehicle.chargeStatus]}
            {vehicle.chargingMode ? ` · ${vehicle.chargingMode}` : ""}
            {live ? " · Live (MyPeugeot)" : " · Demo"}
          </p>
          {charging && vehicle.chargePowerKw != null ? (
            <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums text-[var(--accent-bright)]">
              {vehicle.chargePowerKw.toLocaleString("de-DE", {
                maximumFractionDigits: 1,
              })}{" "}
              kW
              {vehicle.chargeRateKmh != null ? (
                <span className="ml-2 text-sm font-normal text-[var(--fg-muted)]">
                  (API {Math.round(vehicle.chargeRateKmh)} km/h Reichweite)
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <p className="font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums">
          {Math.round(vehicle.batteryPercent)}
          <span className="text-lg text-[var(--accent-bright)]">%</span>
        </p>
      </div>

      <div
        className="h-3 overflow-hidden rounded-full"
        style={{ background: "rgba(143,168,181,0.15)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, vehicle.batteryPercent)}%`,
            background: charging
              ? "linear-gradient(90deg, #3da8a0, #5fe3c0)"
              : "#3da8a0",
          }}
        />
      </div>

      {charging ? (
        <p
          className="rounded-full px-5 py-4 text-center text-sm font-semibold"
          style={{
            background: "rgba(95,227,192,0.12)",
            border: "1px solid rgba(95,227,192,0.35)",
            color: "var(--accent-bright)",
          }}
        >
          {live ? "Lädt (Stopp nur in der Peugeot-App)" : "Lädt …"}
        </p>
      ) : (
        <button
          type="button"
          disabled={busy || !plugged || live}
          onClick={() => onCommand("charge_start")}
          className="action-btn w-full rounded-full px-5 py-4 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
            opacity: live ? 0.55 : 1,
          }}
        >
          {live ? "Start nur in Peugeot-App" : "Laden starten"}
        </button>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="text-[var(--fg-muted)]">Ladelimit</span>
          <span className="text-right font-semibold tabular-nums">
            {chargingToFull
              ? "Voll (100%)"
              : limitKnown
                ? `${vehicle.chargeLimitPercent}%`
                : "Nicht vom Auto gemeldet"}
          </span>
        </div>
        {!live ? (
          <>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={vehicle.chargeLimitPercent}
              disabled={busy}
              onChange={(e) =>
                onCommand("set_charge_limit", {
                  chargeLimitPercent: Number(e.target.value),
                })
              }
              className="w-full accent-[var(--accent-bright)]"
              aria-label="Ladelimit"
            />
            <div className="mt-2 flex justify-between text-xs text-[var(--fg-muted)]">
              <span>50%</span>
              <span>Empfohlen 80%</span>
              <span>100%</span>
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-[var(--line)] px-3 py-3 text-xs text-[var(--fg-muted)]">
            {chargingToFull
              ? "MyPeugeot meldet Lademodus „Full“ — das Auto lädt ohne separates %-Limit bis voll."
              : "Die Status-API liefert kein Zahlen-Ladelimit. Ein angezeigtes 80%-Default wäre geraten, nicht live."}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
          <dt className="text-[var(--fg-muted)]">Fertig gegen</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatEta(vehicle.estimatedFullAt)}
          </dd>
        </div>
        <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
          <dt className="text-[var(--fg-muted)]">Reichweite</dt>
          <dd className="mt-1 font-semibold tabular-nums">{vehicle.rangeKm} km</dd>
        </div>
        <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
          <dt className="text-[var(--fg-muted)]">Kapazität</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {vehicle.batteryCapacityKwh} kWh
          </dd>
        </div>
        <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
          <dt className="text-[var(--fg-muted)]">Leistung</dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {vehicle.chargePowerKw != null
              ? `${vehicle.chargePowerKw.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kW`
              : "—"}
          </dd>
          {vehicle.chargeRateKmh != null ? (
            <p className="mt-1 text-xs text-[var(--fg-muted)]">
              aus {Math.round(vehicle.chargeRateKmh)} km/h Laderate
            </p>
          ) : null}
        </div>
      </dl>
    </section>
  );
}
