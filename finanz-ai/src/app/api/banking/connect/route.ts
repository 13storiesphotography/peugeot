import { NextResponse } from "next/server";
import { getDemoSession } from "@/lib/auth/demo-session";
import { buildConsentUrl, getMockConnection } from "@/lib/banking/open-banking";

export async function GET() {
  const session = await getDemoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getMockConnection());
}

export async function POST() {
  const session = await getDemoSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = crypto.randomUUID();
  const consent = buildConsentUrl(state);
  if (!consent.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: consent.error,
        connection: getMockConnection(),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    redirectUrl: consent.url,
    state,
  });
}
