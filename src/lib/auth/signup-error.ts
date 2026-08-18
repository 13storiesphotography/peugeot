type SignupAuthError = {
  message?: string;
  code?: string;
  status?: number;
};

export function mapSignupError(error: SignupAuthError): string {
  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();
  const status = error.status ?? 0;

  if (
    code === "over_email_send_rate_limit" ||
    status === 429 ||
    msg.includes("email rate limit") ||
    msg.includes("over_email_send_rate_limit")
  ) {
    return "Zu viele Bestätigungsmails. Bitte etwa eine Stunde warten, Spam-Ordner prüfen — oder anmelden, falls das Konto schon existiert.";
  }

  if (code === "signup_disabled" || msg.includes("signups not allowed")) {
    return "Registrierung ist im Auth-Dienst deaktiviert.";
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
    return "Bestätigungs-URL ist nicht erlaubt. In Supabase unter Authentication → URL Configuration https://www.peugeotcontrol.app/** eintragen.";
  }

  if (msg.includes("database error")) {
    return "Konto konnte nicht gespeichert werden. Bitte in einer Minute erneut versuchen.";
  }

  return "Registrierung fehlgeschlagen. Bitte erneut versuchen.";
}
