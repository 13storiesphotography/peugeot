/**
 * Access control for the app.
 *
 * - PUBLIC_SIGNUP=true → any registered Supabase user may sign in.
 * - Otherwise only ALLOWED_EMAILS (comma-separated) may access.
 */
const DEFAULT_ALLOWED = ["florian@tutzinger-knolls.de"];

export function isPublicSignupEnabled(): boolean {
  const raw = process.env.PUBLIC_SIGNUP?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

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
  if (!email?.trim()) return false;
  if (isPublicSignupEnabled()) return true;
  return getAllowedEmails().includes(email.trim().toLowerCase());
}
