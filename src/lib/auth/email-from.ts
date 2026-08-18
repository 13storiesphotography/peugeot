/** Display name + address for all outbound product mail. */
export const DEFAULT_AUTH_FROM = "Peugeot Control <noreply@peugeotcontrol.app>";

export function authEmailFrom(): string {
  const raw =
    process.env.AUTH_EMAIL_FROM?.trim() ||
    process.env.SIGNUP_NOTIFY_FROM?.trim();
  if (!raw) return DEFAULT_AUTH_FROM;
  if (raw.includes("<")) return raw;
  return `Peugeot Control <${raw}>`;
}
