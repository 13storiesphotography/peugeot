"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale, localeCookieOptions, type Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

export async function setLocaleAction(locale: Locale) {
  if (!isLocale(locale)) return;
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, localeCookieOptions());
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.auth.updateUser({ data: { locale } });
    }
  } catch {
    // Guest — cookie is enough.
  }
  revalidatePath("/", "layout");
}
