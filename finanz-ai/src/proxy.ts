import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE } from "@/lib/auth/constants";

const APP_PREFIXES = [
  "/dashboard",
  "/chat",
  "/budgets",
  "/connect",
  "/transactions",
  "/goals",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApp = APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isDemo = request.cookies.get(DEMO_COOKIE)?.value === "1";

  if (isApp && !isDemo) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/login" && isDemo) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/budgets/:path*",
    "/connect/:path*",
    "/transactions/:path*",
    "/goals/:path*",
    "/login",
  ],
};
