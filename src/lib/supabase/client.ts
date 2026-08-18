import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        // PKCE `?code=` is exchanged in `/auth/callback` (server cookies).
        // Auto-detect would mint a new verifier and fail with bad_code_verifier.
        detectSessionInUrl: false,
      },
    },
  );
}
