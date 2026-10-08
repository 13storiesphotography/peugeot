export type MoneyCents = number;

export type Account = {
  id: string;
  name: string;
  ibanMasked: string;
  bankName: string;
  balanceCents: MoneyCents;
  currency: "EUR";
};

export type Transaction = {
  id: string;
  accountId: string;
  bookedAt: string; // ISO date YYYY-MM-DD
  amountCents: MoneyCents; // negative = outflow
  counterparty: string;
  purpose: string;
  category:
    | "income"
    | "housing"
    | "groceries"
    | "transport"
    | "subscriptions"
    | "leisure"
    | "shopping"
    | "insurance"
    | "transfer"
    | "other";
};

export type Budget = {
  id: string;
  category: Transaction["category"];
  label: string;
  limitCents: MoneyCents;
  month: string; // YYYY-MM
};

export type FinanceSnapshot = {
  asOf: string;
  month: string;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  totals: {
    balanceCents: MoneyCents;
    incomeThisMonthCents: MoneyCents;
    spentThisMonthCents: MoneyCents;
    remainingBudgetCents: MoneyCents;
    fixedCostsCents: MoneyCents;
    freeCashCents: MoneyCents;
    safetyBufferCents: MoneyCents;
  };
};

export type AffordabilityResult = {
  itemLabel: string;
  priceCents: MoneyCents;
  canAffordNow: boolean;
  freeCashCents: MoneyCents;
  shortfallCents: MoneyCents;
  monthsToSave: number;
  monthlySaveNeededCents: MoneyCents;
  rationale: string;
};

export type SavingsGoal = {
  id: string;
  label: string;
  targetCents: MoneyCents;
  savedCents: MoneyCents;
  monthlySaveCents: MoneyCents;
  createdAt: string;
};
