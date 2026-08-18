export const RECOVERY_COOKIE = "pc_pw_recovery";

export function recoveryCookieOptions(maxAgeSec: number) {
  return {
    path: "/",
    maxAge: maxAgeSec,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export function markPasswordRecoveryInBrowser() {
  if (typeof document === "undefined") return;
  document.cookie = `${RECOVERY_COOKIE}=1; Path=/; Max-Age=3600; SameSite=Lax`;
}

export function clearPasswordRecoveryInBrowser() {
  if (typeof document === "undefined") return;
  document.cookie = `${RECOVERY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
