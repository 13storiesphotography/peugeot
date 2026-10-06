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
  const skewMs = 35 * 60_000;
  const results: Array<Record<string, unknown>> = [];

  for (const row of rows) {
    const meta = asMeta(row.oauth_meta);
    const needsReconnect = Boolean(meta.needsReconnect);

    if (needsReconnect) {
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
              skipped: "needsReconnect",
              healError: healed.error,
            },
      );
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
      results.push({
        userId: row.user_id,
        ok: true,
        saved: Boolean(saved),
        expiresAt: refreshed.expiresAt,
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (isPeugeotAuthFailure(raw)) {
        const healed = await healPeugeotSessionWithVault(supabase, row.user_id, {
          countryCode: row.country_code || "DE",
          email: row.mypeugeot_email,
          passwordEnc: row.mypeugeot_password_enc,
        });
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
      } else {
        results.push({ userId: row.user_id, ok: false, error: raw });
      }
    }
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
