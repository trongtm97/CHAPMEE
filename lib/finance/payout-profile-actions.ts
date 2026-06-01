"use server";

import { headers } from "next/headers";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { consumeVerifiedFinanceEmailCode, sendFinanceEmailCode } from "@/lib/finance/finance-email-code";
import {
  getBankChangeLockUntil,
  namesMatch,
  normalizePersonName
} from "@/lib/finance/finance-security-utils";
import { logFinanceSecurityEvent } from "@/lib/finance/log-finance-security";
import { maskAccountNumber } from "@/lib/finance/mask-payout-account";
import { createCreatorPayoutAccountAction } from "@/lib/monetization/payouts";
import {
  getCreatorPayoutProfile,
  upsertCreatorPayoutProfile
} from "@/lib/supabase/payout-profile";
import { listCreatorPayoutAccounts } from "@/lib/supabase/payouts";
import { createClient } from "@/lib/supabase/server";
import type { PayoutMethod } from "@/types/payout";

async function requestMeta() {
  const headerStore = await headers();
  return {
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent")
  };
}

function isBankFieldChanged(
  previous: {
    accountHolderName: string | null;
    bankName: string | null;
    bankAccountNumberMasked: string | null;
    bankBranch: string | null;
  } | null,
  next: {
    accountHolderName: string;
    bankName: string;
    bankAccountNumberMasked: string;
    bankBranch: string | null;
  }
): boolean {
  if (!previous) return false;
  return (
    normalizePersonName(previous.accountHolderName ?? "") !==
      normalizePersonName(next.accountHolderName) ||
    (previous.bankName ?? "").trim() !== next.bankName.trim() ||
    (previous.bankAccountNumberMasked ?? "") !== next.bankAccountNumberMasked ||
    (previous.bankBranch ?? "") !== (next.bankBranch ?? "")
  );
}

export async function savePayoutBankProfile(input: {
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  bankBranch?: string;
  legalName?: string;
}): Promise<{ ok: boolean; error?: string; requiresVerification?: boolean; lockedUntil?: string }> {
  const { profile, user } = await getCurrentUser();
  if (!profile?.id || !user) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const holder = input.accountHolderName.trim();
  const bankName = input.bankName.trim();
  const accountNumber = input.bankAccountNumber.replace(/\s+/g, "");
  const branch = input.bankBranch?.trim() || null;

  if (!holder || !bankName) {
    return { ok: false, error: "Vui lòng nhập đầy đủ thông tin ngân hàng hợp lệ." };
  }
  if (accountNumber && !/^\d{6,20}$/.test(accountNumber)) {
    return { ok: false, error: "Số tài khoản không hợp lệ." };
  }

  const existingProfile = await getCreatorPayoutProfile(profile.id);
  const legalName = (input.legalName ?? existingProfile.data?.legalName ?? holder).trim();
  if (!legalName) {
    return { ok: false, error: "Vui lòng nhập họ tên thật để xác thực." };
  }

  if (!namesMatch(legalName, holder)) {
    return {
      ok: false,
      error: "Tên chủ tài khoản ngân hàng cần trùng với tên xác thực."
    };
  }

  const accounts = await listCreatorPayoutAccounts(profile.id);
  const previousDefault =
    accounts.data?.find((a) => a.is_default) ?? accounts.data?.[0] ?? null;

  const bankMasked = accountNumber
    ? maskAccountNumber(accountNumber)
    : (previousDefault?.bank_account_number_masked ?? null);

  if (!bankMasked) {
    return { ok: false, error: "Vui lòng nhập số tài khoản ngân hàng." };
  }
  const bankChanged = isBankFieldChanged(
    previousDefault
      ? {
          accountHolderName: previousDefault.account_holder_name,
          bankName: previousDefault.bank_name,
          bankAccountNumberMasked: previousDefault.bank_account_number_masked,
          bankBranch: (previousDefault as { bank_branch?: string | null }).bank_branch ?? null
        }
      : null,
    {
      accountHolderName: holder,
      bankName,
      bankAccountNumberMasked: bankMasked,
      bankBranch: branch
    }
  );

  const created = await createCreatorPayoutAccountAction({
    method: "bank_transfer" as PayoutMethod,
    accountHolderName: holder,
    bankName,
    bankAccountNumberMasked: bankMasked,
    setDefault: true
  });

  if (!created.ok || !created.data) {
    return { ok: false, error: created.error ?? "Không thể lưu thông tin nhận tiền." };
  }

  const supabase = await createClient();
  if (branch) {
    await supabase
      .from("creator_payout_accounts")
      .update({ bank_branch: branch, verification_status: bankChanged ? "pending" : "unverified" })
      .eq("id", created.data.id);
  } else if (bankChanged || !previousDefault) {
    await supabase
      .from("creator_payout_accounts")
      .update({ verification_status: "pending" })
      .eq("id", created.data.id);
  }

  const email = user.email ?? null;
  let lockedUntil: string | null = null;
  let verificationStatus: "none" | "pending_email" | "needs_reverification" = previousDefault
    ? "pending_email"
    : "pending_email";

  if (bankChanged && previousDefault) {
    lockedUntil = getBankChangeLockUntil();
    verificationStatus = "needs_reverification";

    await logFinanceSecurityEvent({
      creatorUserId: profile.id,
      eventType: "payout_bank_change_locked",
      metadata: {
        account_id: created.data.id,
        locked_until: lockedUntil,
        bank_name: bankName
      }
    });

    const meta = await requestMeta();
    await logAdminAction({
      actorId: profile.id,
      action: "creator_payout_bank_changed",
      targetType: "creator",
      targetId: profile.id,
      metadata: {
        bank_name: bankName,
        account_masked: bankMasked,
        locked_until: lockedUntil
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
  }

  await upsertCreatorPayoutProfile({
    userId: profile.id,
    legalName,
    verificationEmail: email,
    verificationStatus,
    verifiedAt: null,
    needsReverificationReason: bankChanged ? "bank_account_changed" : null,
    lastBankChangeAt: bankChanged ? new Date().toISOString() : existingProfile.data?.lastBankChangeAt ?? null,
    withdrawalLockedUntil: lockedUntil,
    withdrawalLockReason: bankChanged ? "bank_account_changed" : null,
    defaultPayoutAccountId: created.data.id
  });

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: previousDefault ? "payout_profile_changed" : "payout_profile_created",
    metadata: { method: "bank_transfer", account_id: created.data.id, bank_changed: bankChanged }
  });

  if (bankChanged) {
    await sendFinanceEmailCode({ purpose: "change_bank_account" });
  }

  return {
    ok: true,
    requiresVerification: true,
    lockedUntil: lockedUntil ?? undefined
  };
}

export async function requestPayoutVerification(input: {
  legalName: string;
  confirmBankOwnership: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { profile, user } = await getCurrentUser();
  if (!profile?.id || !user) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const legalName = input.legalName.trim();
  if (!legalName) {
    return { ok: false, error: "Vui lòng nhập họ tên thật." };
  }
  if (!input.confirmBankOwnership) {
    return { ok: false, error: "Vui lòng xác nhận tài khoản ngân hàng là của bạn." };
  }

  const accounts = await listCreatorPayoutAccounts(profile.id);
  const defaultAccount = accounts.data?.find((a) => a.is_default) ?? accounts.data?.[0];
  if (!defaultAccount) {
    return { ok: false, error: "Vui lòng thêm thông tin ngân hàng trước." };
  }
  if (!namesMatch(legalName, defaultAccount.account_holder_name)) {
    return {
      ok: false,
      error: "Tên chủ tài khoản ngân hàng cần trùng với tên xác thực."
    };
  }

  const email = user.email ?? null;
  await upsertCreatorPayoutProfile({
    userId: profile.id,
    legalName,
    verificationEmail: email,
    verificationStatus: "pending_email"
  });

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "payout_verification_requested"
  });

  return sendFinanceEmailCode({ purpose: "verify_payout" });
}

