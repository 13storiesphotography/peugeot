"use server";

import { cookies, headers } from "next/headers";
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
import { otpType } from "@/lib/auth/otp-type";
import { sendAuthEmail } from "@/lib/auth/send-auth-email";
import { sendRecoveryWithoutPkce } from "@/lib/auth/send-recovery";
import { getSiteOrigin } from "@/lib/auth/site-origin";
import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyNewSignup } from "@/lib/auth/notify-signup";
import { mapSignupError, mapOutboundMailError } from "@/lib/auth/signup-error";
import { getTranslator } from "@/i18n/server";
import { isLocale, LOCALE_COOKIE, localeCookieOptions, type Locale } from "@/i18n/config";

export type AuthState = {
  error?: string;
  success?: string;
  needsConfirmation?: boolean;
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

function confirmEmailRedirectTo(headerStore: Headers): string {
  return `${publicSiteOrigin(headerStore)}/auth/callback`;
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
  const { locale, t } = await getTranslator();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: t("auth.emailPasswordRequired") };
  }

  if (!isEmailAllowed(email)) {
    return { error: t("auth.accessDenied") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message.toLowerCase();
    const code = error.code?.toLowerCase() ?? "";
    if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
      return {
        error: t("auth.emailUnconfirmed"),
        needsConfirmation: true,
      };
    }
    return { error: t("auth.signInFailed") };
  }

  const { data } = await supabase.auth.getClaims();
  const sessionEmail =
    typeof data?.claims?.email === "string" ? data.claims.email : email;
  if (!isEmailAllowed(sessionEmail)) {
    await supabase.auth.signOut();
    return { error: t("auth.accessDenied") };
  }

  const { data: userData } = await supabase.auth.getUser();
  const saved = userData.user?.user_metadata?.locale;
  const jar = await cookies();
  if (isLocale(saved)) {
    jar.set(LOCALE_COOKIE, saved, localeCookieOptions());
  } else {
    jar.set(LOCALE_COOKIE, locale, localeCookieOptions());
    await supabase.auth.updateUser({ data: { locale } });
  }

  return redirectAfterAuth();
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { locale: detected, t } = await getTranslator();
  if (!isPublicSignupEnabled()) {
    return {
      error: t("auth.signupDisabled"),
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const localeRaw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : detected;

  if (!email || !password) {
    return { error: t("auth.emailPasswordRequired") };
  }
  if (password.length < 8) {
    return { error: t("auth.passwordMin") };
  }
  if (password !== passwordConfirm) {
    return { error: t("auth.passwordMismatch") };
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const emailRedirectTo = confirmEmailRedirectTo(headerStore);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo, data: { locale } },
  });

  if (error) {
    console.error("signUp failed", {
      code: error.code,
      message: error.message,
      status: error.status,
      emailRedirectTo,
    });
    return { error: mapSignupError(error, locale) };
  }

  if (data.user?.identities && data.user.identities.length === 0) {
    return { error: t("auth.alreadyRegistered") };
  }

  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, localeCookieOptions());

  try {
    await notifyNewSignup(email);
  } catch (err) {
    console.warn("signup notify:", err);
  }

  if (data.session) {
    return redirectAfterAuth();
  }

  return {
    success: t("auth.confirmSent"),
    needsConfirmation: true,
  };
}

export async function resendConfirmation(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { locale, t } = await getTranslator();
  if (!isPublicSignupEnabled()) {
    return {
      error: t("auth.signupDisabled"),
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: t("auth.resendNeedEmail") };
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: confirmEmailRedirectTo(headerStore),
    },
  });

  if (error) {
    console.error("resend confirmation", error.code, error.message, error.status);
    return { error: mapSignupError(error, locale), needsConfirmation: true };
  }

  return {
    success: t("auth.confirmSent"),
    needsConfirmation: true,
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { locale, t } = await getTranslator();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: t("auth.emailRequired") };
  }

  const generic = {
    success: t("auth.resetGeneric"),
  };

  const origin = await getSiteOrigin();
  const redirectTo = `${origin}/auth/reset`;

  try {
    if (getServiceRoleKey()) {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });
      const tokenHash = data?.properties?.hashed_token;
      if (error || !tokenHash) {
        const mail = error ? mapOutboundMailError(error, locale) : null;
        if (mail) return { error: mail };
        return generic;
      }

      await sendAuthEmail(email, {
        token_hash: tokenHash,
        email_action_type: "recovery",
        redirect_to: redirectTo,
      }, locale);
      return generic;
    }

    const { error } = await sendRecoveryWithoutPkce(email, redirectTo);
    if (error) {
      const mail = mapOutboundMailError(error, locale);
      if (mail) return { error: mail };
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "";
    const mail = mapOutboundMailError({ message }, locale);
    if (mail) return { error: mail };
    if (message.toLowerCase().includes("resend")) {
      return {
        error: t("auth.mailFailed"),
      };
    }
  }

  return generic;
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getTranslator();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 8) {
    return { error: t("auth.passwordMin") };
  }
  if (password !== passwordConfirm) {
    return { error: t("auth.passwordMismatch") };
  }

  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const supabase = await createClient();

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: otpType(String(formData.get("type") ?? "recovery")),
      token_hash: tokenHash,
    });
    if (error) {
      return {
        error: t("auth.linkInvalid"),
      };
    }
    const jar = await cookies();
    jar.set(RECOVERY_COOKIE, "1", recoveryCookieOptions(60 * 60));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: t("auth.sessionExpired"),
    };
  }

  if (!isEmailAllowed(user.email)) {
    await supabase.auth.signOut();
    return { error: t("auth.accessDenied") };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("same") || msg.includes("different from the old")) {
      return { error: t("auth.passwordSame") };
    }
    if (msg.includes("at least") || msg.includes("weak") || msg.includes("pwned")) {
      return { error: t("auth.passwordWeak") };
    }
    if (msg.includes("session") || error.status === 401) {
      return {
        error: t("auth.sessionExpired"),
      };
    }
    return { error: t("auth.passwordSavedFail") };
  }

  const jar = await cookies();
  jar.delete(RECOVERY_COOKIE);
  jar.set(RECOVERY_COOKIE, "", recoveryCookieOptions(0));

  return redirectAfterAuth();
}
