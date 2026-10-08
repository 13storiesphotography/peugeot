"use client";

import { useTransition } from "react";
import { addToGoal, deleteGoal } from "@/app/actions/goals";
import type { SavingsGoal } from "@/lib/finance/types";
import { formatEur } from "@/lib/finance/money";

export function GoalList({ goals }: { goals: SavingsGoal[] }) {
  const [pending, startTransition] = useTransition();

  if (goals.length === 0) {
    return (
      <p className="mt-10 text-ink-soft">
        Noch keine Ziele. Frag die AI nach dem Schrank — oder leg oben eines an.
      </p>
    );
  }

  return (
    <ul className="mt-10 space-y-8">
      {goals.map((goal) => {
        const ratio =
          goal.targetCents === 0 ? 0 : goal.savedCents / goal.targetCents;
        const remaining = Math.max(0, goal.targetCents - goal.savedCents);
        return (
          <li key={goal.id} className="animate-rise">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold">{goal.label}</h2>
                <p className="text-sm text-ink-soft">
                  Ziel {formatEur(goal.targetCents)}
                  {goal.monthlySaveCents > 0
                    ? ` · ${formatEur(goal.monthlySaveCents)} / Monat`
                    : ""}
                </p>
              </div>
              <p className="font-display text-xl font-bold text-teal">
                {formatEur(goal.savedCents)}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist">
              <div
                className="h-full rounded-full bg-teal"
                style={{ width: `${Math.min(100, ratio * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              Noch {formatEur(remaining)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <form
                action={(fd) => {
                  startTransition(async () => {
                    await addToGoal(fd);
                  });
                }}
                className="flex gap-2"
              >
                <input type="hidden" name="id" value={goal.id} />
                <input type="hidden" name="amount" value="50" />
                <button
                  type="submit"
                  disabled={pending || remaining === 0}
                  className="rounded-md border border-[#10253a]/15 px-3 py-2 text-sm font-semibold transition hover:bg-mist disabled:opacity-50"
                >
                  +50 €
                </button>
              </form>
              <form
                action={(fd) => {
                  startTransition(async () => {
                    await deleteGoal(fd);
                  });
                }}
              >
                <input type="hidden" name="id" value={goal.id} />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:text-danger"
                >
                  Löschen
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
