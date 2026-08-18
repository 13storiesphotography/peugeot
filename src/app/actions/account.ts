"use server";

import { redirect } from "next/navigation";
import { deleteUserAccount } from "@/lib/auth/delete-account";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { error?: string; success?: string };

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
