export const FOUNDER_CAP = 100;
export const FOUNDER_CENTS = 1900;
export const PRO_YEAR_CENTS = 3900;
export const PRO_PERIOD_DAYS = 365;

export function formatEuroFromCents(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
