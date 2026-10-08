import "server-only";
import { cookies } from "next/headers";
import { BANK_COOKIE } from "@/lib/auth/constants";
import type { BankingConnection } from "./open-banking";
import { getBankingConfig } from "./open-banking";

export type BankSession = {
  connected: boolean;
  provider: BankingConnection["provider"];
  bankLabel: string;
  accountsLinked: number;
  lastSyncAt: string | null;
  connectedAt: string | null;
};

export async function getBankSession(): Promise<BankSession> {
  const jar = await cookies();
  const raw = jar.get(BANK_COOKIE)?.value;
  if (!raw) {
    return {
      connected: false,
      provider: "mock",
      bankLabel: "Sparkasse Demo",
      accountsLinked: 0,
      lastSyncAt: null,
      connectedAt: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as BankSession;
    return {
      connected: Boolean(parsed.connected),
      provider: parsed.provider ?? "mock",
      bankLabel: parsed.bankLabel ?? "Sparkasse Demo",
      accountsLinked: parsed.accountsLinked ?? 0,
      lastSyncAt: parsed.lastSyncAt ?? null,
      connectedAt: parsed.connectedAt ?? null,
    };
  } catch {
    return {
      connected: false,
      provider: "mock",
      bankLabel: "Sparkasse Demo",
      accountsLinked: 0,
      lastSyncAt: null,
      connectedAt: null,
    };
  }
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
  const config = getBankingConfig();

  if (session.connected) {
    return {
      provider: session.provider,
      status: "connected",
      bankLabel: session.bankLabel,
      accountsLinked: session.accountsLinked,
      lastSyncAt: session.lastSyncAt,
      message:
        "PSD2-Demo-Consent aktiv. Umsätze stammen aus dem lokalen Demo-Snapshot (kein Live-Bankzugriff).",
    };
  }

  if (config.enabled && config.clientIdConfigured) {
    return {
      provider: config.provider,
      status: "pending_consent",
      bankLabel: "Sparkasse",
      accountsLinked: 0,
      lastSyncAt: null,
      message: "Live-Credentials erkannt — Consent-Flow kann gestartet werden.",
    };
  }

  return {
    provider: "mock",
    status: "not_connected",
    bankLabel: "Sparkasse Demo",
    accountsLinked: 0,
    lastSyncAt: null,
    message:
      "Verbinde die Demo-Bank per simuliertem SCA-Consent. Später ersetzt das finAPI/Tink.",
  };
}
