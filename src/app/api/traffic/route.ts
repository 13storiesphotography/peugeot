import { NextResponse } from "next/server";
import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_PATH = 200;
const MAX_REF = 300;
const MAX_VISITOR = 64;

function sanitizePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, MAX_PATH);
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/api/")) return null;
  if (trimmed.startsWith("/_next")) return null;
  return trimmed || "/";
}

function sanitizeVisitor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim().slice(0, MAX_VISITOR);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}

function sanitizeReferrer(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const url = new URL(raw);
    return url.hostname.slice(0, MAX_REF);
  } catch {
    return raw.trim().slice(0, MAX_REF);
  }
}

export async function POST(request: Request) {
  if (!getServiceRoleKey() || !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const path = sanitizePath(payload.path);
  const visitorId = sanitizeVisitor(payload.visitorId);
  if (!path || !visitorId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const referrer = sanitizeReferrer(payload.referrer);

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("page_views").insert({
      path,
      referrer,
      visitor_id: visitorId,
    });
    if (error) {
      console.warn("traffic ingest:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  } catch (err) {
    console.warn("traffic ingest:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
