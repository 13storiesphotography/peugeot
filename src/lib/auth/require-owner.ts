import { NextResponse } from "next/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { createClient } from "@/lib/supabase/server";

/** Require authenticated + allowlisted user. Returns userId or a Response. */
export async function requireOwner() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  if (!userId || typeof userId !== "string" || !isEmailAllowed(email)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true as const, supabase, userId, email };
}
