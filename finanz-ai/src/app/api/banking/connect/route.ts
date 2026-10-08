import { NextResponse } from "next/server";
import { getDemoSession } from "@/lib/auth/demo-session";
import { getConnectionView, setBankSession } from "@/lib/banking/session";
import { isFinapiReady } from "@/lib/banking/finapi/config";
import { beginFinapiWebForm } from "@/lib/banking/finapi/connect";

export async function GET() {
  const session = await getDemoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ...(await getConnectionView()),
    finapiReady: isFinapiReady(),
  });
}

export async function POST(request: Request) {
  const session = await getDemoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    mode?: "demo" | "live" | "finapi";
  };
  const mode = body.mode ?? "demo";

  if (mode === "demo") {
    const now = new Date().toISOString();
    await setBankSession({
      connected: true,
      provider: "mock",
      bankLabel: "Sparkasse Demo",
      accountsLinked: 2,
      lastSyncAt: now,
      connectedAt: now,
    });
    return NextResponse.json({
      ok: true,
      mode: "demo",
      connection: await getConnectionView(),
      redirectUrl: "/api/banking/callback?demo=1",
    });
  }

  const result = await beginFinapiWebForm();
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        connection: await getConnectionView(),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "finapi",
    redirectUrl: result.url,
  });
}
