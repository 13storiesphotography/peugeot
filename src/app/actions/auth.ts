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

function publicSiteOrigin(headerStore: Headers): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origin = headerStore.get("origin")?.replace(/\/$/, "") ?? "";
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const fromHost = host ? `${proto}://${host}`.replace(/\/$/, "") : "";
  const candidate =
    origin || fromHost || configured || "https://www.peugeotcontrol.app";
  if (candidate.includes("localhost") || candidate.includes("127.0.0.1")) {
    return configured || "https://www.peugeotcontrol.app";
  }
  return candidate;
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
  const origin = publicSiteOrigin(headerStore);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
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
