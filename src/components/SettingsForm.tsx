"use client";

import { useActionState } from "react";
import {
  saveVehicleSettings,
  type SettingsState,
} from "@/app/actions/settings";
import type { VehicleState } from "@/lib/types";

const initial: SettingsState = {};

export function SettingsForm({ vehicle }: { vehicle: VehicleState }) {
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

        {/* Keep connection fields out of this form; PeugeotConnectForm owns them. */}
        <input type="hidden" name="countryCode" value="DE" />
        <input type="hidden" name="mypeugeotEmail" value="" />
        <input type="hidden" name="connected" value="" />

        {state.error ? (
          <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="mt-4 text-sm text-[var(--accent-bright)]">
            {state.success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="action-btn mt-6 rounded-full px-6 py-3 text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg, #5fe3c0, #3da8a0)",
            color: "#031016",
          }}
        >
          {pending ? "Speichern…" : "Profil speichern"}
        </button>
      </section>
    </form>
  );
}
