import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { getMfaDecision, mfaBlocksAccess } from "@/lib/auth/mfa";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const email = typeof user?.email === "string" ? user.email : null;
  const allowed = Boolean(user && isEmailAllowed(email));

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/";
  const isMfaPage = path === "/mfa" || path.startsWith("/mfa/");
  const isProtected =
    path.startsWith("/control") || path.startsWith("/api/vehicle");

  // Signed in but not on allowlist → force sign-out cookie clear via redirect home
  if (user && !allowed) {
    await supabase.auth.signOut();
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("denied", "1");
    return NextResponse.redirect(url);
  }

  if (isProtected && !allowed) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (isMfaPage && !allowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  let mfaDecision = null as Awaited<ReturnType<typeof getMfaDecision>> | null;
  if (allowed && (isProtected || isAuthPage || isMfaPage)) {
    mfaDecision = await getMfaDecision(supabase);
  }

  if (allowed && isProtected && mfaDecision && mfaBlocksAccess(mfaDecision)) {
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "MFA required", status: mfaDecision.status },
        { status: 403 },
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/mfa";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && allowed) {
    const url = request.nextUrl.clone();
    url.pathname =
      mfaDecision && mfaBlocksAccess(mfaDecision) ? "/mfa" : "/control";
    return NextResponse.redirect(url);
  }

  if (isMfaPage && allowed && mfaDecision?.status === "ok") {
    const url = request.nextUrl.clone();
    url.pathname = "/control";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
