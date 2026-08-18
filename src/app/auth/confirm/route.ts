import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function otpType(raw: string | null): EmailOtpType {
  if (
    raw === "signup" ||
    raw === "invite" ||
    raw === "magiclink" ||
    raw === "recovery" ||
    raw === "email_change" ||
    raw === "email"
  ) {
    return raw;
  }
  return "email";
}

/** Server-side email confirmation (token_hash) so the session is set in cookies. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  if (!tokenHash) {
    redirect("/?confirm=failed");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: otpType(searchParams.get("type")),
    token_hash: tokenHash as string,
  });

  if (error) {
    redirect("/?confirm=failed");
  }

  redirect("/control");
}
