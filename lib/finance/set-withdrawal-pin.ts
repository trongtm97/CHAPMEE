"use server";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { consumeVerifiedFinanceEmailCode, sendFinanceEmailCode } from "@/lib/finance/finance-email-code";
import {
  getCreatorWithdrawalSecurity,
  upsertCreatorWithdrawalSecurity
} from "@/lib/supabase/creator-finance";
import { logFinanceSecurityEvent } from "@/lib/finance/log-finance-security";
import { verifyWithdrawalPin } from "@/lib/finance/verify-withdrawal-pin";
import {
  hashWithdrawalPin,
  isValidWithdrawalPin
} from "@/lib/finance/withdrawal-pin-crypto";

export async function setWithdrawalPin(input: {
  pin: string;
  confirmPin: string;
  emailCode: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  if (!isValidWithdrawalPin(input.pin)) {
    return {
      ok: false,
      error: "Mã PIN phải gồm 6 chữ số và không được quá đơn giản."
    };
  }
  if (input.pin !== input.confirmPin) {
    return { ok: false, error: "Mã PIN xác nhận không khớp." };
  }

  const codeCheck = await consumeVerifiedFinanceEmailCode({
    purpose: "setup_pin",
    code: input.emailCode
  });
  if (!codeCheck.ok) {
    return { ok: false, error: codeCheck.error ?? "Mã xác nhận email không hợp lệ." };
  }

  const existing = await getCreatorWithdrawalSecurity(profile.id);
  if (existing.data?.pin_hash) {
    return { ok: false, error: "Bạn đã có PIN. Hãy dùng chức năng đổi PIN." };
  }

  const pinHash = hashWithdrawalPin(input.pin);
  const updated = await upsertCreatorWithdrawalSecurity({
    creatorUserId: profile.id,
    pinHash,
    pinSetAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null
  });

  if (updated.error) {
    return { ok: false, error: updated.error };
  }

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "withdrawal_pin_set"
  });

  return { ok: true };
}

export async function changeWithdrawalPin(input: {
  currentPin: string;
  newPin: string;
  confirmPin: string;
  emailCode: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const verified = await verifyWithdrawalPin(profile.id, input.currentPin);
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  if (!isValidWithdrawalPin(input.newPin)) {
    return {
      ok: false,
      error: "Mã PIN mới phải gồm 6 chữ số và không được quá đơn giản."
    };
  }
  if (input.newPin !== input.confirmPin) {
    return { ok: false, error: "Mã PIN xác nhận không khớp." };
  }

  const codeCheck = await consumeVerifiedFinanceEmailCode({
    purpose: "change_pin",
    code: input.emailCode
  });
  if (!codeCheck.ok) {
    return { ok: false, error: codeCheck.error ?? "Mã xác nhận email không hợp lệ." };
  }

  const updated = await upsertCreatorWithdrawalSecurity({
    creatorUserId: profile.id,
    pinHash: hashWithdrawalPin(input.newPin),
    pinSetAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null
  });

  if (updated.error) {
    return { ok: false, error: updated.error };
  }

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "withdrawal_pin_changed"
  });

  return { ok: true };
}

export async function resetWithdrawalPin(input: {
  emailCode: string;
  newPin: string;
  confirmPin: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  if (!isValidWithdrawalPin(input.newPin)) {
    return {
      ok: false,
      error: "Mã PIN mới phải gồm 6 chữ số và không được quá đơn giản."
    };
  }
  if (input.newPin !== input.confirmPin) {
    return { ok: false, error: "Mã PIN xác nhận không khớp." };
  }

  const codeCheck = await consumeVerifiedFinanceEmailCode({
    purpose: "reset_pin",
    code: input.emailCode
  });
  if (!codeCheck.ok) {
    return { ok: false, error: codeCheck.error ?? "Mã xác nhận email không hợp lệ." };
  }

  const updated = await upsertCreatorWithdrawalSecurity({
    creatorUserId: profile.id,
    pinHash: hashWithdrawalPin(input.newPin),
    pinSetAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null
  });

  if (updated.error) {
    return { ok: false, error: updated.error };
  }

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "withdrawal_pin_reset"
  });

  return { ok: true };
}

export async function requestSetupPinEmailCode() {
  return sendFinanceEmailCode({ purpose: "setup_pin" });
}

export async function requestChangePinEmailCode() {
  return sendFinanceEmailCode({ purpose: "change_pin" });
}

export async function requestResetPinEmailCode() {
  return sendFinanceEmailCode({ purpose: "reset_pin" });
}
