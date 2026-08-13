import { isEmailAllowed } from "@/lib/auth/allowlist";
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

  return { supabase, userId, email };
}
