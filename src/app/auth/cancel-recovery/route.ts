import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { expireRecoveryCookies } from "@/lib/auth/recovery-cookie";

export const dynamic = "force-dynamic";

/**
 * Leave password recovery: drop the gate cookie and session so the PWA
 * can open `/control` / login again instead of looping on `/auth/reset`.
 */
export async function GET(request: NextRequest) {
  const pendingCookies: {
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
          void headers;
        },
      },
    },
  );

  await supabase.auth.signOut();

  const dest = request.nextUrl.clone();
  dest.pathname = "/";
  dest.search = "";
  dest.hash = "";

  const response = NextResponse.redirect(dest);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  expireRecoveryCookies((cookie) => {
    response.headers.append("Set-Cookie", cookie);
  });
  return response;
}
