import "server-only";
import { cookies } from "next/headers";
import { BANK_COOKIE } from "@/lib/auth/constants";
import type { BankingConnection } from "./open-banking";
import { isFinapiReady } from "./finapi/config";

export type BankSession = {
  connected: boolean;
  provider: BankingConnection["provider"];
  bankLabel: string;
  accountsLinked: number;
  lastSyncAt: string | null;
  connectedAt: string | null;
  /** Encrypted finAPI user password (AES-GCM). */
  finapiUserId?: string | null;
  finapiPasswordSealed?: string | null;
  webFormId?: string | null;
  bankConnectionId?: number | null;
};

export async function getBankSession(): Promise<BankSession> {
  const jar = await cookies();
  const raw = jar.get(BANK_COOKIE)?.value;
  if (!raw) {
    return emptySession();
  }
  try {
    const parsed = JSON.parse(raw) as BankSession;
    return {
      ...emptySession(),
      ...parsed,
      connected: Boolean(parsed.connected),
    };
  } catch {
    return emptySession();
  }
}

function emptySession(): BankSession {
  return {
    connected: false,
    provider: "mock",
    bankLabel: "Sparkasse Demo",
    accountsLinked: 0,
    lastSyncAt: null,
    connectedAt: null,
    finapiUserId: null,
    finapiPasswordSealed: null,
    webFormId: null,
    bankConnectionId: null,
  };
}

export async function setBankSession(session: BankSession) {
  const jar = await cookies();
  jar.set(BANK_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearBankSession() {
  const jar = await cookies();
  jar.delete(BANK_COOKIE);
}

export async function getConnectionView(): Promise<BankingConnection> {
  const session = await getBankSession();

  if (session.connected) {
    return {
      provider: session.provider,
      status: "connected",
      bankLabel: session.bankLabel,
      accountsLinked: session.accountsLinked,
      lastSyncAt: session.lastSyncAt,
      message:
        session.provider === "finapi"
          ? "finAPI-Verbindung aktiv. Umsätze per Sync aktualisieren."
          : "PSD2-Demo-Consent aktiv. Umsätze stammen aus dem lokalen Demo-Snapshot.",
    };
  }

  if (session.webFormId && !session.connected) {
    return {
      provider: "finapi",
      status: "pending_consent",
      bankLabel: "Sparkasse / finAPI",
      accountsLinked: 0,
      lastSyncAt: null,
      message: "Web Form läuft — Bank-Login und SCA abschließen.",
    };
  }

  if (isFinapiReady()) {
    return {
      provider: "finapi",
      status: "not_connected",
      bankLabel: "finAPI Sandbox",
      accountsLinked: 0,
      lastSyncAt: null,
      message:
        "finAPI-Credentials erkannt. Starte den Web-Form-Consent (kein Passwort-Scraping).",
    };
  }

  return {
    provider: "mock",
    status: "not_connected",
    bankLabel: "Sparkasse Demo",
    accountsLinked: 0,
    lastSyncAt: null,
    message:
      "Verbinde die Demo-Bank oder setze FINAPI_CLIENT_ID/SECRET + OPEN_BANKING_ENABLED=true.",
  };
}
