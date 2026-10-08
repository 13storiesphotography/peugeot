import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { budgetUsage, buildDemoSnapshot } from "@/lib/finance/snapshot";
import { formatEur } from "@/lib/finance/money";

export const metadata = { title: "Überblick" };

export default function DashboardPage() {
  const snapshot = buildDemoSnapshot();
  const budgets = budgetUsage(snapshot).slice(0, 3);

  return (
    <AppShell title="Überblick">
      <section className="animate-rise">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-ink-soft">
          Sparkasse Demo · {snapshot.month}
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

      <section className="animate-rise-delay-2 mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-bold">Konten</h2>
          <Link href="/connect" className="text-sm font-semibold text-teal">
            Bank verbinden
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
