"use server";

import { redirect } from "next/navigation";
import { deleteUserAccount } from "@/lib/auth/delete-account";
import { assertOwnerSession } from "@/lib/auth/assert-owner";
import { createClient } from "@/lib/supabase/server";
import { getTranslator } from "@/i18n/server";

export type AccountState = { error?: string; success?: string };

export async function deleteOwnAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const { t } = await getTranslator();
  const session = await assertOwnerSession();
  if (!session) {
    return { error: t("billing.payFirst") };
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toUpperCase();
  const confirmWord = t("account.confirmWord").toUpperCase();
  if (!password) {
    return { error: t("account.passwordRequired") };
  }
  if (confirm !== confirmWord && confirm !== "DELETE" && confirm !== "LÖSCHEN") {
    return { error: t("account.confirmRequired", { word: t("account.confirmWord") }) };
  }

  const supabase = await createClient();
  if (session.email) {
    const { error } = await supabase.auth.signInWithPassword({
      email: session.email,
      password,
    });
    if (error) {
      return { error: t("account.badPassword") };
    }
  }

  try {
    await deleteUserAccount(session.userId, session.email);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("account.failed");
    return { error: message };
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // User row is already gone.
  }
  redirect("/?deleted=1");
}
