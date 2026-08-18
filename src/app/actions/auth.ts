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
import { mapPasswordUpdateError } from "@/lib/auth/password-update-error";
import {
  elevateMfaSession,
  getUserWithAccessToken,
  isInsufficientAal,
  setPasswordCookieFree,
  verifyRecoveryTokenHash,
} from "@/lib/auth/recovery-password";

export type AuthState = {
  error?: string;
  success?: string;
  needsConfirmation?: boolean;
  needsMfa?: boolean;
  recoveryAccessToken?: string;
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
        needsConfirmation: true,
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
  const emailRedirectTo = confirmEmailRedirectTo(headerStore);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });

  if (error) {
    console.error("signUp failed", {
      code: error.code,
      message: error.message,
      status: error.status,
      emailRedirectTo,
    });
    return { error: mapSignupError(error) };
  }

  if (data.user?.identities && data.user.identities.length === 0) {
    return { error: "Diese E-Mail ist bereits registriert — bitte anmelden." };
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
    needsConfirmation: true,
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
      emailRedirectTo: confirmEmailRedirectTo(headerStore),
    },
  });

  if (error) {
    console.error("resend confirmation", error.code, error.message, error.status);
    return { error: mapSignupError(error), needsConfirmation: true };
  }

  return {
    success:
      "Falls ein unbestätigtes Konto existiert, ist die Bestätigungsmail unterwegs. Spam-Ordner prüfen.",
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
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "E-Mail ist erforderlich." };
  }

  const generic = {
    success:
      "Falls ein Konto mit dieser E-Mail existiert, haben wir einen Link zum Zurücksetzen geschickt. Prüfe auch den Spam-Ordner.",
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
        const mail = error ? mapOutboundMailError(error) : null;
        if (mail) return { error: mail };
        return generic;
      }

      await sendAuthEmail(email, {
        token_hash: tokenHash,
        email_action_type: "recovery",
        redirect_to: redirectTo,
      });
      return generic;
    }

    const { error } = await sendRecoveryWithoutPkce(email, redirectTo);
    if (error) {
      const mail = mapOutboundMailError(error);
      if (mail) return { error: mail };
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "";
    const mail = mapOutboundMailError({ message });
    if (mail) return { error: mail };
    if (message.toLowerCase().includes("resend")) {
      return {
        error: "E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.",
      };
    }
  }

  return generic;
}

async function clearRecoveryCookie() {
  const jar = await cookies();
  jar.delete(RECOVERY_COOKIE);
  jar.set(RECOVERY_COOKIE, "", recoveryCookieOptions(0));
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

  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const accessFromForm = String(formData.get("access_token") ?? "").trim();
  const totp = String(formData.get("totp") ?? "").replace(/\s+/g, "");
  const type = otpType(String(formData.get("type") ?? "recovery"));

  let userId: string | undefined;
  let userEmail: string | undefined;
  let accessToken: string | undefined;

  // Token hash is one-time. After the first verify, continue with the
  // returned access token — especially when MFA (AAL2) is still required.
  if (totp && accessFromForm) {
    const user = await getUserWithAccessToken(accessFromForm);
    if (!user) {
      return {
        error:
          "Sitzung abgelaufen. Bitte den Link in der E-Mail erneut öffnen oder einen neuen anfordern.",
      };
    }
    userId = user.id;
    userEmail = user.email;
    accessToken = accessFromForm;
  } else if (tokenHash) {
    const verified = await verifyRecoveryTokenHash(tokenHash, type);
    if ("error" in verified) {
      return {
        error:
          "Dieser Link ist ungültig oder abgelaufen. Bitte einen neuen anfordern.",
      };
    }
    userId = verified.user.id;
    userEmail = verified.user.email;
    accessToken = verified.accessToken;
  } else if (accessFromForm) {
    const user = await getUserWithAccessToken(accessFromForm);
    if (!user) {
      return {
        error:
          "Sitzung abgelaufen. Bitte den Link in der E-Mail erneut öffnen oder einen neuen anfordern.",
      };
    }
    userId = user.id;
    userEmail = user.email;
    accessToken = accessFromForm;
  } else {
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
    userId = user.id;
    userEmail = user.email ?? undefined;
  }

  if (!userId) {
    return {
      error:
        "Sitzung abgelaufen. Bitte den Link in der E-Mail erneut öffnen oder einen neuen anfordern.",
    };
  }

  if (!isEmailAllowed(userEmail)) {
    return { error: "Dieser Zugang ist nicht freigeschaltet." };
  }

  if (totp && accessToken) {
    const elevated = await elevateMfaSession(accessToken, totp);
    if ("error" in elevated) {
      return {
        error: elevated.error,
        needsMfa: true,
        recoveryAccessToken: accessToken,
      };
    }
    accessToken = elevated.accessToken;
  }

  const setError = await setPasswordCookieFree({
    userId,
    password,
    accessToken,
  });
  if (setError) {
    if (isInsufficientAal(setError)) {
      return {
        error:
          "Zwei-Faktor ist aktiv. Bitte den Code aus der Authenticator-App eingeben und speichern.",
        needsMfa: true,
        recoveryAccessToken: accessToken,
      };
    }
    return { error: mapPasswordUpdateError(setError) };
  }

  if (userEmail) {
    const supabase = await createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });
    if (signError) {
      await clearRecoveryCookie();
      redirect("/");
    }
  }

  await clearRecoveryCookie();
  return redirectAfterAuth();
}
