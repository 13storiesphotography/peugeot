import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";
import { detectLocaleFromHeaders } from "@/i18n/detect";
import { makeTranslator, type Translator } from "@/i18n/translate";

export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  const headerStore = await headers();
  return detectLocaleFromHeaders(headerStore, jar.get(LOCALE_COOKIE)?.value);
}

export async function getTranslator(): Promise<{ locale: Locale; t: Translator }> {
  const locale = await getRequestLocale();
  return { locale, t: makeTranslator(locale) };
}

export function localeFromCookieValue(value: string | undefined): Locale | null {
  return isLocale(value) ? value : null;
}
