"use server";

import { redirect } from "next/navigation";
import { requireDemoSession } from "@/lib/auth/demo-session";
import {
  clearBankSession,
  getBankSession,
  setBankSession,
} from "@/lib/banking/session";
import { getBankingConfig, buildConsentUrl } from "@/lib/banking/open-banking";

export async function connectDemoBank() {
  await requireDemoSession();
  const now = new Date().toISOString();
  await setBankSession({
    connected: true,
    provider: "mock",
    bankLabel: "Sparkasse Demo",
    accountsLinked: 2,
    lastSyncAt: now,
    connectedAt: now,
  });
  redirect("/connect?connected=1");
}

export async function syncDemoBank() {
  await requireDemoSession();
  const current = await getBankSession();
  if (!current.connected) {
    redirect("/connect");
  }
  await setBankSession({
    ...current,
    lastSyncAt: new Date().toISOString(),
  });
  redirect("/connect?synced=1");
}

export async function disconnectDemoBank() {
  await requireDemoSession();
  await clearBankSession();
  redirect("/connect?disconnected=1");
}

export async function startLiveConsent(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  await requireDemoSession();
  const config = getBankingConfig();
  if (!config.enabled || !config.clientIdConfigured) {
    return {
      ok: false,
      error: "Live Open Banking ist nicht konfiguriert.",
    };
  }
  const consent = buildConsentUrl(crypto.randomUUID());
  if (!consent.ok || !consent.url) {
    return { ok: false, error: consent.error ?? "Consent-URL fehlt" };
  }
  return { ok: true, url: consent.url };
}
