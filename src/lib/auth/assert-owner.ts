import { redirect } from "next/navigation";
import { cache } from "react";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { getMfaDecision, mfaBlocksAccess } from "@/lib/auth/mfa";
import { createClient } from "@/lib/supabase/server";

const loadOwnerSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  if (!userId || typeof userId !== "string" || !isEmailAllowed(email)) {
    return null;
  }

  const mfa = await getMfaDecision(supabase);
  return { supabase, userId, email, mfa };
});

/** One session resolution per RSC request (redirect stays outside cache). */
export async function assertOwnerSession() {
  const session = await loadOwnerSession();
  if (!session) return null;
  if (mfaBlocksAccess(session.mfa)) {
    redirect("/mfa");
  }
  return session;
}
