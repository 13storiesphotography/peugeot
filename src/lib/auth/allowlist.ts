/**
 * Only these emails may use the app.
 * Comma-separated override via ALLOWED_EMAILS env (lowercase matched).
 */
const DEFAULT_ALLOWED = ["florian@tutzinger-knolls.de"];

export function getAllowedEmails(): string[] {
  const fromEnv = process.env.ALLOWED_EMAILS;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED.map((e) => e.toLowerCase());
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowedEmails().includes(email.trim().toLowerCase());
}
