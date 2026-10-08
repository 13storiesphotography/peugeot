import { exchangeAuthorizationCode } from "@/lib/stellantis/api";
import { decryptPeugeotPassword } from "@/lib/stellantis/credential-vault";
import { capturePeugeotOAuthCode } from "@/lib/stellantis/oauth-auto-login";
import { capturePeugeotOAuthCodeRemote } from "@/lib/stellantis/oauth-remote";
import { peugeotConnections } from "@/lib/supabase/peugeot-connections";

/**
 * Re-login using the encrypted password vault when Peugeot returns invalid_grant.
 * Prefers on-server Puppeteer; optional STELLOAUTH_URL only as explicit fallback.
 */
export async function healPeugeotSessionWithVault(
  _supabase: unknown,
  userId: string,
  input: {
    countryCode: string;
    email: string | null | undefined;
    passwordEnc: string | null | undefined;
  },
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const email = input.email?.trim();
  const password = input.passwordEnc
    ? decryptPeugeotPassword(input.passwordEnc)
    : null;
  if (!email || !password) {
    return {
      ok: false,
      error:
        "Automatische Erneuerung nicht möglich — bitte einmalig mit E-Mail und Passwort verbinden.",
    };
  }

  const countryCode = input.countryCode || "DE";
  let captured = await capturePeugeotOAuthCode({
    countryCode,
    email,
    password,
  });
  if (!captured.ok) {
    const remote = await capturePeugeotOAuthCodeRemote({
      countryCode,
      email,
      password,
      timeoutMs: 80_000,
    });
    if (!remote.ok) {
      return {
        ok: false,
        error: captured.error || remote.error,
      };
    }
    captured = remote;
  }

  const tokens = await exchangeAuthorizationCode(countryCode, captured.code);

  const { data: existing } = await peugeotConnections()
    .select("oauth_meta")
    .eq("user_id", userId)
    .maybeSingle();
  const meta =
    existing?.oauth_meta &&
    typeof existing.oauth_meta === "object" &&
    !Array.isArray(existing.oauth_meta)
      ? (existing.oauth_meta as Record<string, unknown>)
      : {};

  const { error } = await peugeotConnections()
    .update({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: tokens.expiresAt,
      mypeugeot_email: email,
      oauth_meta: {
        ...meta,
        needsReconnect: false,
        authError: null,
        lastHealedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, accessToken: tokens.accessToken };
}
