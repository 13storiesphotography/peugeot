"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  isEmailAllowed,
  isPublicSignupEnabled,
} from "@/lib/auth/allowlist";
import { getMfaDecision, mfaBlocksAccess } from "@/lib/auth/mfa";
import { createClient } from "@/lib/supabase/server";
import { notifyNewSignup } from "@/lib/auth/notify-signup";

export type AuthState = {
  error?: string;
  success?: string;
};

function emailRedirectTo(headerStore: Headers): string {
  const origin = (
    headerStore.get("origin") ??
    (headerStore.get("x-forwarded-host")
      ? `https://${headerStore.get("x-forwarded-host")}`
      : null) ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.peugeotcontrol.app"
  ).replace(/\/$/, "");
  return `${origin}/control`;
}

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
    const msg = error.message.toLowerCase();
    const code = error.code?.toLowerCase() ?? "";
    if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
      return {
        error:
          "E-Mail ist noch nicht bestätigt. Unten kannst du die Bestätigungsmail erneut senden.",
      };
    }
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
  const headerStore = await headers();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: emailRedirectTo(headerStore),
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
      "Konto angelegt. Bestätige deine E-Mail — danach kannst du dich anmelden. Falls keine Mail kommt: unten erneut senden, Spam-Ordner prüfen.",
  };
}

export async function resendConfirmation(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isPublicSignupEnabled()) {
    return {
      error: "Registrierung ist deaktiviert. Nur freigeschaltete Konten.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Bitte die E-Mail eintragen, dann erneut senden." };
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: emailRedirectTo(headerStore),
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    console.error("resend confirmation", error.code, error.message);
    if (msg.includes("rate") || msg.includes("security") || error.status === 429) {
      return { error: "Zu viele Versuche. Bitte eine Minute warten." };
    }
  }

  return {
    success:
      "Falls ein unbestätigtes Konto existiert, ist die Bestätigungsmail unterwegs. Spam-Ordner prüfen.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
