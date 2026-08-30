"use server";

import { headers } from "next/headers";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { consumeVerifiedFinanceEmailCode, sendFinanceEmailCode } from "@/lib/finance/finance-email-code";
import { getFinanceIdentityStatus } from "@/lib/finance/get-finance-identity-status";
import {
  getBankChangeLockUntil,
  namesMatch,
  normalizePersonName
} from "@/lib/finance/finance-security-utils";
import { logFinanceSecurityEvent } from "@/lib/finance/log-finance-security";
import { maskAccountNumber } from "@/lib/finance/mask-payout-account";
import {
  countCreatorPayoutAccounts,
  createCreatorPayoutAccount,
  deleteCreatorPayoutAccount,
  getCreatorPayoutAccountById,
  setDefaultCreatorPayoutAccount,
  updateCreatorPayoutAccount
} from "@/lib/data/payouts";
import type { FinanceSecurityEventType } from "@/types/finance";

async function requestMeta() {
  const headerStore = await headers();
  return {
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent")
  };
}

async function notifyAdminBankChange(input: {
  userId: string;
  action: string;
  accountId: string;
  bankName: string;
  masked: string;
  lockedUntil: string | null;
}) {
  const meta = await requestMeta();
  await logAdminAction({
    actorId: input.userId,
    action: "creator_payout_bank_changed",
    targetType: "creator",
    targetId: input.userId,
    metadata: {
      bank_account_id: input.accountId,
      action: input.action,
      bank_name: input.bankName,
      account_masked: input.masked,
      locked_until: input.lockedUntil
    },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent
  });
}

function sensitiveFieldsChanged(
  previous: {
    accountHolderName: string | null;
    bankName: string | null;
    bankAccountNumberMasked: string | null;
    bankBranch: string | null;
  },
  next: {
    accountHolderName: string;
    bankName: string;
    bankAccountNumberMasked: string;
    bankBranch: string | null;
  }
): boolean {
  return (
    normalizePersonName(previous.accountHolderName ?? "") !==
      normalizePersonName(next.accountHolderName) ||
    (previous.bankName ?? "").trim() !== next.bankName.trim() ||
    (previous.bankAccountNumberMasked ?? "") !== next.bankAccountNumberMasked ||
    (previous.bankBranch ?? "") !== (next.bankBranch ?? "")
  );
}

export async function addBankAccount(input: {
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  bankBranch?: string;
  confirmOwnership: boolean;
  setAsDefault?: boolean;
}): Promise<{ ok: boolean; error?: string; accountId?: string }> {
  const { profile, user } = await getCurrentUser();
  if (!profile?.id || !user) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  if (!input.confirmOwnership) {
    return { ok: false, error: "Vui lòng xác nhận tài khoản ngân hàng thuộc về bạn." };
  }

  const holder = input.accountHolderName.trim();
  const bankName = input.bankName.trim();
  const accountNumber = input.bankAccountNumber.replace(/\s+/g, "");
  const branch = input.bankBranch?.trim() || null;

  if (!holder || !bankName || !/^\d{6,20}$/.test(accountNumber)) {
    return { ok: false, error: "Vui lòng nhập đầy đủ thông tin ngân hàng hợp lệ." };
  }

  const identity = await getFinanceIdentityStatus(profile.id);
  if (identity.status === "verified" && identity.verifiedName && !namesMatch(identity.verifiedName, holder)) {
    return {
      ok: false,
      error: "Tên chủ tài khoản không khớp với hồ sơ xác thực."
    };
  }

  const bankMasked = maskAccountNumber(accountNumber);
  const lockedUntil = getBankChangeLockUntil();
  const { count } = await countCreatorPayoutAccounts(profile.id);
  const isDefault = input.setAsDefault ?? count === 0;

  const created = await createCreatorPayoutAccount({
    creatorUserId: profile.id,
    method: "bank_transfer",
    accountHolderName: holder,
    bankName,
    bankAccountNumberMasked: bankMasked,
    isDefault,
    metadata: {
      bank_branch: branch,
      account_number_last4: accountNumber.slice(-4)
    }
  });

  if (!created.data) {
    return { ok: false, error: created.error ?? "Không thể thêm tài khoản." };
  }

  await updateCreatorPayoutAccount(created.data.id, profile.id, {
    bank_branch: branch,
    verification_status: "pending",
    withdrawal_locked_until: lockedUntil,
    email_verified_at: null
  });

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "bank_account_added",
    metadata: { account_id: created.data.id, bank_name: bankName, locked_until: lockedUntil }
  });

  await notifyAdminBankChange({
    userId: profile.id,
    action: "added",
    accountId: created.data.id,
    bankName,
    masked: bankMasked,
    lockedUntil
  });

  await sendFinanceEmailCode({ purpose: "verify_bank_account" });

  return { ok: true, accountId: created.data.id };
}

