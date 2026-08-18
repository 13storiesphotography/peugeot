import { createClient } from "@supabase/supabase-js";

/**
 * Password recovery without PKCE. The SSR client always uses PKCE, which
 * stores a verifier in cookies and breaks when the mail is opened elsewhere.
 * Implicit recovery puts tokens in the redirect URL instead.
 */
export async function sendRecoveryWithoutPkce(
  email: string,
  redirectTo: string,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !anon) {
    throw new Error("Supabase public env missing");
  }

  const auth = createClient(url, anon, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return auth.auth.resetPasswordForEmail(email, { redirectTo });
}
