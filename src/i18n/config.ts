export const LOCALES = ["de", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "pc_locale";

export const DACH_COUNTRIES = new Set(["DE", "AT", "CH", "LI", "LU"]);

export function isLocale(value: unknown): value is Locale {
  return value === "de" || value === "en";
}

export function localeCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };
}
