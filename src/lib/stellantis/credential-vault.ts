import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypt MyPeugeot password / PIN at rest.
 *
 * PEUGEOT_VAULT_KEY is required for new encryption (keep it stable across
 * CRON_SECRET rotations). Decrypt tries PEUGEOT_VAULT_KEY first, then
 * CRON_SECRET for legacy ciphertext.
 */

function vaultKeyMaterial(secret: string): Buffer {
  return createHash("sha256").update(`peugeot-vault:${secret}`).digest();
}

function encryptSecrets(): string[] {
  const primary = process.env.PEUGEOT_VAULT_KEY?.trim();
  const legacy = process.env.CRON_SECRET?.trim();
  const out: string[] = [];
  if (primary) out.push(primary);
  if (legacy && legacy !== primary) out.push(legacy);
  return out;
}

function requireEncryptSecret(): string {
  const primary = process.env.PEUGEOT_VAULT_KEY?.trim();
  if (primary) return primary;
  throw new Error(
    "PEUGEOT_VAULT_KEY fehlt — setze einen eigenen Vault-Key (nicht denselben Wert wie CRON_SECRET für neue Deployments).",
  );
}

function sealWith(secret: string, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKeyMaterial(secret), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

function openWith(secret: string, payload: string): string | null {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const data = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      vaultKeyMaterial(secret),
      iv,
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

export function encryptPeugeotPassword(password: string): string {
  return sealWith(requireEncryptSecret(), password);
}

export function decryptPeugeotPassword(payload: string): string | null {
  const raw = payload?.trim();
  if (!raw) return null;
  for (const secret of encryptSecrets()) {
    const opened = openWith(secret, raw);
    if (opened != null) return opened;
  }
  return null;
}

/** AES-GCM wrap for the 4-digit MyPeugeot remote PIN inside otp_state. */
export function sealRemotePin(pin: string): string {
  return sealWith(requireEncryptSecret(), pin);
}

/**
 * Open a stored PIN. Legacy rows may still hold plaintext digits;
 * sealed values start with `v1.`.
 */
export function openRemotePin(stored: string): string {
  const raw = stored?.trim() ?? "";
  if (!raw) return "";
  if (raw.startsWith("v1.")) {
    return decryptPeugeotPassword(raw) ?? "";
  }
  // Legacy plaintext PIN (4 digits) — still usable until next OTP write.
  if (/^\d{4}$/.test(raw)) return raw;
  return "";
}

export function isSealedRemotePin(stored: string | null | undefined): boolean {
  return Boolean(stored?.trim().startsWith("v1."));
}
