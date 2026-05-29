"use server";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
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
}): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  if (!isValidWithdrawalPin(input.pin)) {
    return { ok: false, error: "Mã PIN phải gồm 6 chữ số." };
  }
  if (input.pin !== input.confirmPin) {
    return { ok: false, error: "Mã PIN xác nhận không khớp." };
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
    return { ok: false, error: "Mã PIN mới phải gồm 6 chữ số." };
  }
  if (input.newPin !== input.confirmPin) {
    return { ok: false, error: "Mã PIN xác nhận không khớp." };
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
