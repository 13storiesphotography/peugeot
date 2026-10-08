import {
  humanizePeugeotOAuthError,
  isPeugeotAuthFailure,
  refreshAccessToken,
} from "@/lib/stellantis/api";
import { healPeugeotSessionWithVault } from "@/lib/stellantis/session-heal";
import {
  assertCronRequestAuth,
  requireCronSecret,
} from "@/lib/auth/cron-secret";
import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ConnRow = {
  user_id: string;
  country_code: string;
  mypeugeot_email: string | null;
  mypeugeot_password_enc: string | null;
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

/** Refresh when under this much lifetime remains (~access tokens are ~1h). */
const SKEW_MS = 50 * 60_000;
/** Also rotate at least this often so idle refresh tokens stay warm. */
const MAX_REFRESH_AGE_MS = 40 * 60_000;
/** Captcha heal backoff after a failed vault login. */
const HEAL_BACKOFF_MS = 6 * 60 * 60_000;

async function run(request: Request) {
  if (!assertCronRequestAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = requireCronSecret();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url || !getServiceRoleKey()) {
    return Response.json(
      { error: "Supabase service role nicht konfiguriert" },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "cron_peugeot_connections_for_refresh",
    { p_secret: cronSecret },
  );
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as ConnRow[];
  const results: Array<Record<string, unknown>> = [];
  const now = Date.now();

  for (const row of rows) {
    const meta = asMeta(row.oauth_meta);
    const needsReconnect = Boolean(meta.needsReconnect);
    const expiresAt = row.token_expires_at
      ? new Date(row.token_expires_at).getTime()
      : 0;
    const lastRefreshedMs = meta.lastRefreshedAt
      ? new Date(String(meta.lastRefreshedAt)).getTime()
      : 0;
    const refreshStale =
      !lastRefreshedMs || now - lastRefreshedMs > MAX_REFRESH_AGE_MS;
    const nearExpiry = !expiresAt || expiresAt <= now + SKEW_MS;

    if (row.refresh_token && !needsReconnect && !nearExpiry && !refreshStale) {
      results.push({
        userId: row.user_id,
        skipped: "stillFresh",
        expiresAt: row.token_expires_at,
      });
      continue;
    }

    // Prefer refresh_token keepalive — even when needsReconnect was set.
    if (row.refresh_token) {
      try {
        const refreshed = await refreshAccessToken(
          row.country_code || "DE",
          row.refresh_token,
        );
        const { data: saved, error: saveError } = await supabase.rpc(
          "cron_save_peugeot_tokens",
          {
            p_secret: cronSecret,
            p_user_id: row.user_id,
            p_access_token: refreshed.accessToken,
            p_refresh_token: refreshed.refreshToken,
            p_token_expires_at: refreshed.expiresAt,
            p_expected_refresh_token: row.refresh_token,
          },
        );
        if (saveError) throw new Error(saveError.message);

        await supabase
          .from("peugeot_connections")
          .update({
            oauth_meta: {
              ...meta,
              needsReconnect: false,
              authError: null,
              lastRefreshedAt: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", row.user_id);

        results.push({
          userId: row.user_id,
          ok: true,
          saved: Boolean(saved),
          clearedReconnect: needsReconnect,
          expiresAt: refreshed.expiresAt,
        });
        continue;
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        if (!isPeugeotAuthFailure(raw)) {
          results.push({
            userId: row.user_id,
            ok: false,
            error: raw,
            transient: true,
          });
          continue;
        }

        // Confirmed dead refresh token → heal (with backoff) or mark reconnect.
        const lastHealMs = meta.lastHealAttemptAt
          ? new Date(String(meta.lastHealAttemptAt)).getTime()
          : 0;
        const healDue = !lastHealMs || now - lastHealMs >= HEAL_BACKOFF_MS;

        if (
          healDue &&
          row.mypeugeot_email &&
          row.mypeugeot_password_enc
        ) {
          await supabase
            .from("peugeot_connections")
            .update({
              oauth_meta: {
                ...meta,
                lastHealAttemptAt: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", row.user_id);

          const healed = await healPeugeotSessionWithVault(
            supabase,
            row.user_id,
            {
              countryCode: row.country_code || "DE",
              email: row.mypeugeot_email,
              passwordEnc: row.mypeugeot_password_enc,
            },
          );
          if (healed.ok) {
            results.push({ userId: row.user_id, ok: true, healed: true });
            continue;
          }
          await supabase.rpc("cron_mark_peugeot_reconnect", {
            p_secret: cronSecret,
            p_user_id: row.user_id,
            p_auth_error: humanizePeugeotOAuthError(raw),
          });
          results.push({
            userId: row.user_id,
            ok: false,
            error: raw,
            healError: healed.error,
          });
          continue;
        }

        if (!needsReconnect) {
          await supabase.rpc("cron_mark_peugeot_reconnect", {
            p_secret: cronSecret,
            p_user_id: row.user_id,
            p_auth_error: humanizePeugeotOAuthError(raw),
          });
        }
        results.push({
          userId: row.user_id,
          ok: false,
          error: raw,
          skipped: healDue ? "needsReconnect" : "healBackoff",
        });
        continue;
      }
    }

    // No refresh token — optional heal / skip.
    const lastHealMs = meta.lastHealAttemptAt
      ? new Date(String(meta.lastHealAttemptAt)).getTime()
      : 0;
    const healDue = !lastHealMs || now - lastHealMs >= HEAL_BACKOFF_MS;
    if (
      healDue &&
      row.mypeugeot_email &&
      row.mypeugeot_password_enc
    ) {
      await supabase
        .from("peugeot_connections")
        .update({
          oauth_meta: {
            ...meta,
            lastHealAttemptAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id);
      const healed = await healPeugeotSessionWithVault(supabase, row.user_id, {
        countryCode: row.country_code || "DE",
        email: row.mypeugeot_email,
        passwordEnc: row.mypeugeot_password_enc,
      });
      results.push(
        healed.ok
          ? { userId: row.user_id, ok: true, healed: true }
          : {
              userId: row.user_id,
              ok: false,
              skipped: "noRefreshToken",
              healError: healed.error,
            },
      );
      continue;
    }

    results.push({
      userId: row.user_id,
      skipped: row.refresh_token ? "healBackoff" : "noRefreshToken",
    });
  }

  return Response.json({
    ok: true,
    at: new Date().toISOString(),
    results,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
