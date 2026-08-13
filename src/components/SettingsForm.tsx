"use client";

import { useActionState } from "react";
import {
  saveVehicleSettings,
  type SettingsState,
} from "@/app/actions/settings";
import type { PeugeotConnection } from "@/lib/vehicle/repository";
import type { VehicleState } from "@/lib/types";

const initial: SettingsState = {};

export function SettingsForm({
  vehicle,
  connection,
}: {
  vehicle: VehicleState;
  connection: PeugeotConnection;
}) {
  const [state, action, pending] = useActionState(saveVehicleSettings, initial);

  return (
    <form action={action} className="space-y-8">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Fahrzeugprofil
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Name und Optik deines E-3008 in der Steuerung.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              Spitzname
            </span>
            <input
              name="nickname"
              defaultValue={vehicle.nickname}
              required
              className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              Farbe
            </span>
            <input
              name="color"
              defaultValue={vehicle.color}
              className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              VIN
            </span>
            <input
              name="vin"
              defaultValue={vehicle.vin}
              placeholder="VR3…"
              className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
            />
          </label>
        </div>
      </section>

      <section className="panel rounded-[1.5rem] p-5 sm:p-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          MyPeugeot verbinden
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Speichert deine Verbindungsdaten für den späteren Live-Abruf. Passwort
          wird nicht gespeichert — optional Access-Token aus dem OAuth-Flow.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              Land
            </span>
            <select
              name="countryCode"
              defaultValue={connection.countryCode}
              className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
            >
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
              <option value="CH">Schweiz</option>
              <option value="FR">Frankreich</option>
              <option value="NL">Niederlande</option>
              <option value="BE">Belgien</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              MyPeugeot E-Mail
            </span>
            <input
              name="mypeugeotEmail"
              type="email"
              defaultValue={connection.mypeugeotEmail ?? ""}
              placeholder="dein@account.de"
              className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              Vehicle API ID (optional)
            </span>
            <input
              name="vehicleApiId"
              defaultValue={connection.vehicleApiId ?? ""}
              className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[var(--fg-muted)]">
              Access Token (optional)
            </span>
            <input
              name="accessToken"
              type="password"
              placeholder={
                connection.hasAccessToken
                  ? "Gespeichert – leer lassen zum Behalten"
                  : "Nur eintragen, wenn du einen Token hast"
              }
              className="w-full rounded-xl border border-[var(--line)] bg-black/25 px-4 py-3 outline-none focus:border-[var(--accent-bright)]"
            />
          </label>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              name="connected"
              type="checkbox"
              defaultChecked={connection.connected}
            />
            <span className="text-sm">
              Als verbunden markieren (Live-Modus, sobald Token vorhanden)
            </span>
          </label>
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-[var(--accent-bright)]">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="action-btn rounded-full px-6 py-3 text-sm font-semibold"
        style={{
          background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
          color: "#031016",
        }}
      >
        {pending ? "Speichern…" : "Einstellungen speichern"}
      </button>
    </form>
  );
}
