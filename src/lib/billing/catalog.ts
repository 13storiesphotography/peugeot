export const PRO_YEAR_CENTS = 3900;
export const PRO_MONTH_CENTS = 499;
export const PRO_YEAR_DAYS = 365;
export const PRO_MONTH_DAYS = 31;

export type BillingInterval = "month" | "year";

export function formatEuroFromCents(cents: number): string {
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function parseBillingInterval(raw: unknown): BillingInterval {
  return raw === "month" ? "month" : "year";
}

export function periodDaysForInterval(interval: BillingInterval): number {
  return interval === "month" ? PRO_MONTH_DAYS : PRO_YEAR_DAYS;
}

export function amountForInterval(interval: BillingInterval): number {
  return interval === "month" ? PRO_MONTH_CENTS : PRO_YEAR_CENTS;
}

/** What 12 months would cost at the monthly price. */
export const PRO_YEAR_IF_MONTHLY_CENTS = PRO_MONTH_CENTS * 12;

export function yearlySavingsCents(): number {
  return PRO_YEAR_IF_MONTHLY_CENTS - PRO_YEAR_CENTS;
}
