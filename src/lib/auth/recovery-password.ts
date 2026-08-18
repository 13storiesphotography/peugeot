import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import type { EmailOtpType } from "@supabase/supabase-js";

export type AuthUserRef = { id: string; email?: string; totpFactorId?: string };

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

export function isInsufficientAal(error: PasswordSetError): boolean {
  const msg = error.message.toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    code === "insufficient_aal" ||
    msg.includes("insufficient_aal") ||
    msg.includes("aal2 session") ||
    (error.status === 401 && msg.includes("aal"))
  );
}

function totpFactorIdFromUser(record: Record<string, unknown>): string | undefined {
  const factors = record.factors;
  if (!Array.isArray(factors)) return undefined;
  for (const factor of factors) {
    if (!factor || typeof factor !== "object") continue;
    const row = factor as Record<string, unknown>;
    if (row.status === "verified" && row.factor_type === "totp" && typeof row.id === "string") {
      return row.id;
    }
  }
  return undefined;
}

function userFromRecord(record: Record<string, unknown>): AuthUserRef | null {
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) return null;
  const email = typeof record.email === "string" ? record.email : undefined;
  return { id, email, totpFactorId: totpFactorIdFromUser(record) };
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

/** Raise a recovery session from AAL1 to AAL2 with the authenticator code. */
export async function elevateMfaSession(
  accessToken: string,
  totpCode: string,
): Promise<{ accessToken: string } | { error: string }> {
  const config = authConfig();
  if (!config) return { error: "Auth is not configured." };

  const code = totpCode.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { error: "Bitte einen 6-stelligen Code aus der Authenticator-App eingeben." };
  }

  const user = await getUserWithAccessToken(accessToken);
  const factorId = user?.totpFactorId;
  if (!factorId) {
    return { error: "Kein aktiver Authenticator gefunden." };
  }

  const challengeRes = await fetch(
    `${config.url}/auth/v1/factors/${factorId}/challenge`,
    { method: "POST", headers: authHeaders(config, accessToken), body: "{}" },
  );
  const challengeBody: unknown = await challengeRes.json().catch(() => null);
  const challengeRecord =
    challengeBody && typeof challengeBody === "object"
      ? (challengeBody as Record<string, unknown>)
      : {};
  const challengeId =
    typeof challengeRecord.id === "string" ? challengeRecord.id : "";
  if (!challengeRes.ok || !challengeId) {
    return { error: messageFromBody(challengeBody, "MFA-Challenge fehlgeschlagen.") };
  }

  const verifyRes = await fetch(
    `${config.url}/auth/v1/factors/${factorId}/verify`,
    {
      method: "POST",
      headers: authHeaders(config, accessToken),
      body: JSON.stringify({ challenge_id: challengeId, code }),
    },
  );
  const verifyBody: unknown = await verifyRes.json().catch(() => null);
  const verifyRecord =
    verifyBody && typeof verifyBody === "object"
      ? (verifyBody as Record<string, unknown>)
      : {};
  const nextToken =
    typeof verifyRecord.access_token === "string" ? verifyRecord.access_token : "";
  if (!verifyRes.ok || !nextToken) {
    return { error: "Authenticator-Code ungültig. Bitte erneut versuchen." };
  }
  return { accessToken: nextToken };
}

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
