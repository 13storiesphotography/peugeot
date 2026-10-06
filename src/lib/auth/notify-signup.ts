import { authEmailFrom } from "@/lib/auth/email-from";

const DEFAULT_NOTIFY_EMAIL = "florian@tutzinger-knolls.de";
const USERS_URL =
  "https://supabase.com/dashboard/project/eujcsyslqpjhmnexearg/auth/users";

export type SignupNotifyKind =
  | "signup"
  | "signup_failed"
  | "signup_abandoned";

function notifyRecipients(): string[] {
  const extra = (process.env.SIGNUP_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([DEFAULT_NOTIFY_EMAIL, ...extra])];
}

function titles(kind: SignupNotifyKind): {
  subject: string;
  ntfyTitle: string;
  ntfyTags: string;
} {
  switch (kind) {
    case "signup_failed":
      return {
        subject: "Registrierung fehlgeschlagen",
        ntfyTitle: "Peugeot Control · Signup-Problem",
        ntfyTags: "warning",
      };
    case "signup_abandoned":
      return {
        subject: "Registrierung abgebrochen",
        ntfyTitle: "Peugeot Control · Signup abgebrochen",
        ntfyTags: "wave",
      };
    default:
      return {
        subject: "Neue Registrierung",
        ntfyTitle: "Peugeot Control",
        ntfyTags: "bust_in_silhouette",
      };
  }
}

function bodyText(
  kind: SignupNotifyKind,
  email: string,
  detail?: string,
): string {
  const extra = detail?.trim() ? `\nDetails: ${detail.trim()}` : "";
  switch (kind) {
    case "signup_failed":
      return `${email} hat die Registrierung versucht — fehlgeschlagen.${extra}\n\n${USERS_URL}`;
    case "signup_abandoned":
      return `${email} hat die Registrierung angefangen und die Seite verlassen (ohne erfolgreichen Abschluss).${extra}\n\n${USERS_URL}`;
    default:
      return `${email} hat sich bei Peugeot Control registriert.${extra}\n\n${USERS_URL}`;
  }
}

/** Fire-and-forget owner alert for signup funnel events. */
export async function notifySignupEvent(opts: {
  kind: SignupNotifyKind;
  email: string;
  detail?: string;
}): Promise<void> {
  const email = opts.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return;

  const tasks: Promise<void>[] = [];
  const topic = process.env.NTFY_TOPIC?.trim();
  const webhook = process.env.SIGNUP_NOTIFY_WEBHOOK?.trim();
  const recipients = notifyRecipients();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const { subject, ntfyTitle, ntfyTags } = titles(opts.kind);
  const text = bodyText(opts.kind, email, opts.detail);

  if (topic) {
    tasks.push(
      fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
        method: "POST",
        headers: {
          Title: ntfyTitle,
          Tags: ntfyTags,
          Priority: opts.kind === "signup" ? "default" : "high",
          Email: recipients.join(","),
        },
        body: text.split("\n")[0] ?? text,
      }).then((res) => {
        if (!res.ok) throw new Error(`ntfy ${res.status}`);
      }),
    );
  }

  if (webhook) {
    tasks.push(
      fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: opts.kind,
          email,
          detail: opts.detail ?? null,
          at: new Date().toISOString(),
        }),
      }).then((res) => {
        if (!res.ok) throw new Error(`webhook ${res.status}`);
      }),
    );
  }

  if (resendKey) {
    tasks.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: authEmailFrom(),
          to: recipients,
          subject: `${subject}: ${email}`,
          text,
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
      }),
    );
  } else if (opts.kind === "signup") {
    console.error(
      "signup notify: RESEND_API_KEY fehlt — keine Mail an",
      recipients.join(", "),
    );
  }

  if (tasks.length === 0) {
    console.warn(
      "signup notify: kein Kanal (RESEND_API_KEY / NTFY_TOPIC / SIGNUP_NOTIFY_WEBHOOK)",
      opts.kind,
      email,
    );
    return;
  }

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") {
      console.warn("signup notify:", result.reason);
    }
  }
}

/** @deprecated Prefer notifySignupEvent({ kind: "signup", email }) */
export async function notifyNewSignup(email: string): Promise<void> {
  await notifySignupEvent({ kind: "signup", email });
}
