import {
  DACH_COUNTRIES,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
} from "@/i18n/config";

function primaryLanguage(acceptLanguage: string | null | undefined): Locale | null {
  if (!acceptLanguage) return null;
  for (const part of acceptLanguage.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase() ?? "";
    if (tag.startsWith("de")) return "de";
    if (tag.startsWith("en")) return "en";
  }
  return null;
}

function localeFromReferer(referer: string | null | undefined): Locale | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const blob = `${url.pathname}?${url.search}`.toLowerCase();
    if (/(?:^|[/?&#])(?:lang|hl|locale)=en(?:&|$)/.test(blob)) return "en";
    if (/(?:^|[/?&#])(?:lang|hl|locale)=de(?:&|$)/.test(blob)) return "de";
    if (/(?:^|\/)en(?:\/|$)/.test(url.pathname.toLowerCase())) return "en";
    if (/(?:^|\/)de(?:\/|$)/.test(url.pathname.toLowerCase())) return "de";
  } catch {
    return null;
  }
  return null;
}

function localeFromCountry(country: string | null | undefined): Locale | null {
  if (!country) return null;
  return DACH_COUNTRIES.has(country.toUpperCase()) ? "de" : "en";
}

/** Cookie (chosen or previously detected) wins, then referer, browser, geo. */
export function detectLocale(input: {
  cookie?: string | null;
  acceptLanguage?: string | null;
  country?: string | null;
  referer?: string | null;
}): Locale {
  if (isLocale(input.cookie)) return input.cookie;
  return (
    localeFromReferer(input.referer) ??
    primaryLanguage(input.acceptLanguage) ??
    localeFromCountry(input.country) ??
    DEFAULT_LOCALE
  );
}

export function detectLocaleFromHeaders(headers: Headers, cookie?: string | null): Locale {
  return detectLocale({
    cookie,
    acceptLanguage: headers.get("accept-language"),
    country:
      headers.get("x-vercel-ip-country") ??
      headers.get("cf-ipcountry") ??
      headers.get("x-country"),
    referer: headers.get("referer"),
  });
}
