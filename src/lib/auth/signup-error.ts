import type { Locale } from "@/i18n/config";
import { translate } from "@/i18n/translate";

type SignupAuthError = {
  message?: string;
  code?: string;
  status?: number;
};

/** SMTP/Resend failures that should not be hidden as a generic success. */
export function mapOutboundMailError(
  error: SignupAuthError,
  locale: Locale = "en",
): string | null {
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();
  const status = error.status ?? 0;

  if (msg.includes("domain is not verified") || msg.includes("add and verify your domain")) {
    return translate(locale, "errors.domainUnverified");
  }

  if (
    code === "over_email_send_rate_limit" ||
    status === 429 ||
    msg.includes("email rate limit") ||
    msg.includes("over_email_send_rate_limit")
  ) {
    return translate(locale, "errors.mailRate");
  }

  if (
    code === "unexpected_failure" ||
    msg.includes("could not send email") ||
    msg.includes("gomail")
  ) {
    return translate(locale, "errors.mailSend");
  }

  return null;
}

export function mapSignupError(
  error: SignupAuthError,
  locale: Locale = "en",
): string {
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();
  const mail = mapOutboundMailError(error, locale);
  if (mail) return mail;

  if (code === "signup_disabled" || msg.includes("signups not allowed")) {
    return translate(locale, "errors.signupDisabledAdmin");
  }

  if (
    code === "user_already_exists" ||
    msg.includes("already registered") ||
    msg.includes("already been registered")
  ) {
    return translate(locale, "auth.alreadyRegistered");
  }

  if (
    code === "weak_password" ||
    msg.includes("pwned") ||
    msg.includes("leaked") ||
    msg.includes("data breach")
  ) {
    return translate(locale, "errors.weakPassword");
  }

  if (
    code === "email_address_invalid" ||
    (msg.includes("invalid") && msg.includes("email"))
  ) {
    return translate(locale, "errors.invalidEmail");
  }

  if (msg.includes("redirect") || code === "redirect_url_not_allowed") {
    return translate(locale, "errors.redirectNotAllowed");
  }

  if (msg.includes("database error saving new user") || msg.includes("database error")) {
    return translate(locale, "errors.dbError");
  }

  if (code === "over_request_rate_limit" || msg.includes("rate limit")) {
    return translate(locale, "errors.rateLimit");
  }

  return translate(locale, "errors.signupFail");
}
