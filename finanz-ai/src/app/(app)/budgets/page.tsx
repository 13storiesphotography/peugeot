import { AppShell } from "@/components/app/AppShell";
import { budgetUsage, buildDemoSnapshot } from "@/lib/finance/snapshot";
import { formatEur } from "@/lib/finance/money";

export const metadata = { title: "Budgets" };

export default function BudgetsPage() {
  const snapshot = buildDemoSnapshot();
  const budgets = budgetUsage(snapshot);

  return (
    <AppShell title="Budgets">
      <p className="max-w-2xl text-ink-soft">
        Monat {snapshot.month} · Restbudget{" "}
        {formatEur(snapshot.totals.remainingBudgetCents)}
      </p>
      <ul className="mt-8 space-y-8">
        {budgets.map((budget) => {
          const over = budget.remainingCents < 0;
          return (
            <li key={budget.id} className="animate-rise">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold">
                    {budget.label}
                  </h2>
                  <p className="text-sm text-ink-soft">{budget.category}</p>
                </div>
                <p
                  className={`font-display text-xl font-bold ${over ? "text-danger" : "text-ink"}`}
                >
                  {formatEur(budget.remainingCents)}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist">
                <div
                  className={`h-full rounded-full ${over ? "bg-danger" : "bg-teal"}`}
                  style={{ width: `${Math.min(100, budget.ratio * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                {formatEur(budget.spentCents)} von {formatEur(budget.limitCents)}{" "}
                verbraucht
              </p>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
