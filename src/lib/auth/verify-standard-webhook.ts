import { createHmac, timingSafeEqual } from "node:crypto";

/** Verify a Standard Webhooks signature from a Supabase Auth hook. */
export function verifyStandardWebhook(
  payload: string,
  headers: Headers,
  secretRaw: string,
): boolean {
  const secret = secretRaw.replace(/^v1,/, "").replace(/^whsec_/, "");
  const key = Buffer.from(secret, "base64");
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");

  return signatureHeader.split(" ").some((part) => {
    const provided = part.replace(/^v1,/, "");
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
