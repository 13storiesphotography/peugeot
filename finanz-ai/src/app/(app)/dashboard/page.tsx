import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { budgetUsage, buildDemoSnapshot } from "@/lib/finance/snapshot";
import { formatEur } from "@/lib/finance/money";
import { getBankSession } from "@/lib/banking/session";
import { getSavingsGoals } from "@/lib/finance/goals";

export const metadata = { title: "Überblick" };

export default async function DashboardPage() {
  const snapshot = buildDemoSnapshot();
  const budgets = budgetUsage(snapshot).slice(0, 3);
  const bank = await getBankSession();
  const goals = await getSavingsGoals();

  return (
    <AppShell title="Überblick">
      <section className="animate-rise">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-ink-soft">
          {bank.connected ? `${bank.bankLabel} · verbunden` : "Sparkasse Demo"} ·{" "}
          {snapshot.month}
        </p>
        <p className="mt-3 font-display text-5xl font-extrabold text-ink md:text-6xl">
          {formatEur(snapshot.totals.balanceCents)}
        </p>
        <p className="mt-2 text-ink-soft">
          Frei diesen Monat ca.{" "}
          <span className="font-semibold text-teal">
            {formatEur(snapshot.totals.freeCashCents)}
          </span>{" "}
          · Reserve {formatEur(snapshot.totals.safetyBufferCents)}
        </p>
      </section>

      <section className="animate-rise-delay-1 mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["Einkommen", formatEur(snapshot.totals.incomeThisMonthCents)],
          ["Ausgaben", formatEur(snapshot.totals.spentThisMonthCents)],
          ["Fixkosten", formatEur(snapshot.totals.fixedCostsCents)],
        ].map(([label, value]) => (
          <div key={label} className="border-t border-[#10253a]/15 pt-4">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      {goals.length > 0 && (
        <section className="mt-12 animate-rise-delay-2">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-bold">Sparziele</h2>
            <Link href="/goals" className="text-sm font-semibold text-teal">
              Alle
            </Link>
          </div>
          <ul className="mt-4 space-y-4">
            {goals.slice(0, 2).map((goal) => {
              const ratio =
                goal.targetCents === 0
                  ? 0
                  : goal.savedCents / goal.targetCents;
              return (
                <li key={goal.id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{goal.label}</span>
                    <span className="text-ink-soft">
                      {formatEur(goal.savedCents)} /{" "}
                      {formatEur(goal.targetCents)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist">
                    <div
                      className="h-full rounded-full bg-teal"
                      style={{ width: `${Math.min(100, ratio * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="animate-rise-delay-2 mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-bold">Konten</h2>
          <Link href="/connect" className="text-sm font-semibold text-teal">
            {bank.connected ? "Bank verwalten" : "Bank verbinden"}
          </Link>
        </div>
        <ul className="mt-4 space-y-4">
          {snapshot.accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-4 border-b border-[#10253a]/10 pb-4"
            >
              <div>
                <p className="font-semibold text-ink">{account.name}</p>
                <p className="text-sm text-ink-soft">
                  {account.bankName} · {account.ibanMasked}
                </p>
              </div>
              <p className="font-display text-xl font-bold">
                {formatEur(account.balanceCents)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-bold">Letzte Umsätze</h2>
          <Link
            href="/transactions"
            className="text-sm font-semibold text-teal"
          >
            Alle
          </Link>
        </div>
        <ul className="mt-4 space-y-3">
          {snapshot.transactions.slice(0, 5).map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="truncate text-ink-soft">
                {tx.bookedAt} · {tx.counterparty}
              </span>
              <span
                className={`shrink-0 font-semibold ${
                  tx.amountCents >= 0 ? "text-teal" : "text-ink"
                }`}
              >
                {formatEur(tx.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-bold">Budgets</h2>
          <Link href="/budgets" className="text-sm font-semibold text-teal">
            Alle
          </Link>
        </div>
        <ul className="mt-4 space-y-5">
          {budgets.map((budget) => (
            <li key={budget.id}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{budget.label}</span>
                <span className="text-ink-soft">
                  {formatEur(budget.spentCents)} / {formatEur(budget.limitCents)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist">
                <div
                  className="h-full rounded-full bg-teal transition-all duration-700"
                  style={{ width: `${Math.min(100, budget.ratio * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-md bg-ink px-5 py-6 text-white">
        <h2 className="font-display text-xl font-bold">AI fragen</h2>
        <p className="mt-2 text-white/75">
          „Kann ich mir den Schrank für 799 € leisten?“
        </p>
        <Link
          href="/chat"
          className="mt-4 inline-flex rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-deep"
        >
          Zum Assistenten
        </Link>
      </section>
    </AppShell>
  );
}
