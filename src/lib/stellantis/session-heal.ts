import type { SupabaseClient } from "@supabase/supabase-js";
import { exchangeAuthorizationCode } from "@/lib/stellantis/api";
import { decryptPeugeotPassword } from "@/lib/stellantis/credential-vault";
import { capturePeugeotOAuthCodeRemote } from "@/lib/stellantis/oauth-remote";

/**
 * Re-login via community OAuth helper using the encrypted password vault.
 * Used when Peugeot returns invalid_grant for the refresh token.
 */
export async function healPeugeotSessionWithVault(
  supabase: SupabaseClient,
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

  const captured = await capturePeugeotOAuthCodeRemote({
    countryCode: input.countryCode || "DE",
    email,
    password,
    timeoutMs: 80_000,
  });
  if (!captured.ok) {
    return { ok: false, error: captured.error };
  }

  const tokens = await exchangeAuthorizationCode(
    input.countryCode || "DE",
    captured.code,
  );

  const { data: existing } = await supabase
    .from("peugeot_connections")
    .select("oauth_meta")
    .eq("user_id", userId)
    .maybeSingle();
  const meta =
    existing?.oauth_meta &&
    typeof existing.oauth_meta === "object" &&
    !Array.isArray(existing.oauth_meta)
      ? (existing.oauth_meta as Record<string, unknown>)
      : {};

  const { error } = await supabase
    .from("peugeot_connections")
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
