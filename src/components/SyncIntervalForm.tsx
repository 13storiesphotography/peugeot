"use client";

import { useActionState } from "react";
import {
  saveSyncIntervalAction,
  type SettingsState,
} from "@/app/actions/settings";

const OPTIONS = [
  { value: 20, label: "20 Sekunden" },
  { value: 30, label: "30 Sekunden" },
  { value: 45, label: "45 Sekunden" },
  { value: 60, label: "1 Minute" },
  { value: 120, label: "2 Minuten" },
  { value: 300, label: "5 Minuten" },
];

export function SyncIntervalForm({
  syncIntervalSec,
}: {
  syncIntervalSec: number;
}) {
  const [state, action, pending] = useActionState(
    saveSyncIntervalAction,
    {} as SettingsState,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          Aktualisierung
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          Wie oft der Fahrzeugstand geladen wird, solange die App offen ist.
        </p>
      </div>
      <label className="block text-sm">
        <span className="text-[var(--fg-muted)]">Intervall</span>
        <select
          name="syncIntervalSec"
          defaultValue={syncIntervalSec}
          className="mt-1 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="action-btn btn-primary rounded-full px-5 py-2.5 text-sm font-semibold"
      >
        {pending ? "Speichern…" : "Speichern"}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-[var(--accent-bright)]">{state.success}</p>
      ) : null}
    </form>
  );
}
