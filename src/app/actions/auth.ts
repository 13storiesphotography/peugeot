"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  isEmailAllowed,
  isPublicSignupEnabled,
} from "@/lib/auth/allowlist";
import { getMfaDecision, mfaBlocksAccess } from "@/lib/auth/mfa";
import {
  RECOVERY_COOKIE,
  recoveryCookieOptions,
} from "@/lib/auth/recovery-cookie";
import { getSiteOrigin } from "@/lib/auth/site-origin";
import { createClient } from "@/lib/supabase/server";
import { notifyNewSignup } from "@/lib/auth/notify-signup";

export type AuthState = {
  error?: string;
  success?: string;
};

async function redirectAfterAuth(): Promise<never> {
  const supabase = await createClient();
  const mfa = await getMfaDecision(supabase);
  redirect(mfaBlocksAccess(mfa) ? "/mfa" : "/control");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-Mail und Passwort sind erforderlich." };
  }

  if (!isEmailAllowed(email)) {
    return { error: "Dieser Zugang ist nicht freigeschaltet." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Anmeldung fehlgeschlagen. E-Mail oder Passwort prüfen." };
  }

  const { data } = await supabase.auth.getClaims();
  const sessionEmail =
    typeof data?.claims?.email === "string" ? data.claims.email : email;
  if (!isEmailAllowed(sessionEmail)) {
    await supabase.auth.signOut();
    return { error: "Dieser Zugang ist nicht freigeschaltet." };
  }

  return redirectAfterAuth();
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isPublicSignupEnabled()) {
    return {
      error: "Registrierung ist deaktiviert. Nur freigeschaltete Konten.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !password) {
    return { error: "E-Mail und Passwort sind erforderlich." };
  }
  if (password.length < 8) {
    return { error: "Passwort mindestens 8 Zeichen." };
  }
  if (password !== passwordConfirm) {
    return { error: "Passwörter stimmen nicht überein." };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/control`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered")) {
      return { error: "Diese E-Mail ist bereits registriert — bitte anmelden." };
    }
    return { error: "Registrierung fehlgeschlagen. Bitte erneut versuchen." };
  }

  try {
    await notifyNewSignup(email);
  } catch (err) {
    console.warn("signup notify:", err);
  }

  if (data.session) {
    return redirectAfterAuth();
  }

  return {
    success:
      "Konto angelegt. Falls nötig, bestätige deine E-Mail — danach kannst du dich anmelden und MyPeugeot verbinden.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

function sendRateLimitMessage(message: string, status?: number): string | null {
  const msg = message.toLowerCase();
  if (
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("over_email_send_rate_limit") ||
    msg.includes("email rate")
  ) {
    return "Zu viele E-Mails. Bitte warte etwa eine Stunde und versuche es erneut.";
  }
  return null;
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "E-Mail ist erforderlich." };
  }

  const generic = {
    success:
      "Falls ein Konto mit dieser E-Mail existiert, haben wir einen Link zum Zurücksetzen geschickt. Prüfe auch den Spam-Ordner.",
  };

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset`,
  });

  if (error) {
    const rate = sendRateLimitMessage(error.message, error.status);
    if (rate) return { error: rate };
    // Do not reveal whether the address is registered.
    return generic;
  }

  return generic;
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 8) {
    return { error: "Passwort mindestens 8 Zeichen." };
  }
  if (password !== passwordConfirm) {
    return { error: "Passwörter stimmen nicht überein." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Sitzung abgelaufen. Bitte den Link in der E-Mail erneut öffnen oder einen neuen anfordern.",
    };
  }

  if (!isEmailAllowed(user.email)) {
    await supabase.auth.signOut();
    return { error: "Dieser Zugang ist nicht freigeschaltet." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("same") || msg.includes("different from the old")) {
      return { error: "Das neue Passwort muss sich vom bisherigen unterscheiden." };
    }
    if (msg.includes("at least") || msg.includes("weak") || msg.includes("pwned")) {
      return { error: "Passwort zu unsicher. Bitte ein längeres wählen." };
    }
    if (msg.includes("session") || error.status === 401) {
      return {
        error:
          "Sitzung abgelaufen. Bitte den Link in der E-Mail erneut öffnen oder einen neuen anfordern.",
      };
    }
    return { error: "Passwort konnte nicht gespeichert werden. Bitte erneut versuchen." };
  }

  const jar = await cookies();
  jar.delete(RECOVERY_COOKIE);
  jar.set(RECOVERY_COOKIE, "", recoveryCookieOptions(0));

  return redirectAfterAuth();
}
