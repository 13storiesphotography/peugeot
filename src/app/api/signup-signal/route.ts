import { NextResponse } from "next/server";
import { notifySignupEvent } from "@/lib/auth/notify-signup";

export const runtime = "nodejs";

const MAX_EMAIL = 254;
const MAX_DETAIL = 280;

/** Simple per-instance dedupe to cut refresh spam (best-effort on serverless). */
const recent = new Map<string, number>();
const DEDUPE_MS = 15 * 60 * 1000;

function sanitizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase().slice(0, MAX_EMAIL);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function sanitizeDetail(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const detail = raw.trim().slice(0, MAX_DETAIL);
  return detail || undefined;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const type = payload.type;
  if (type !== "abandoned") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const email = sanitizeEmail(payload.email);
  if (!email) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const key = `abandoned:${email}`;
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < DEDUPE_MS) {
    return NextResponse.json({ ok: true, deduped: true });
  }
  recent.set(key, now);

  // Bound map size
  if (recent.size > 500) {
    for (const [k, ts] of recent) {
      if (now - ts > DEDUPE_MS) recent.delete(k);
    }
  }

  try {
    await notifySignupEvent({
      kind: "signup_abandoned",
      email,
      detail: sanitizeDetail(payload.detail),
    });
  } catch (err) {
    console.warn("signup-signal:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
