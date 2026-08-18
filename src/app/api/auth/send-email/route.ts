import { sendAuthEmail, type AuthEmailData } from "@/lib/auth/send-auth-email";
import { verifyStandardWebhook } from "@/lib/auth/verify-standard-webhook";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HookPayload = {
  user?: { email?: string; user_metadata?: { locale?: string } };
  email_data?: AuthEmailData;
};

export async function POST(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET?.trim();
  if (!secret || !process.env.RESEND_API_KEY?.trim()) {
    return Response.json({ error: "Auth mail not configured" }, { status: 503 });
  }

  const payload = await request.text();
  if (!verifyStandardWebhook(payload, request.headers, secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: HookPayload;
  try {
    body = JSON.parse(payload) as HookPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = body.user?.email?.trim();
  if (!to || !body.email_data) {
    return Response.json({ error: "Missing email payload" }, { status: 400 });
  }

  try {
    const locale = isLocale(body.user?.user_metadata?.locale)
      ? body.user.user_metadata.locale
      : "en";
    await sendAuthEmail(to, body.email_data, locale);
  } catch (error) {
    const message = error instanceof Error ? error.message : "send failed";
    console.error("auth send-email:", message);
    return Response.json({ error: { message } }, { status: 500 });
  }

  return Response.json({});
}
