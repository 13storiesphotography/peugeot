import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";

/**
 * Sync helper for callers that still expect an env-backed secret.
 * Prefer resolveCronRpcSecret() in cron routes.
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

function extractProvidedSecret(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const custom = (request.headers.get("x-cron-secret") ?? "").trim();
  return bearer || custom;
}

async function readRuntimeConfig(key: string): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !getServiceRoleKey()) {
    return null;
  }
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("app_runtime_config")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    const value = typeof data?.value === "string" ? data.value.trim() : "";
    return value.length >= 24 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Secret for SECURITY DEFINER cron_* RPCs.
 * Vercel CRON_SECRET first, then app_runtime_config.cron_rpc_secret.
 */
export async function resolveCronRpcSecret(): Promise<string> {
  const envSecret = process.env.CRON_SECRET?.trim();
  if (envSecret && envSecret.length >= 24) return envSecret;
  const dbSecret = await readRuntimeConfig("cron_rpc_secret");
  if (dbSecret) return dbSecret;
  throw new Error(
    "CRON_SECRET fehlt oder ist zu kurz (mind. 24 Zeichen in Vercel setzen).",
  );
}

/**
 * Accept Vercel CRON_SECRET and/or the HTTP secret stored for pg_cron
 * (app_runtime_config.cron_http_secret). Those can differ: RPC functions
 * use one value, Supabase net.http_post jobs another.
 */
export async function assertCronRequestAuth(
  request: Request,
): Promise<boolean> {
  const provided = extractProvidedSecret(request);
  if (!provided || provided.length < 24) return false;

  const envSecret = process.env.CRON_SECRET?.trim();
  if (envSecret && envSecret.length >= 24 && provided === envSecret) {
    return true;
  }

  const httpSecret = await readRuntimeConfig("cron_http_secret");
  if (httpSecret && provided === httpSecret) return true;

  // Legacy key name from earlier deploys.
  const legacy = await readRuntimeConfig("cron_secret");
  if (legacy && provided === legacy) return true;

  return false;
}
