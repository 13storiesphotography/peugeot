"use client";

import { useState, useTransition } from "react";
import { createGoalFromForm } from "@/app/actions/goals";

export function GoalCreateForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-8 grid gap-3 border-t border-[#10253a]/15 pt-6 md:grid-cols-4"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createGoalFromForm(formData);
          if (!result.ok) setError(result.error);
        });
      }}
    >
      <input
        name="label"
        required
        placeholder="z.B. Schrank"
        className="rounded-md border border-[#10253a]/15 bg-white/70 px-3 py-3 text-sm outline-none ring-teal focus:ring-2 md:col-span-1"
      />
      <input
        name="target"
        required
        placeholder="Ziel €"
        inputMode="decimal"
        className="rounded-md border border-[#10253a]/15 bg-white/70 px-3 py-3 text-sm outline-none ring-teal focus:ring-2"
      />
      <input
        name="monthly"
        placeholder="Sparrate € / Monat"
        inputMode="decimal"
        className="rounded-md border border-[#10253a]/15 bg-white/70 px-3 py-3 text-sm outline-none ring-teal focus:ring-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-deep disabled:opacity-50"
      >
        {pending ? "…" : "Anlegen"}
      </button>
      {error && (
        <p className="text-sm text-danger md:col-span-4">{error}</p>
      )}
    </form>
  );
}
