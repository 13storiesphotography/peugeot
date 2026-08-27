import { getAllowedEmails } from "@/lib/auth/allowlist";

/**
 * Owner/admin gate — ignores PUBLIC_SIGNUP.
 * Only ALLOWED_EMAILS (or the default owner list) may open /control/stats.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return getAllowedEmails().includes(email.trim().toLowerCase());
}
