import { extractOAuthCode } from "@/lib/stellantis/oauth-code";

const DEFAULT_STELLOAUTH_URL =
  process.env.STELLOAUTH_URL?.trim() || "https://stelloauth.tollet.me/oauth";

export type RemoteOAuthResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function pickCode(payload: unknown): string | null {
  const root = asRecord(payload);
  if (!root) return null;

  // Streamed wrapper: { type: "result", data: {...} }
  const data = asRecord(root.data) ?? root;

  const status = String(data.status ?? root.status ?? "").toLowerCase();
  const codeFlag = String(data.code ?? root.code ?? "");

  // Success shapes from stelloauth docs / stream
  const nested = asRecord(data.data);
  const candidates = [
    nested?.code,
    data.oauth_code,
    data.oauthCode,
    typeof data.code === "string" &&
    status === "success" &&
    codeFlag !== "OAUTH_CODE" &&
    codeFlag.length > 12
      ? data.code
      : null,
    status === "success" && nested?.code ? nested.code : null,
    root.code && String(root.code).length > 20 ? root.code : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      const extracted = extractOAuthCode(candidate);
      if (extracted && extracted.length > 8) return extracted;
    }
  }

  // Explicit success with data.code as the grant
  if (
    (status === "success" || codeFlag === "OAUTH_CODE") &&
    nested &&
    typeof nested.code === "string"
  ) {
    const extracted = extractOAuthCode(nested.code);
    if (extracted) return extracted;
  }

  return null;
}

function pickError(payload: unknown): string | null {
  const root = asRecord(payload);
  if (!root) return null;
  const data = asRecord(root.data) ?? root;
  const status = String(data.status ?? "").toLowerCase();
  const code = String(data.code ?? root.code ?? "");
  const message =
    (typeof data.message === "string" && data.message) ||
    (typeof root.message === "string" && root.message) ||
    null;

  if (status === "error" || status === "info" || /fail|error|invalid/i.test(code)) {
    if (code === "LOGIN_FAILED" || /login_failed|invalid/i.test(code)) {
      return message || "Login abgelehnt — E-Mail oder Passwort prüfen.";
    }
    return message || code || "Remote-Login fehlgeschlagen.";
  }
  if (message && /fail|error|ungültig|invalid|consent/i.test(message)) {
    return message;
  }
  return null;
}

/**
 * Community Stellantis OAuth helper (browser automation off-device).
 * Credentials are only used for this request and not stored by us.
 */
export async function capturePeugeotOAuthCodeRemote(input: {
  countryCode: string;
  email: string;
  password: string;
  timeoutMs?: number;
}): Promise<RemoteOAuthResult> {
  const email = input.email.trim();
  const password = input.password;
  const country = (input.countryCode || "DE").toUpperCase();
  const timeoutMs = input.timeoutMs ?? 90_000;

  if (!email || !password) {
    return { ok: false, error: "E-Mail und Passwort erforderlich." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(DEFAULT_STELLOAUTH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify({
        brand: "MyPeugeot",
        country,
        email,
        password,
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    if (!response.ok && !raw.trim()) {
      return {
        ok: false,
        error: `Login-Hilfe antwortete mit HTTP ${response.status}.`,
      };
    }

    // NDJSON progress stream or single JSON object
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    let lastError: string | null = null;
    let parsedAny = false;

    for (const line of lines) {
      try {
        const json = JSON.parse(line) as unknown;
        parsedAny = true;
        const code = pickCode(json);
        if (code) return { ok: true, code };
        const err = pickError(json);
        if (err) lastError = err;
      } catch {
        // ignore non-JSON chunks
      }
    }

    if (!parsedAny) {
      try {
        const json = JSON.parse(raw) as unknown;
        const code = pickCode(json);
        if (code) return { ok: true, code };
        const err = pickError(json);
        if (err) return { ok: false, error: err };
      } catch {
        /* fall through */
      }
    }

    return {
      ok: false,
      error:
        lastError ||
        "Kein OAuth-Code von der Login-Hilfe erhalten. Bitte erneut versuchen oder am Computer verbinden.",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: "Zeitüberschreitung bei der Login-Hilfe. Bitte erneut versuchen.",
      };
    }
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Login-Hilfe nicht erreichbar.",
    };
  } finally {
    clearTimeout(timer);
  }
}
