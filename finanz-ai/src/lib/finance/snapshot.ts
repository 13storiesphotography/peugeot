import {
  DEMO_ACCOUNTS,
  DEMO_BUDGETS,
  DEMO_TRANSACTIONS,
  SAFETY_BUFFER_CENTS,
} from "./demo-data";
import { currentMonthKey } from "./money";
import type { AffordabilityResult, FinanceSnapshot, Transaction } from "./types";

const FIXED_CATEGORIES = new Set<Transaction["category"]>([
  "housing",
  "insurance",
  "subscriptions",
]);

export function buildDemoSnapshot(now = new Date()): FinanceSnapshot {
  const month = currentMonthKey(now);
  const monthTx = DEMO_TRANSACTIONS.filter((tx) => tx.bookedAt.startsWith(month));

  const incomeThisMonthCents = sum(
    monthTx.filter((tx) => tx.amountCents > 0 && tx.category === "income"),
  );
  const spentThisMonthCents = Math.abs(
    sum(monthTx.filter((tx) => tx.amountCents < 0 && tx.category !== "transfer")),
  );
  const fixedCostsCents = Math.abs(
    sum(monthTx.filter((tx) => tx.amountCents < 0 && FIXED_CATEGORIES.has(tx.category))),
  );
  const budgetSpent = DEMO_BUDGETS.reduce((acc, budget) => {
    const used = Math.abs(
      sum(
        monthTx.filter(
          (tx) => tx.category === budget.category && tx.amountCents < 0,
        ),
      ),
    );
    return acc + Math.min(used, budget.limitCents);
  }, 0);
  const budgetLimits = DEMO_BUDGETS.reduce((acc, b) => acc + b.limitCents, 0);
  const remainingBudgetCents = Math.max(0, budgetLimits - budgetSpent);

  const balanceCents = DEMO_ACCOUNTS.reduce((acc, a) => acc + a.balanceCents, 0);
  const freeCashCents = Math.max(
    0,
    incomeThisMonthCents - fixedCostsCents - (spentThisMonthCents - fixedCostsCents),
  );

  return {
    asOf: now.toISOString(),
    month,
    accounts: DEMO_ACCOUNTS,
    transactions: [...DEMO_TRANSACTIONS].sort((a, b) =>
      b.bookedAt.localeCompare(a.bookedAt),
    ),
    budgets: DEMO_BUDGETS,
    totals: {
      balanceCents,
      incomeThisMonthCents,
      spentThisMonthCents,
      remainingBudgetCents,
      fixedCostsCents,
      freeCashCents,
      safetyBufferCents: SAFETY_BUFFER_CENTS,
    },
  };
}

export function assessAffordability(
  snapshot: FinanceSnapshot,
  itemLabel: string,
  priceCents: number,
): AffordabilityResult {
  const liquidGiro =
    snapshot.accounts.find((a) => a.id === "acc_giro")?.balanceCents ?? 0;
  const spendableNow = Math.max(
    0,
    Math.min(snapshot.totals.freeCashCents, liquidGiro - snapshot.totals.safetyBufferCents),
  );

  const canAffordNow = priceCents <= spendableNow;
  const shortfallCents = canAffordNow ? 0 : priceCents - spendableNow;
  const monthlySaveNeededCents = canAffordNow
    ? 0
    : Math.ceil(shortfallCents / Math.max(1, monthsHint(priceCents, spendableNow)));
  const monthsToSave = canAffordNow
    ? 0
    : Math.max(1, Math.ceil(shortfallCents / Math.max(monthlySaveCapacity(snapshot), 1)));

  const rationale = canAffordNow
    ? `Nach Fixkosten und Sicherheitsreserve bleiben ca. ${eur(spendableNow)} frei. ${itemLabel} für ${eur(priceCents)} passt in diesen Monat.`
    : `Frei verfügbar sind ca. ${eur(spendableNow)} (inkl. Reserve ${eur(snapshot.totals.safetyBufferCents)}). Für ${itemLabel} fehlen ${eur(shortfallCents)}. Mit einer Sparrate von ca. ${eur(Math.ceil(shortfallCents / monthsToSave))} über ${monthsToSave} Monat(e) erreichst du den Betrag.`;

  return {
    itemLabel,
    priceCents,
    canAffordNow,
    freeCashCents: spendableNow,
    shortfallCents,
    monthsToSave,
    monthlySaveNeededCents: canAffordNow
      ? 0
      : Math.ceil(shortfallCents / monthsToSave),
    rationale,
  };
}

export function budgetUsage(snapshot: FinanceSnapshot) {
  return snapshot.budgets.map((budget) => {
    const spent = Math.abs(
      sum(
        snapshot.transactions.filter(
          (tx) =>
            tx.bookedAt.startsWith(snapshot.month) &&
            tx.category === budget.category &&
            tx.amountCents < 0,
        ),
      ),
    );
    return {
      ...budget,
      spentCents: spent,
      remainingCents: budget.limitCents - spent,
      ratio: budget.limitCents === 0 ? 0 : spent / budget.limitCents,
    };
  });
}

function sum(txs: Transaction[]): number {
  return txs.reduce((acc, tx) => acc + tx.amountCents, 0);
}

function monthlySaveCapacity(snapshot: FinanceSnapshot): number {
  return Math.max(5_000, Math.floor(snapshot.totals.freeCashCents * 0.35));
}

function monthsHint(priceCents: number, spendableNow: number): number {
  const gap = Math.max(0, priceCents - spendableNow);
  if (gap <= 50_00) return 1;
  if (gap <= 200_00) return 2;
  return 3;
}

function eur(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
