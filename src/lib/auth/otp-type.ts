import type { EmailOtpType } from "@supabase/supabase-js";

export function otpType(raw: string | null): EmailOtpType {
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
