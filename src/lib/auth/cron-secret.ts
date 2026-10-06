/**
 * Shared cron auth secret. Must be set in Vercel — no hardcoded fallback.
 */
export function requireCronSecret(): string {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 24) {
    throw new Error(
      "CRON_SECRET fehlt oder ist zu kurz (mind. 24 Zeichen in Vercel setzen).",
    );
  }
  return secret;
}

export function assertCronRequestAuth(request: Request): boolean {
  let secret: string;
  try {
    secret = requireCronSecret();
  } catch {
    return false;
  }
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const custom = request.headers.get("x-cron-secret") ?? "";
  return Boolean(bearer && bearer === secret) || Boolean(custom && custom === secret);
}
