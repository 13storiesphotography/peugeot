import { NextResponse } from "next/server";
import { getDemoSession } from "@/lib/auth/demo-session";
import { setBankSession } from "@/lib/banking/session";

/**
 * PSD2 OAuth callback placeholder.
 * Live: exchange ?code=… for tokens via finAPI/Tink, encrypt, store.
 * Demo: ?demo=1 completes simulated SCA.
 */
export async function GET(request: Request) {
  const session = await getDemoSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const demo = url.searchParams.get("demo") === "1";
  const code = url.searchParams.get("code");

  if (!demo && !code) {
    return NextResponse.redirect(
      new URL("/connect?error=missing_code", request.url),
    );
  }

  // Live code exchange would happen here with OPEN_BANKING_CLIENT_SECRET.
  const now = new Date().toISOString();
  await setBankSession({
    connected: true,
    provider: demo ? "mock" : ((process.env.OPEN_BANKING_PROVIDER as "finapi" | "tink") ?? "finapi"),
    bankLabel: "Sparkasse Demo",
    accountsLinked: 2,
    lastSyncAt: now,
    connectedAt: now,
  });

  return NextResponse.redirect(new URL("/connect?connected=1", request.url));
}
