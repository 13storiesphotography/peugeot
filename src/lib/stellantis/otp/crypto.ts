import { createHash, createPublicKey, publicEncrypt, constants, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const EXPONENT = 0x11; // "11" hex

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1);
  let b = base % mod;
  let e = exp;
  while (e > BigInt(0)) {
    if (e & BigInt(1)) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= BigInt(1);
  }
  return result;
}

function bigintToFixedBuffer(value: bigint, size: number): Buffer {
  let hex = value.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  const buf = Buffer.from(hex, "hex");
  if (buf.length === size) return buf;
  if (buf.length > size) return buf.subarray(buf.length - size);
  return Buffer.concat([Buffer.alloc(size - buf.length), buf]);
}

function bufferToBigInt(buf: Buffer): bigint {
  return BigInt(`0x${buf.toString("hex") || "0"}`);
}

function mgf1(seed: Buffer, length: number): Buffer {
  const out: Buffer[] = [];
  let counter = 0;
  while (Buffer.concat(out).length < length) {
    const c = Buffer.alloc(4);
    c.writeUInt32BE(counter);
    out.push(createHash("sha256").update(seed).update(c).digest());
    counter += 1;
  }
  return Buffer.concat(out).subarray(0, length);
}

function xor(a: Buffer, b: Buffer): Buffer {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i]! ^ b[i]!;
  return out;
}

export function publicKeyFromModulusHex(modulusHex: string) {
  const n = Buffer.from(modulusHex, "hex");
  return createPublicKey({
    format: "jwk",
    key: {
      kty: "RSA",
      n: n.toString("base64url"),
      e: Buffer.from([EXPONENT]).toString("base64url"),
    },
  });
}

/** Standard RSA-OAEP-SHA256 encrypt with public modulus. */
export function oaepEncrypt(modulusHex: string, plaintext: Buffer): Buffer {
  return publicEncrypt(
    {
      key: publicKeyFromModulusHex(modulusHex),
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    plaintext,
  );
}

/**
 * PSA Inwebo "decrypt" with the public exponent (pow(c,e,n) + OAEP unpad).
 * Used when decoding Kiw / ms_key blobs.
 */
export function oaepPublicDecode(modulusHex: string, ciphertextHex: string): string {
  const n = BigInt(`0x${modulusHex}`);
  const e = BigInt(EXPONENT);
  const enc = Buffer.from(ciphertextHex, "hex");
  const blockSize = 128;
  const blocks = Math.ceil(enc.length / blockSize);
  let decoded = "";

  for (let x = 0; x < blocks; x++) {
    const maxi = x === blocks - 1 ? enc.length : (x + 1) * blockSize;
    const chunk = enc.subarray(x * blockSize, maxi);
    const k = chunk.length;
    const ctInt = bufferToBigInt(chunk);
    const mInt = modPow(ctInt, e, n);
    const em = bigintToFixedBuffer(mInt, k);
    const hLen = 32;
    const maskedSeed = em.subarray(1, hLen + 1);
    const maskedDb = em.subarray(hLen + 1);
    const seedMask = mgf1(maskedDb, hLen);
    const seed = xor(maskedSeed, seedMask);
    const dbMask = mgf1(seed, k - hLen - 1);
    const db = xor(maskedDb, dbMask);
    const onePos = db.subarray(hLen).indexOf(0x01);
    if (onePos < 0) throw new Error("OAEP decode failed");
    decoded += db.subarray(hLen + onePos + 1).toString("hex");
  }
  return decoded;
}

export function aesEcbEncryptRaw(keyHex: string, data: Buffer): Buffer {
  const key = Buffer.from(keyHex, "hex");
  if (data.length % 16 !== 0) {
    throw new Error("AES-ECB data must be a multiple of 16 bytes");
  }
  const cipher = createCipheriv("aes-128-ecb", key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

export function aesEcbDecrypt(keyHex: string, data: Buffer): Buffer {
  const key = Buffer.from(keyHex, "hex");
  if (data.length % 16 !== 0) {
    throw new Error("AES-ECB data must be a multiple of 16 bytes");
  }
  const decipher = createDecipheriv("aes-128-ecb", key, null);
  decipher.setAutoPadding(false);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

export function randomBuf(bytes: number): Buffer {
  return randomBytes(bytes);
}
