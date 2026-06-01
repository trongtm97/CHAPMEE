import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { isWeakWithdrawalPin } from "@/lib/finance/finance-security-utils";

const SCRYPT_KEYLEN = 64;

export function isValidWithdrawalPin(pin: string): boolean {
  if (!/^\d{6}$/.test(pin.trim())) return false;
  if (isWeakWithdrawalPin(pin)) return false;
  return true;
}

export { isWeakWithdrawalPin };

export function hashWithdrawalPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin.trim(), salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyWithdrawalPinHash(pin: string, stored: string | null): boolean {
  if (!stored?.startsWith("scrypt:")) {
    return false;
  }
  const parts = stored.split(":");
  if (parts.length !== 3) {
    return false;
  }
  const [, salt, expectedHex] = parts;
  const computed = scryptSync(pin.trim(), salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== computed.length) {
    return false;
  }
  return timingSafeEqual(expected, computed);
}
