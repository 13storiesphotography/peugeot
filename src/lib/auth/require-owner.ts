import { NextResponse } from "next/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { getMfaDecision, mfaBlocksAccess } from "@/lib/auth/mfa";
import { createClient } from "@/lib/supabase/server";

/** Require authenticated + allowlisted user (and MFA when due). */
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

  const mfa = await getMfaDecision(supabase);
  if (mfaBlocksAccess(mfa)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "MFA required", status: mfa.status },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, supabase, userId, email, mfa };
}
