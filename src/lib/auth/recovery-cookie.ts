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

/** Expire both the httpOnly gate cookie and the browser-set copy. */
export function expireRecoveryCookies(setCookie: (cookie: string) => void) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  setCookie(
    `${RECOVERY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secure}`,
  );
  setCookie(`${RECOVERY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`);
}

export function markPasswordRecoveryInBrowser() {
  if (typeof document === "undefined") return;
  document.cookie = `${RECOVERY_COOKIE}=1; Path=/; Max-Age=3600; SameSite=Lax`;
}

export function clearPasswordRecoveryInBrowser() {
  if (typeof document === "undefined") return;
  document.cookie = `${RECOVERY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
