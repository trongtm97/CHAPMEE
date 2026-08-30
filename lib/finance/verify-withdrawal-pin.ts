"use server";

import {
  getCreatorWithdrawalSecurity,
  upsertCreatorWithdrawalSecurity
} from "@/lib/data/creator-finance";
import { logFinanceSecurityEvent } from "@/lib/finance/log-finance-security";
import {
  isValidWithdrawalPin,
  verifyWithdrawalPinHash
} from "@/lib/finance/withdrawal-pin-crypto";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 30;

function isLocked(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > Date.now();
}

export async function verifyWithdrawalPin(
  creatorUserId: string,
  pin: string
): Promise<{ ok: boolean; error?: string; lockedUntil?: string | null }> {
  if (!isValidWithdrawalPin(pin)) {
    return { ok: false, error: "Mã PIN phải gồm 6 chữ số." };
  }

  const security = await getCreatorWithdrawalSecurity(creatorUserId);
  if (security.error) {
    return { ok: false, error: security.error };
  }

  if (!security.data?.pin_hash) {
    return { ok: false, error: "Bạn chưa thiết lập mã PIN rút tiền." };
  }

  if (isLocked(security.data.locked_until)) {
    return {
      ok: false,
      error: "Mã PIN tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.",
      lockedUntil: security.data.locked_until
    };
  }

  const valid = verifyWithdrawalPinHash(pin, security.data.pin_hash);
  if (valid) {
    if (security.data.failed_attempts > 0) {
      await upsertCreatorWithdrawalSecurity({
        creatorUserId,
        failedAttempts: 0,
        lockedUntil: null
      });
    }
    return { ok: true };
  }

  const failedAttempts = (security.data.failed_attempts ?? 0) + 1;
  const lockedUntil =
    failedAttempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      : null;

  await upsertCreatorWithdrawalSecurity({
    creatorUserId,
    failedAttempts,
    lockedUntil
  });

  await logFinanceSecurityEvent({
    creatorUserId,
    eventType: "withdrawal_pin_failed",
    metadata: { failed_attempts: failedAttempts, locked: Boolean(lockedUntil) }
  });

  if (lockedUntil) {
    return {
      ok: false,
      error: `Nhập sai PIN ${MAX_FAILED_ATTEMPTS} lần. Tài khoản rút tiền bị khóa ${LOCK_MINUTES} phút.`,
      lockedUntil
    };
  }

  return {
    ok: false,
    error: `Mã PIN không đúng. Còn ${MAX_FAILED_ATTEMPTS - failedAttempts} lần thử.`
  };
}
