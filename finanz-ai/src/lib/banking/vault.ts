import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function keyBytes() {
  const secret =
    process.env.KONTURA_VAULT_KEY ??
    process.env.FINAPI_VAULT_KEY ??
    process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "KONTURA_VAULT_KEY fehlt (min. 16 Zeichen) — nötig zum Verschlüsseln der finAPI-User-Credentials.",
    );
  }
  return createHash("sha256").update(secret).digest();
}

/** Encrypts a UTF-8 string → base64(iv + tag + ciphertext). */
export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function open(sealed: string): string {
  const buf = Buffer.from(sealed, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function vaultConfigured() {
  const secret =
    process.env.KONTURA_VAULT_KEY ??
    process.env.FINAPI_VAULT_KEY ??
    process.env.CRON_SECRET;
  return Boolean(secret && secret.length >= 16);
}
