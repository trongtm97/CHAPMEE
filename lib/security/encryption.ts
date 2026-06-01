import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const PREFIX = "enc:v1:";

function getKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    return null;
  }
  return scryptSync(secret, "chapmee-sepay-settings", 32);
}

export function encryptServerSecret(value: string) {
  const key = getKey();
  if (!key) {
    throw new Error("Missing ENCRYPTION_KEY for server-side secret storage.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64")}`;
}

export function decryptServerSecret(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith(PREFIX)) return null;

  const key = getKey();
  if (!key) return null;

  try {
    const payload = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function maskSecret(value: string | null | undefined) {
  if (!value) return "";
  const tail = value.slice(-4);
  return `${"*".repeat(8)}${tail}`;
}