export async function confirmPayoutVerification(input: {
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const verified = await consumeVerifiedFinanceEmailCode({
    purpose: "verify_payout",
    code: input.code
  });
  if (!verified.ok) {
    return verified;
  }

  const existing = await getCreatorPayoutProfile(profile.id);
  const supabase = await createClient();
  if (existing.data?.defaultPayoutAccountId) {
    await supabase
      .from("creator_payout_accounts")
      .update({ verification_status: "verified" })
      .eq("id", existing.data.defaultPayoutAccountId);
  }

  await upsertCreatorPayoutProfile({
    userId: profile.id,
    verificationStatus: "verified",
    verifiedAt: new Date().toISOString(),
    needsReverificationReason: null,
    withdrawalLockedUntil:
      existing.data?.withdrawalLockReason === "bank_account_changed"
        ? existing.data.withdrawalLockedUntil
        : null,
    withdrawalLockReason:
      existing.data?.withdrawalLockReason === "bank_account_changed"
        ? existing.data.withdrawalLockReason
        : null
  });

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "payout_verification_completed"
  });

  return { ok: true };
}

export async function confirmBankChangeVerification(input: {
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const verified = await consumeVerifiedFinanceEmailCode({
    purpose: "change_bank_account",
    code: input.code
  });
  if (!verified.ok) {
    return verified;
  }

  const existing = await getCreatorPayoutProfile(profile.id);
  const supabase = await createClient();
  if (existing.data?.defaultPayoutAccountId) {
    await supabase
      .from("creator_payout_accounts")
      .update({ verification_status: "verified" })
      .eq("id", existing.data.defaultPayoutAccountId);
  }

  await upsertCreatorPayoutProfile({
    userId: profile.id,
    verificationStatus: "verified",
    verifiedAt: new Date().toISOString(),
    needsReverificationReason: null
  });

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "payout_verification_completed",
    metadata: { after_bank_change: true }
  });

  return { ok: true };
}
