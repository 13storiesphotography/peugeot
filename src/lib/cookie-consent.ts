/** localStorage key — must stay in sync with Datenschutz copy. */
export const COOKIE_CONSENT_KEY = "pc_cookie_consent";

export type CookieConsentValue = "accepted" | "rejected";

export const COOKIE_CONSENT_EVENT = "pc-cookie-consent";

export function readCookieConsent(): CookieConsentValue | null {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === "accepted" || value === "rejected") return value;
  } catch {
    // localStorage may be blocked
  }
  return null;
}

export function writeCookieConsent(value: CookieConsentValue) {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }),
    );
  }
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent() === "accepted";
}
