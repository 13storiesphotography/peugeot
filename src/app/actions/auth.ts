"use server";

import { redirect } from "next/navigation";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  success?: string;
};

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
    return { error: "Anmeldung fehlgeschlagen." };
  }

  // Defense in depth: verify session email still allowlisted
  const { data } = await supabase.auth.getClaims();
  const sessionEmail =
    typeof data?.claims?.email === "string" ? data.claims.email : email;
  if (!isEmailAllowed(sessionEmail)) {
    await supabase.auth.signOut();
    return { error: "Dieser Zugang ist nicht freigeschaltet." };
  }

  redirect("/control");
}

/** Public signup is disabled — personal app only. */
export async function signUp(): Promise<AuthState> {
  return {
    error: "Registrierung ist deaktiviert. Nur freigeschaltete Konten.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
