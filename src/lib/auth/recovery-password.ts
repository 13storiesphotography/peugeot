import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import type { EmailOtpType } from "@supabase/supabase-js";

type AuthUserRef = { id: string; email?: string };

type VerifyOk = {
  user: AuthUserRef;
  accessToken: string;
};

function authConfig(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "").trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !anon) return null;
  return { url, anon };
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
    headers: {
      apikey: config.anon,
      Authorization: `Bearer ${config.anon}`,
      "Content-Type": "application/json",
    },
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
  const userId = typeof userObj?.id === "string" ? userObj.id : "";
  const email = typeof userObj?.email === "string" ? userObj.email : undefined;
  const accessToken =
    typeof record.access_token === "string" ? record.access_token : "";

  if (!res.ok || !userId || !accessToken) {
    return { error: messageFromBody(body, "invalid") };
  }
  return { user: { id: userId, email }, accessToken };
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
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) return null;
  const email = typeof record.email === "string" ? record.email : undefined;
  return { id, email };
}

export async function setPasswordCookieFree(options: {
  userId: string;
  password: string;
  accessToken?: string;
}): Promise<{ message: string; status?: number } | null> {
  if (getServiceRoleKey()) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(options.userId, {
      password: options.password,
    });
    if (!error) return null;
    return { message: error.message, status: error.status };
  }

  const config = authConfig();
  if (!config || !options.accessToken) {
    return { message: "session missing", status: 401 };
  }

  const res = await fetch(`${config.url}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: config.anon,
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: options.password }),
  });
  if (res.ok) return null;
  const body: unknown = await res.json().catch(() => null);
  return {
    message: messageFromBody(body, res.statusText),
    status: res.status,
  };
}
