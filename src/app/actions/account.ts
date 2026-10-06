"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { deleteUserAccount } from "@/lib/auth/delete-account";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { getServiceRoleKey } from "@/lib/supabase/admin";
import { setPasswordCookieFree } from "@/lib/auth/recovery-password";
import { mapPasswordUpdateError } from "@/lib/auth/password-update-error";
import { createClient } from "@/lib/supabase/server";
import { unenrollTotpAction } from "@/app/actions/mfa";

export type AccountState = { error?: string; success?: string };

export async function changeOwnPassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const session = await assertOwnerSession();
  if (!session?.email) {
    return { error: "Bitte zuerst anmelden." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!currentPassword) {
    return { error: "Aktuelles Passwort eingeben." };
  }
  if (password.length < 8) {
    return { error: "Neues Passwort mindestens 8 Zeichen." };
  }
  if (password !== passwordConfirm) {
    return { error: "Neue Passwörter stimmen nicht überein." };
  }
  if (password === currentPassword) {
    return {
      error: "Das neue Passwort muss sich vom bisherigen unterscheiden.",
    };
  }

  const supabase = await createClient();
  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: currentPassword,
  });
  if (checkError) {
    return { error: "Aktuelles Passwort ist falsch." };
  }

  if (!getServiceRoleKey()) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { error: mapPasswordUpdateError(error) };
    }
  } else {
    const setError = await setPasswordCookieFree({
      userId: session.userId,
      password,
    });
    if (setError) {
      return { error: mapPasswordUpdateError(setError) };
    }
  }

  revalidatePath("/control/account");
  return { success: "Passwort wurde geändert." };
}

export async function removeOwnMfa(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const factorId = String(formData.get("factorId") ?? "").trim();
  if (!factorId) {
    return { error: "Kein MFA-Faktor gefunden." };
  }

  const result = await unenrollTotpAction(factorId);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/control/account");
  revalidatePath("/control/settings");
  return { success: "Zwei-Faktor-Authentifizierung wurde entfernt." };
}

export async function deleteOwnAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const session = await assertOwnerSession();
  if (!session) {
    return { error: "Bitte zuerst anmelden." };
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toUpperCase();
  if (!password) {
    return { error: "Passwort bestätigen, um das Konto zu löschen." };
  }
  if (confirm !== "LÖSCHEN") {
    return { error: "Tippe LÖSCHEN zur Bestätigung." };
  }

  const supabase = await createClient();
  if (session.email) {
    const { error } = await supabase.auth.signInWithPassword({
      email: session.email,
      password,
    });
    if (error) {
      return { error: "Passwort stimmt nicht." };
    }
  }

  try {
    await deleteUserAccount(session.userId, session.email);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Löschen fehlgeschlagen.";
    return { error: message };
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // User row is already gone.
  }
  redirect("/?deleted=1");
}
