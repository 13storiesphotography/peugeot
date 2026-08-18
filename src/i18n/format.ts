import type { Locale } from "@/i18n/config";

export function intlLocale(locale: Locale): string {
  return locale === "de" ? "de-DE" : "en-GB";
}
