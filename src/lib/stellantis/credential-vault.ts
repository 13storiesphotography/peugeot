import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypt MyPeugeot password at rest so we can silently re-login when
 * Peugeot invalidates the OAuth refresh token.
 *
 * Prefer PEUGEOT_VAULT_KEY (stable across CRON_SECRET rotations).
 * Falls back to CRON_SECRET. Never uses a hardcoded default.
 */
function vaultKey(): Buffer {
  const secret =
    process.env.PEUGEOT_VAULT_KEY?.trim() ||
    process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "PEUGEOT_VAULT_KEY oder CRON_SECRET fehlt — Passwort-Vault nicht möglich.",
    );
  }
  return createHash("sha256").update(`peugeot-vault:${secret}`).digest();
}

export function encryptPeugeotPassword(password: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const enc = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptPeugeotPassword(payload: string): string | null {
  const raw = payload?.trim();
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const data = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", vaultKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
