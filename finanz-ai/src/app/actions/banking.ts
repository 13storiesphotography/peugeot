"use server";

import { redirect } from "next/navigation";
import { requireDemoSession } from "@/lib/auth/demo-session";
import {
  clearBankSession,
  getBankSession,
  setBankSession,
} from "@/lib/banking/session";
import {
  beginFinapiWebForm,
  finalizeFinapiWebForm,
} from "@/lib/banking/finapi/connect";
import { fetchAccounts, fetchTransactions } from "@/lib/banking/finapi/sync";
import { open } from "@/lib/banking/vault";

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
  if (!current.connected && !current.finapiUserId) {
    redirect("/connect");
  }

  if (
    current.provider === "finapi" &&
    current.finapiUserId &&
    current.finapiPasswordSealed
  ) {
    try {
      const password = open(current.finapiPasswordSealed);
      const accounts = await fetchAccounts(current.finapiUserId, password);
      await fetchTransactions(current.finapiUserId, password);
      await setBankSession({
        ...current,
        connected: true,
        accountsLinked: accounts.length || current.accountsLinked,
        lastSyncAt: new Date().toISOString(),
        bankLabel: accounts[0]?.bankName || current.bankLabel || "finAPI Bank",
      });
      redirect("/connect?synced=1");
    } catch {
      redirect("/connect?error=sync_failed");
    }
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

export async function startFinapiWebForm() {
  await requireDemoSession();
  return beginFinapiWebForm();
}

export async function completeFinapiWebForm() {
  await requireDemoSession();
  return finalizeFinapiWebForm();
}
