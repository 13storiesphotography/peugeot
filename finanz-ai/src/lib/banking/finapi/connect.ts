import "server-only";
import { getBankSession, setBankSession } from "@/lib/banking/session";
import { isFinapiReady } from "./config";
import { createFinapiUser } from "./users";
import { createBankConnectionWebForm, getWebFormStatus } from "./webform";
import { fetchAccounts } from "./sync";
import { open, seal, vaultConfigured } from "@/lib/banking/vault";

export async function beginFinapiWebForm(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  if (!isFinapiReady()) {
    return {
      ok: false,
      error:
        "finAPI nicht bereit. Setze FINAPI_CLIENT_ID, FINAPI_CLIENT_SECRET und OPEN_BANKING_ENABLED=true.",
    };
  }
  if (!vaultConfigured()) {
    return {
      ok: false,
      error:
        "KONTURA_VAULT_KEY (min. 16 Zeichen) setzen, um User-Credentials zu speichern.",
    };
  }

  try {
    const session = await getBankSession();
    let userId = session.finapiUserId;
    let password: string | null = null;

    if (userId && session.finapiPasswordSealed) {
      password = open(session.finapiPasswordSealed);
    } else {
      const user = await createFinapiUser();
      userId = user.id;
      password = user.password;
    }

    const form = await createBankConnectionWebForm(userId!, password!);
    await setBankSession({
      ...session,
      connected: false,
      provider: "finapi",
      bankLabel: "finAPI Sandbox",
      accountsLinked: 0,
      lastSyncAt: null,
      connectedAt: null,
      finapiUserId: userId,
      finapiPasswordSealed: seal(password!),
      webFormId: form.id,
      bankConnectionId: null,
    });

    return { ok: true, url: form.url };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "finAPI Web Form fehlgeschlagen",
    };
  }
}

export async function finalizeFinapiWebForm(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await getBankSession();
  if (!session.webFormId || !session.finapiUserId || !session.finapiPasswordSealed) {
    return { ok: false, error: "Kein offenes Web Form." };
  }

  try {
    const password = open(session.finapiPasswordSealed);
    const status = await getWebFormStatus(
      session.finapiUserId,
      password,
      session.webFormId,
    );
    const done = ["COMPLETED", "COMPLETED_WITH_ERROR"].includes(
      (status.status || "").toUpperCase(),
    );
    if (!done) {
      return {
        ok: false,
        error: `Web Form Status: ${status.status}. Bitte SCA abschließen und erneut prüfen.`,
      };
    }

    const bankConnectionId = status.payload?.bankConnectionId ?? null;
    const accounts = await fetchAccounts(session.finapiUserId, password);
    const now = new Date().toISOString();
    await setBankSession({
      ...session,
      connected: true,
      provider: "finapi",
      bankLabel: accounts[0]?.bankName || "finAPI Bank",
      accountsLinked: accounts.length,
      lastSyncAt: now,
      connectedAt: now,
      bankConnectionId,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Abschluss fehlgeschlagen",
    };
  }
}
