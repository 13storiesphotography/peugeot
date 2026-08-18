import { authEmailFrom } from "@/lib/auth/email-from";

/** Fire-and-forget owner alert for a new registration. */
export async function notifyNewSignup(email: string): Promise<void> {
  const tasks: Promise<void>[] = [];
  const topic = process.env.NTFY_TOPIC?.trim();
  const webhook = process.env.SIGNUP_NOTIFY_WEBHOOK?.trim();
  const notifyEmail = process.env.SIGNUP_NOTIFY_EMAIL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const usersUrl =
    "https://supabase.com/dashboard/project/eujcsyslqpjhmnexearg/auth/users";

  if (topic) {
    tasks.push(
      fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
        method: "POST",
        headers: {
          Title: "Peugeot Control",
          Tags: "bust_in_silhouette",
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

  if (resendKey && notifyEmail) {
    tasks.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: authEmailFrom(),
          to: [notifyEmail],
          subject: `Neue Registrierung: ${email}`,
          text: `${email} hat sich bei Peugeot Control registriert.\n\n${usersUrl}`,
        }),
      }).then((res) => {
        if (!res.ok) throw new Error(`resend ${res.status}`);
      }),
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
