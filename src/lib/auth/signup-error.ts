type SignupAuthError = {
  message?: string;
  code?: string;
};

export function mapSignupError(error: SignupAuthError): string {
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();

  if (code === "signup_disabled" || msg.includes("signups not allowed")) {
    return "Registrierung ist im Auth-Dienst deaktiviert. In Supabase unter Authentication → Providers → Email „Allow new users to sign up“ einschalten.";
  }

  if (
    code === "user_already_exists" ||
    msg.includes("already registered") ||
    msg.includes("already been registered")
  ) {
    return "Diese E-Mail ist bereits registriert — bitte anmelden.";
  }

  if (
    code === "weak_password" ||
    msg.includes("pwned") ||
    msg.includes("leaked") ||
    msg.includes("data breach")
  ) {
    return "Passwort zu unsicher (bekannt aus Datenlecks). Bitte ein anderes wählen.";
  }

  if (
    code === "email_address_invalid" ||
    (msg.includes("invalid") && msg.includes("email"))
  ) {
    return "Bitte eine gültige E-Mail-Adresse verwenden.";
  }

  if (msg.includes("redirect") || code === "redirect_url_not_allowed") {
    return "Bestätigungs-URL ist nicht erlaubt. In Supabase unter Authentication → URL Configuration https://www.peugeotcontrol.app/** und https://e3008-control.vercel.app/** eintragen.";
  }

  if (msg.includes("database error saving new user") || msg.includes("database error")) {
    return "Konto konnte nicht gespeichert werden. Bitte in einer Minute erneut versuchen.";
  }

  if (code === "over_request_rate_limit" || msg.includes("rate limit")) {
    return "Zu viele Versuche. Kurz warten und erneut versuchen.";
  }

  return "Registrierung fehlgeschlagen. Bitte erneut versuchen.";
}

export function signupEmailRedirectTo(headerStore: Headers): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origin = headerStore.get("origin")?.replace(/\/$/, "") ?? "";
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const fromHost = host ? `${proto}://${host}`.replace(/\/$/, "") : "";

  const candidate = origin || fromHost || configured || "https://www.peugeotcontrol.app";
  const base = candidate.includes("localhost") || candidate.includes("127.0.0.1")
    ? configured || "https://www.peugeotcontrol.app"
    : candidate;

  return `${base}/control`;
}
