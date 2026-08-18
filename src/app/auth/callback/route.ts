import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  RECOVERY_COOKIE,
  recoveryCookieOptions,
} from "@/lib/auth/recovery-cookie";

export const dynamic = "force-dynamic";

function safeNextPath(raw: string | null, fallback: string): string {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("://")
  ) {
    return fallback;
  }
  return raw;
}

function applyCookies(
  response: NextResponse,
  cookiesToSet: {
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }[],
) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
}

/**
 * Server-side PKCE exchange. The verifier is stored in cookies by the
 * server action that sent the mail — the browser client cannot use a
 * matching verifier and would fail with bad_code_verifier.
 *
 * Session cookies are written onto this redirect response so they survive
 * the hop to `/auth/reset` or `/control`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const recovery =
    searchParams.get("type") === "recovery" ||
    (nextParam ?? "").startsWith("/auth/reset");
  const next = safeNextPath(nextParam, recovery ? "/auth/reset" : "/control");

  const failed = request.nextUrl.clone();
  failed.pathname = next.startsWith("/auth/reset") ? "/auth/reset" : "/";
  failed.search = next.startsWith("/auth/reset")
    ? "error=invalid"
    : "confirm=failed";

  const dest = request.nextUrl.clone();
  dest.pathname = next;
  dest.search = "";

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

  if (!code) {
    const response = NextResponse.redirect(failed);
    applyCookies(response, pendingCookies);
    return response;
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  const response = NextResponse.redirect(error ? failed : dest);
  applyCookies(response, pendingCookies);
  if (!error && next.startsWith("/auth/reset")) {
    response.cookies.set(RECOVERY_COOKIE, "1", recoveryCookieOptions(60 * 60));
  }
  return response;
}
