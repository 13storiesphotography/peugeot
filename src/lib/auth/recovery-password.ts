import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import type { EmailOtpType } from "@supabase/supabase-js";

export type AuthUserRef = { id: string; email?: string };

type VerifyOk = {
  user: AuthUserRef;
  accessToken: string;
};

export type PasswordSetError = {
  message: string;
  status?: number;
  code?: string;
};

function authConfig(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "").trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !anon) return null;
  return { url, anon };
}

function authHeaders(config: { anon: string }, accessToken?: string) {
  return {
    apikey: config.anon,
    Authorization: `Bearer ${accessToken || config.anon}`,
    "Content-Type": "application/json",
  };
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  for (const key of ["error_description", "msg", "message", "error"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function userFromRecord(record: Record<string, unknown>): AuthUserRef | null {
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) return null;
  const email = typeof record.email === "string" ? record.email : undefined;
  return { id, email };
}

/**
 * Confirm a recovery `token_hash` without touching Auth cookies.
 * Cookie adapters in Server Actions / iOS Safari often drop the session
 * immediately after verify, which looked like “Sitzung abgelaufen”.
 */
export async function verifyRecoveryTokenHash(
  tokenHash: string,
  type: EmailOtpType,
): Promise<VerifyOk | { error: string }> {
  const config = authConfig();
  if (!config) return { error: "Auth is not configured." };

  const res = await fetch(`${config.url}/auth/v1/verify`, {
    method: "POST",
    headers: authHeaders(config),
    body: JSON.stringify({ type, token_hash: tokenHash }),
  });
  const body: unknown = await res.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const userRaw = record.user;
  const userObj =
    userRaw && typeof userRaw === "object"
      ? (userRaw as Record<string, unknown>)
      : typeof record.id === "string"
        ? record
        : null;
  const user = userObj ? userFromRecord(userObj) : null;
  const accessToken =
    typeof record.access_token === "string" ? record.access_token : "";

  if (!res.ok || !user || !accessToken) {
    return { error: messageFromBody(body, "invalid") };
  }
  return { user, accessToken };
}

export async function getUserWithAccessToken(
  accessToken: string,
): Promise<AuthUserRef | null> {
  const config = authConfig();
  if (!config) return null;

  const res = await fetch(`${config.url}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: config.anon,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  const body: unknown = await res.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return userFromRecord(record);
}

/** Set password via service role when available (no AAL2 / MFA needed). */
export async function setPasswordCookieFree(options: {
  userId: string;
  password: string;
  accessToken?: string;
}): Promise<PasswordSetError | null> {
  if (getServiceRoleKey()) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(options.userId, {
      password: options.password,
    });
    if (!error) return null;
    return { message: error.message, status: error.status, code: error.code };
  }

  const config = authConfig();
  if (!config || !options.accessToken) {
    return { message: "session missing", status: 401 };
  }

  const res = await fetch(`${config.url}/auth/v1/user`, {
    method: "PUT",
    headers: authHeaders(config, options.accessToken),
    body: JSON.stringify({ password: options.password }),
  });
  if (res.ok) return null;
  const body: unknown = await res.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = typeof record.error_code === "string" ? record.error_code : undefined;
  return {
    message: messageFromBody(body, res.statusText),
    status: res.status,
    code,
  };
}
