type SignupAuthError = {
  message?: string;
  code?: string;
  status?: number;
};

/** SMTP/Resend failures that should not be hidden as a generic success. */
export function mapOutboundMailError(error: SignupAuthError): string | null {
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();
  const status = error.status ?? 0;

  if (msg.includes("domain is not verified") || msg.includes("add and verify your domain")) {
    return "Absender-Domain peugeotcontrol.app ist in Resend nicht verifiziert. Unter resend.com/domains die Domain anlegen und die DNS-Einträge bei Vercel setzen.";
  }

  if (
    code === "over_email_send_rate_limit" ||
    status === 429 ||
    msg.includes("email rate limit") ||
    msg.includes("over_email_send_rate_limit")
  ) {
    return "Zu viele E-Mails. Bitte etwa eine Stunde warten und erneut versuchen.";
  }

  if (
    code === "unexpected_failure" ||
    msg.includes("could not send email") ||
    msg.includes("gomail")
  ) {
    return "E-Mail konnte nicht gesendet werden. Resend-Domain und SMTP-Absender prüfen.";
  }

  return null;
}

export function mapSignupError(error: SignupAuthError): string {
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();
  const mail = mapOutboundMailError(error);
  if (mail) return mail;

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
