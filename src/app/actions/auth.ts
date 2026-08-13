"use server";

import { redirect } from "next/navigation";
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/control");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-Mail und Passwort sind erforderlich." };
  }

  if (password.length < 8) {
    return { error: "Passwort mindestens 8 Zeichen." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        app: "e3008-control",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled, session exists → go to control.
  if (data.session) {
    redirect("/control");
  }

  return {
    success:
      "Konto erstellt. Falls eine Bestätigungsmail kommt, bitte bestätigen und danach anmelden.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
