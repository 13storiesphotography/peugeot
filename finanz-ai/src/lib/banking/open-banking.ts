/**
 * Open-Banking-Platzhalter (PSD2 / AISP).
 *
 * Live-Anbindung läuft über einen lizenzierten Account-Information-Service
 * (z.B. finAPI oder Tink) — niemals über Banking-Login-Scraping.
 *
 * Flow (Zielbild):
 * 1. User startet Consent in der App
 * 2. Redirect zur Bank (Sparkasse) mit SCA
 * 3. Callback mit Authorization-Code
 * 4. Backend tauscht Code gegen Access-/Refresh-Token
 * 5. Tokens verschlüsselt speichern, Umsätze periodisch syncen
 */

export type BankingProvider = "finapi" | "tink" | "mock";

export type BankingConnectionStatus =
  | "not_connected"
  | "pending_consent"
  | "connected"
  | "needs_reauth"
  | "error";

export type BankingConnection = {
  provider: BankingProvider;
  status: BankingConnectionStatus;
  bankLabel: string;
  accountsLinked: number;
  lastSyncAt: string | null;
  message: string;
};

export function getBankingConfig() {
  const provider = (process.env.OPEN_BANKING_PROVIDER ?? "mock") as BankingProvider;
  return {
    provider,
    clientIdConfigured: Boolean(process.env.OPEN_BANKING_CLIENT_ID),
    redirectUri:
      process.env.OPEN_BANKING_REDIRECT_URI ??
      "http://localhost:3000/api/banking/callback",
    enabled: process.env.OPEN_BANKING_ENABLED === "true",
  };
}

export function getMockConnection(): BankingConnection {
  const config = getBankingConfig();
  if (!config.enabled || !config.clientIdConfigured) {
    return {
      provider: "mock",
      status: "not_connected",
      bankLabel: "Sparkasse (geplant)",
      accountsLinked: 0,
      lastSyncAt: null,
      message:
        "Open Banking ist vorbereitet, aber noch nicht aktiviert. Setze OPEN_BANKING_ENABLED=true und finAPI/Tink-Credentials.",
    };
  }

  return {
    provider: config.provider,
    status: "pending_consent",
    bankLabel: "Sparkasse",
    accountsLinked: 0,
    lastSyncAt: null,
    message: "Consent-Flow bereit — Provider-Credentials erkannt.",
  };
}

/** Baut die Consent-URL. Live erst mit echten Provider-Credentials. */
export function buildConsentUrl(state: string): {
  ok: boolean;
  url?: string;
  error?: string;
} {
  const config = getBankingConfig();
  if (!config.enabled) {
    return {
      ok: false,
      error: "Open Banking ist deaktiviert (OPEN_BANKING_ENABLED).",
    };
  }
  if (!config.clientIdConfigured) {
    return {
      ok: false,
      error: "OPEN_BANKING_CLIENT_ID fehlt.",
    };
  }

  // Platzhalter — echte URL kommt vom Provider-SDK.
  const url = new URL("https://example-open-banking.invalid/oauth/authorize");
  url.searchParams.set("client_id", process.env.OPEN_BANKING_CLIENT_ID!);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "AIS");
  return { ok: true, url: url.toString() };
}
