import { redirect } from "next/navigation";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { getMfaDecision, mfaBlocksAccess } from "@/lib/auth/mfa";
import { createClient } from "@/lib/supabase/server";

export async function assertOwnerSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  if (!userId || typeof userId !== "string" || !isEmailAllowed(email)) {
    return null;
  }

  const mfa = await getMfaDecision(supabase);
  if (mfaBlocksAccess(mfa)) {
    redirect("/mfa");
  }

  return { supabase, userId, email, mfa };
}
