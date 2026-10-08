import { NextResponse } from "next/server";
import { getDemoSession } from "@/lib/auth/demo-session";
import { buildConsentUrl, getBankingConfig } from "@/lib/banking/open-banking";
import { getConnectionView, setBankSession } from "@/lib/banking/session";

export async function GET() {
  const session = await getDemoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getConnectionView());
}

export async function POST(request: Request) {
  const session = await getDemoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    mode?: "demo" | "live";
  };
  const mode = body.mode ?? "demo";

  if (mode === "demo") {
    const now = new Date().toISOString();
    const connection = {
      connected: true as const,
      provider: "mock" as const,
      bankLabel: "Sparkasse Demo",
      accountsLinked: 2,
      lastSyncAt: now,
      connectedAt: now,
    };
    await setBankSession(connection);
    return NextResponse.json({
      ok: true,
      mode: "demo",
      connection: await getConnectionView(),
      // Simulated bank SCA page → callback
      redirectUrl: "/api/banking/callback?demo=1",
    });
  }

  const config = getBankingConfig();
  if (!config.enabled || !config.clientIdConfigured) {
    return NextResponse.json(
      {
        ok: false,
        error: "Live Open Banking nicht konfiguriert.",
        connection: await getConnectionView(),
      },
      { status: 400 },
    );
  }

  const consent = buildConsentUrl(crypto.randomUUID());
  if (!consent.ok) {
    return NextResponse.json(
      { ok: false, error: consent.error, connection: await getConnectionView() },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "live",
    redirectUrl: consent.url,
  });
}
