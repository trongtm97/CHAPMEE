import { randomInt, scryptSync, timingSafeEqual } from "crypto";

const CODE_SCRYPT_KEYLEN = 32;
const EMAIL_CODE_COOLDOWN_MS = 60_000;
const EMAIL_CODE_TTL_MS = 10 * 60_000;

const WEAK_PINS = new Set(["000000", "111111", "123456", "654321", "121212", "112233"]);

export function normalizePersonName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  return normalizePersonName(a) === normalizePersonName(b);
}

export function isWeakWithdrawalPin(pin: string): boolean {
  return WEAK_PINS.has(pin.trim());
}

export function generateEmailVerificationCode(): string {
  return String(randomInt(100000, 999999));
}

export function hashEmailVerificationCode(code: string): string {
  const salt = "finance-email-code";
  const hash = scryptSync(code.trim(), salt, CODE_SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${hash}`;
}

export function verifyEmailVerificationCode(code: string, storedHash: string): boolean {
  if (!storedHash.startsWith("scrypt:")) return false;
  const expectedHex = storedHash.slice("scrypt:".length);
  const computed = scryptSync(code.trim(), "finance-email-code", CODE_SCRYPT_KEYLEN);
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== computed.length) return false;
  return timingSafeEqual(expected, computed);
}

export function getEmailCodeExpiresAt(from = Date.now()): string {
  return new Date(from + EMAIL_CODE_TTL_MS).toISOString();
}

export function canResendEmailCode(lastSentAt: string | null, now = Date.now()): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  if (!lastSentAt) return { allowed: true, retryAfterSeconds: 0 };
  const elapsed = now - new Date(lastSentAt).getTime();
  if (elapsed >= EMAIL_CODE_COOLDOWN_MS) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    retryAfterSeconds: Math.ceil((EMAIL_CODE_COOLDOWN_MS - elapsed) / 1000)
  };
}

export function getBankChangeLockUntil(from = Date.now()): string {
  return new Date(from + 24 * 60 * 60_000).toISOString();
}

export function isLockActive(lockedUntil: string | null | undefined, now = Date.now()): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > now;
}

export function formatLockRemaining(lockedUntil: string | null | undefined, now = Date.now()): string | null {
  if (!lockedUntil || !isLockActive(lockedUntil, now)) return null;
  const ms = new Date(lockedUntil).getTime() - now;
  const hours = Math.floor(ms / (60 * 60_000));
  const minutes = Math.ceil((ms % (60 * 60_000)) / 60_000);
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

export const FINANCE_EMAIL_CODE_COOLDOWN_SECONDS = EMAIL_CODE_COOLDOWN_MS / 1000;
