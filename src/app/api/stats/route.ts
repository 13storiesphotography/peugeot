import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { getTrafficStats } from "@/lib/traffic/stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stats = await getTrafficStats();
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("stats:", err);
    return NextResponse.json(
      { error: "Stats konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}
