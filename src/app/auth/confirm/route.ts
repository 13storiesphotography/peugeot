import { NextResponse, type NextRequest } from "next/server";
import { otpType } from "@/lib/auth/otp-type";
import {
  RECOVERY_COOKIE,
  recoveryCookieOptions,
} from "@/lib/auth/recovery-cookie";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Server-side token_hash exchange (confirm + password recovery). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = otpType(searchParams.get("type"));
  const next = searchParams.get("next");

  const failed = request.nextUrl.clone();
  failed.pathname = type === "recovery" ? "/auth/reset" : "/";
  failed.search = type === "recovery" ? "error=invalid" : "confirm=failed";

  if (!tokenHash) {
    return NextResponse.redirect(failed);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(failed);
  }

  const dest = request.nextUrl.clone();
  dest.search = "";
  dest.pathname = safeNextPath(
    next,
    type === "recovery" ? "/auth/reset" : "/control",
  );
  const response = NextResponse.redirect(dest);
  if (type === "recovery") {
    response.cookies.set(RECOVERY_COOKIE, "1", recoveryCookieOptions(60 * 60));
  }
  return response;
}

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
