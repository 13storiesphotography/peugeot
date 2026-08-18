import { authEmailFrom } from "@/lib/auth/email-from";

const DEFAULT_NOTIFY_EMAIL = "florian@tutzinger-knolls.de";
const USERS_URL =
  "https://supabase.com/dashboard/project/eujcsyslqpjhmnexearg/auth/users";

function notifyRecipients(): string[] {
  const extra = (process.env.SIGNUP_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([DEFAULT_NOTIFY_EMAIL, ...extra])];
}

/** Fire-and-forget owner alert for a new registration. */
export async function notifyNewSignup(email: string): Promise<void> {
  const tasks: Promise<void>[] = [];
  const topic = process.env.NTFY_TOPIC?.trim();
  const webhook = process.env.SIGNUP_NOTIFY_WEBHOOK?.trim();
  const recipients = notifyRecipients();
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (topic) {
    tasks.push(
      fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
        method: "POST",
        headers: {
          Title: "Peugeot Control",
          Tags: "bust_in_silhouette",
          Email: recipients.join(","),
        },
        body: `Neue Registrierung: ${email}`,
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
          type: "signup",
          email,
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
          subject: `Neue Registrierung: ${email}`,
          text: `${email} hat sich bei Peugeot Control registriert.\n\n${USERS_URL}`,
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
      }),
    );
  } else {
    console.error(
      "signup notify: RESEND_API_KEY fehlt — keine Mail an",
      recipients.join(", "),
    );
  }

  if (tasks.length === 0) return;

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") {
      console.warn("signup notify:", result.reason);
    }
  }
}
