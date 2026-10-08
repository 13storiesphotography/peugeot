import { NextResponse } from "next/server";
import { getDemoSession } from "@/lib/auth/demo-session";
import { getBankSession, setBankSession } from "@/lib/banking/session";
import { getWebFormStatus } from "@/lib/banking/finapi/webform";
import { fetchAccounts } from "@/lib/banking/finapi/sync";
import { open } from "@/lib/banking/vault";

/**
 * PSD2 / finAPI Web Form callback.
 * Demo: ?demo=1
 * finAPI: callback after Web Form (may include webFormId in query — vendor-specific)
 */
export async function GET(request: Request) {
  const session = await getDemoSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const demo = url.searchParams.get("demo") === "1";

  if (demo) {
    const now = new Date().toISOString();
    await setBankSession({
      connected: true,
      provider: "mock",
      bankLabel: "Sparkasse Demo",
      accountsLinked: 2,
      lastSyncAt: now,
      connectedAt: now,
    });
    return NextResponse.redirect(new URL("/connect?connected=1", request.url));
  }

  const bank = await getBankSession();
  const webFormId =
    url.searchParams.get("webFormId") ??
    url.searchParams.get("id") ??
    bank.webFormId;

  if (
    webFormId &&
    bank.finapiUserId &&
    bank.finapiPasswordSealed
  ) {
    try {
      const password = open(bank.finapiPasswordSealed);
      const status = await getWebFormStatus(
        bank.finapiUserId,
        password,
        webFormId,
      );
      const bankConnectionId = status.payload?.bankConnectionId ?? null;
      const accounts = await fetchAccounts(bank.finapiUserId, password);
      const now = new Date().toISOString();
      await setBankSession({
        ...bank,
        connected: true,
        provider: "finapi",
        bankLabel: accounts[0]?.bankName || "finAPI Bank",
        accountsLinked: accounts.length,
        lastSyncAt: now,
        connectedAt: now,
        webFormId,
        bankConnectionId,
      });
      return NextResponse.redirect(new URL("/connect?connected=1", request.url));
    } catch {
      return NextResponse.redirect(
        new URL("/connect?error=callback_failed", request.url),
      );
    }
  }

  // Soft landing: user returns from web form — UI can poll "SCA abgeschlossen"
  return NextResponse.redirect(new URL("/connect", request.url));
}
