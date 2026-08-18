import { authEmailFrom } from "@/lib/auth/email-from";
import type { Locale } from "@/i18n/config";
import { translate } from "@/i18n/translate";

export type AuthEmailAction =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email_change_new"
  | "reauthentication"
  | string;

export type AuthEmailData = {
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  email_action_type?: AuthEmailAction;
  site_url?: string;
  token_new?: string;
  token_hash_new?: string;
  old_email?: string;
};

function confirmationUrl(email: AuthEmailData): string {
  const site = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.peugeotcontrol.app"
  ).replace(/\/$/, "");
  const type =
    email.email_action_type === "signup"
      ? "email"
      : (email.email_action_type ?? "email");
  const params = new URLSearchParams({
    token_hash: email.token_hash ?? "",
    type,
  });
  // Recovery must not hit /auth/confirm on GET — mail scanners would
  // consume the one-time token before the user opens the form.
  if (type === "recovery") {
    return `${site}/auth/reset?${params.toString()}`;
  }
  return `${site}/auth/confirm?${params.toString()}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#3da8a0;color:#031016;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${label}</a></p>`;
}

function wrap(title: string, inner: string, ignore: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f4f7f7;font-family:system-ui,sans-serif;color:#132026">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #d7e2e0">
    <p style="margin:0 0 8px;letter-spacing:.18em;text-transform:uppercase;font-size:11px;color:#5f7a78">Peugeot Control</p>
    <h1 style="margin:0 0 16px;font-size:22px">${title}</h1>
    ${inner}
    <p style="margin:28px 0 0;font-size:12px;color:#5f7a78">${ignore}</p>
  </div>
</body></html>`;
}

export function buildAuthEmail(
  email: AuthEmailData,
  locale: Locale = "en",
): {
  subject: string;
  html: string;
  text: string;
} {
  const type = email.email_action_type ?? "signup";
  const url = confirmationUrl(email);
  const token = email.token ?? "";
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const ignore = t("mail.ignore");

  const subjects: Record<string, string> = {
    signup: t("mail.signupSubject"),
    invite: t("mail.inviteSubject"),
    magiclink: t("mail.magicSubject"),
    recovery: t("mail.recoverySubject"),
    email_change: t("mail.emailChangeSubject"),
    email_change_new: t("mail.emailChangeSubject"),
    reauthentication: t("mail.reauthSubject"),
  };
  const subject = subjects[type] ?? "Peugeot Control";

  if (type === "reauthentication") {
    return {
      subject,
      html: wrap(
        t("mail.reauthTitle"),
        `<p>${t("mail.reauthBody")}</p><p style="font-size:28px;letter-spacing:.2em;font-weight:700">${escapeHtml(token)}</p>`,
        ignore,
      ),
      text: `${t("mail.reauthBody")} ${token}`,
    };
  }

  const copy: Record<string, { title: string; body: string; label: string }> = {
    signup: {
      title: t("mail.signupTitle"),
      body: t("mail.signupBody"),
      label: t("mail.signupCta"),
    },
    invite: {
      title: t("mail.inviteTitle"),
      body: t("mail.inviteBody"),
      label: t("mail.inviteCta"),
    },
    magiclink: {
      title: t("mail.magicTitle"),
      body: t("mail.magicBody"),
      label: t("mail.magicCta"),
    },
    recovery: {
      title: t("mail.recoveryTitle"),
      body: t("mail.recoveryBody"),
      label: t("mail.recoveryCta"),
    },
    email_change: {
      title: t("mail.emailChangeTitle"),
      body: t("mail.emailChangeBody"),
      label: t("mail.emailChangeCta"),
    },
    email_change_new: {
      title: t("mail.emailChangeTitle"),
      body: t("mail.emailChangeBody"),
      label: t("mail.emailChangeCta"),
    },
  };

  const chosen = copy[type] ?? copy.signup;
  return {
    subject,
    html: wrap(
      chosen.title,
      `<p>${chosen.body}</p>${button(url, chosen.label)}`,
      ignore,
    ),
    text: `${chosen.title}\n\n${chosen.body}\n\n${url}`,
  };
}

export async function sendAuthEmail(
  to: string,
  email: AuthEmailData,
  locale: Locale = "en",
): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY missing");
  const { subject, html, text } = buildAuthEmail(email, locale);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: authEmailFrom(),
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`resend ${res.status}: ${detail}`);
  }
}
