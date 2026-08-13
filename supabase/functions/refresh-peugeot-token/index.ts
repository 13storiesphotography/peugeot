import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Keeps MyPeugeot OAuth access tokens fresh in the background.
 * Invoked every ~15 minutes by pg_cron + pg_net.
 *
 * Auth: header `x-cron-secret` must match CRON_SECRET below
 * (also stored in the pg_cron job definition).
 *
 * Important: Peugeot rotates refresh tokens on each successful refresh.
 * If we fail to read the response body after Peugeot accepted the refresh,
 * the DB still holds the old refresh token and every later attempt gets
 * invalid_grant. Always retry transient network errors; only mark
 * needsReconnect on confirmed OAuth auth failures.
 */
const CRON_SECRET = "4c25a4532d09a09981ba0d466a041fccb1a3e87603adb7f9";
const OAUTH_URL = "https://idpcvs.peugeot.com/am/oauth2/access_token";
const CLIENT_ID = "1eebc2d5-5df3-459b-a624-20abfcf82530";
const CLIENT_SECRET = "T5tP7iS0cO8sC0lA2iE2aR7gK6uE5rF3lJ8pC3nO1pR7tL8vU1";
const BASIC = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

type Conn = {
  user_id: string;
  country_code: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  oauth_meta: Record<string, unknown> | null;
};

function asMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isTransientNetworkError(message: string): boolean {
  return /error reading a body|connection|network|timed?\s*out|fetch failed|ECONNRESET|socket/i.test(
    message,
  );
}

function isConfirmedAuthFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid_grant") ||
    lower.includes("grant invalid") ||
    lower.includes("invalid grant") ||
    (lower.includes("refresh token") && lower.includes("expired")) ||
    lower.includes("token has expired")
  );
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function refreshTokenOnce(refreshToken: string) {
  const url = new URL(OAUTH_URL);
  url.searchParams.set("grant_type", "refresh_token");
  url.searchParams.set("refresh_token", refreshToken);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${BASIC}`,
    },
  });
  const data = await res.json();
  if (!res.ok || !data?.access_token) {
    const msg =
      [data?.error, data?.error_description].filter(Boolean).join(" ") ||
      `refresh failed (${res.status})`;
    throw new Error(String(msg));
  }
  const expiresIn = Number(data.expires_in ?? 3600);
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token ?? refreshToken),
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/** Retry transient TLS/body failures — Peugeot may already have rotated. */
async function refreshToken(refreshToken: string) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await refreshTokenOnce(refreshToken);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!isTransientNetworkError(lastError.message) || attempt === 3) {
        throw lastError;
      }
      await sleep(800 * attempt);
    }
  }
  throw lastError ?? new Error("Token-Refresh fehlgeschlagen");
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-cron-secret") ?? "";
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rows, error } = await supabase
    .from("peugeot_connections")
    .select(
      "user_id, country_code, access_token, refresh_token, token_expires_at, oauth_meta",
    )
    .eq("connected", true)
    .not("refresh_token", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];
  // Access tokens last ~60 min. Refresh when <35 min remain so a missed
  // cron tick cannot leave us past expiry.
  const skewMs = 35 * 60_000;

  for (const row of (rows ?? []) as Conn[]) {
    const meta = asMeta(row.oauth_meta);
    if (meta.needsReconnect) {
      results.push({ userId: row.user_id, skipped: "needsReconnect" });
      continue;
    }
    if (!row.refresh_token) {
      results.push({ userId: row.user_id, skipped: "noRefreshToken" });
      continue;
    }

    const expiresAt = row.token_expires_at
      ? new Date(row.token_expires_at).getTime()
      : 0;
    if (expiresAt > Date.now() + skewMs) {
      results.push({
        userId: row.user_id,
        skipped: "stillFresh",
        expiresAt: row.token_expires_at,
      });
      continue;
    }

    try {
      const refreshed = await refreshToken(row.refresh_token);
      const { error: updateError } = await supabase
        .from("peugeot_connections")
        .update({
          access_token: refreshed.accessToken,
          refresh_token: refreshed.refreshToken,
          token_expires_at: refreshed.expiresAt,
          oauth_meta: { ...meta, needsReconnect: false, authError: null },
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id)
        .eq("refresh_token", row.refresh_token);

      if (updateError) throw new Error(updateError.message);
      results.push({
        userId: row.user_id,
        ok: true,
        expiresAt: refreshed.expiresAt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isConfirmedAuthFailure(message)) {
        await supabase
          .from("peugeot_connections")
          .update({
            oauth_meta: {
              ...meta,
              needsReconnect: true,
              authError:
                "MyPeugeot-Anmeldung abgelaufen. Bitte unter Einstellungen neu verbinden.",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", row.user_id);
      }
      results.push({
        userId: row.user_id,
        ok: false,
        error: message,
        transient: isTransientNetworkError(message),
      });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, at: new Date().toISOString(), results }),
    { headers: { "Content-Type": "application/json" } },
  );
});