export async function updateBankAccount(input: {
  accountId: string;
  accountHolderName: string;
  bankName: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  confirmOwnership: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  if (!input.confirmOwnership) {
    return { ok: false, error: "Vui lòng xác nhận tài khoản ngân hàng thuộc về bạn." };
  }

  const existing = await getCreatorPayoutAccountById(input.accountId, profile.id);
  if (!existing.data) {
    return { ok: false, error: existing.error ?? "Không tìm thấy tài khoản." };
  }

  const holder = input.accountHolderName.trim();
  const bankName = input.bankName.trim();
  const branch = input.bankBranch?.trim() || null;
  const accountNumber = input.bankAccountNumber?.replace(/\s+/g, "") ?? "";
  const bankMasked = accountNumber
    ? maskAccountNumber(accountNumber)
    : existing.data.bank_account_number_masked;

  if (!holder || !bankName || !bankMasked) {
    return { ok: false, error: "Thông tin ngân hàng không hợp lệ." };
  }
  if (accountNumber && !/^\d{6,20}$/.test(accountNumber)) {
    return { ok: false, error: "Số tài khoản không hợp lệ." };
  }

  const identity = await getFinanceIdentityStatus(profile.id);
  if (identity.status === "verified" && identity.verifiedName && !namesMatch(identity.verifiedName, holder)) {
    return {
      ok: false,
      error: "Tên chủ tài khoản không khớp với hồ sơ xác thực."
    };
  }

  const changed = sensitiveFieldsChanged(
    {
      accountHolderName: existing.data.account_holder_name,
      bankName: existing.data.bank_name,
      bankAccountNumberMasked: existing.data.bank_account_number_masked,
      bankBranch: existing.data.bank_branch ?? null
    },
    {
      accountHolderName: holder,
      bankName,
      bankAccountNumberMasked: bankMasked,
      bankBranch: branch
    }
  );

  const lockedUntil = changed ? getBankChangeLockUntil() : existing.data.withdrawal_locked_until ?? null;

  const updated = await updateCreatorPayoutAccount(input.accountId, profile.id, {
    account_holder_name: holder,
    bank_name: bankName,
    bank_account_number_masked: bankMasked,
    bank_branch: branch,
    verification_status: changed ? "pending" : existing.data.verification_status,
    withdrawal_locked_until: lockedUntil,
    email_verified_at: changed ? null : existing.data.email_verified_at ?? null
  });

  if (!updated.data) {
    return { ok: false, error: updated.error ?? "Không thể cập nhật tài khoản." };
  }

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "bank_account_updated",
    metadata: { account_id: input.accountId, changed, locked_until: lockedUntil }
  });

  if (changed) {
    await notifyAdminBankChange({
      userId: profile.id,
      action: "updated",
      accountId: input.accountId,
      bankName,
      masked: bankMasked,
      lockedUntil
    });
    await sendFinanceEmailCode({ purpose: "verify_bank_account" });
  }

  return { ok: true };
}

export async function removeBankAccount(accountId: string): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const existing = await getCreatorPayoutAccountById(accountId, profile.id);
  if (!existing.data) {
    return { ok: false, error: "Không tìm thấy tài khoản." };
  }

  const removed = await deleteCreatorPayoutAccount(accountId, profile.id);
  if (!removed.ok) {
    return { ok: false, error: removed.error ?? "Không thể xóa tài khoản." };
  }

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "bank_account_deleted",
    metadata: { account_id: accountId }
  });

  await notifyAdminBankChange({
    userId: profile.id,
    action: "deleted",
    accountId,
    bankName: existing.data.bank_name ?? "",
    masked: existing.data.bank_account_number_masked ?? "",
    lockedUntil: null
  });

  return { ok: true };
}

export async function setDefaultBankAccount(accountId: string): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const existing = await getCreatorPayoutAccountById(accountId, profile.id);
  if (!existing.data) {
    return { ok: false, error: "Không tìm thấy tài khoản." };
  }

  const updated = await setDefaultCreatorPayoutAccount(accountId, profile.id);
  if (!updated.data) {
    return { ok: false, error: updated.error ?? "Không thể đặt mặc định." };
  }

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "bank_account_default_set",
    metadata: { account_id: accountId }
  });

  await notifyAdminBankChange({
    userId: profile.id,
    action: "set_default",
    accountId,
    bankName: existing.data.bank_name ?? "",
    masked: existing.data.bank_account_number_masked ?? "",
    lockedUntil: existing.data.withdrawal_locked_until ?? null
  });

  return { ok: true };
}

export async function resendBankAccountEmailCode(): Promise<{ ok: boolean; error?: string }> {
  return sendFinanceEmailCode({ purpose: "verify_bank_account" });
}

export async function confirmBankAccountEmail(input: {
  code: string;
  accountId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const verified = await consumeVerifiedFinanceEmailCode({
    purpose: "verify_bank_account",
    code: input.code
  });
  if (!verified.ok) {
    return verified;
  }

  let accountId = input.accountId;
  if (!accountId) {
    const { listCreatorPayoutAccounts } = await import("@/lib/data/payouts");
    const accounts = await listCreatorPayoutAccounts(profile.id);
    const pending =
      accounts.data?.find((a) => a.verification_status === "pending") ?? accounts.data?.[0];
    accountId = pending?.id;
  }

  if (!accountId) {
    return { ok: false, error: "Không tìm thấy tài khoản cần xác thực." };
  }

  const now = new Date().toISOString();
  await updateCreatorPayoutAccount(accountId, profile.id, {
    verification_status: "verified",
    email_verified_at: now
  });

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "bank_account_email_verified",
    metadata: { account_id: accountId }
  });

  return { ok: true };
}

/** @deprecated use addBankAccount / updateBankAccount */
export async function savePayoutBankProfile() {
  return { ok: false as const, error: "Vui lòng dùng module Tài khoản nhận tiền mới." };
}

export async function requestPayoutVerification() {
  return { ok: false as const, error: "Xác thực danh tính tại /studio/settings/verification." };
}

export async function confirmPayoutVerification() {
  return { ok: false as const, error: "Xác thực danh tính tại /studio/settings/verification." };
}

export async function confirmBankChangeVerification(input: { code: string }) {
  return confirmBankAccountEmail({ code: input.code });
}
