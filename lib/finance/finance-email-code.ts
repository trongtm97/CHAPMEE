"use server";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import {
  canResendEmailCode,
  generateEmailVerificationCode,
  getEmailCodeExpiresAt,
  hashEmailVerificationCode,
  verifyEmailVerificationCode
} from "@/lib/finance/finance-security-utils";
import { sendFinanceVerificationEmail } from "@/lib/finance/send-finance-verification-email";
import { logFinanceSecurityEvent } from "@/lib/finance/log-finance-security";
import {
  getRecentFinanceEmailCodeSentAt,
  insertFinanceEmailCode
} from "@/lib/data/payout-profile";
import type { FinanceEmailCodePurpose } from "@/types/finance";

const PURPOSE_LABELS: Record<FinanceEmailCodePurpose, string> = {
  setup_pin: "Thiết lập PIN rút tiền",
  change_pin: "Đổi PIN rút tiền",
  reset_pin: "Khôi phục PIN rút tiền",
  verify_payout: "Xác thực thông tin nhận tiền",
  verify_bank_account: "Xác thực tài khoản ngân hàng",
  change_bank_account: "Xác nhận thay đổi tài khoản ngân hàng",
  withdrawal_request: "Xác nhận yêu cầu rút tiền"
};

export async function sendFinanceEmailCode(input: {
  purpose: FinanceEmailCodePurpose;
  emailOverride?: string;
}): Promise<{ ok: boolean; error?: string; retryAfterSeconds?: number }> {
  const { profile, user } = await getCurrentUser();
  if (!profile?.id || !user) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const email = (input.emailOverride ?? user.email ?? "").trim();
  if (!email) {
    return { ok: false, error: "Tài khoản chưa có email để xác thực." };
  }

  const lastSent = await getRecentFinanceEmailCodeSentAt(profile.id, input.purpose);
  const cooldown = canResendEmailCode(lastSent);
  if (!cooldown.allowed) {
    return {
      ok: false,
      error: `Vui lòng đợi ${cooldown.retryAfterSeconds} giây trước khi gửi lại mã.`,
      retryAfterSeconds: cooldown.retryAfterSeconds
    };
  }

  const code = generateEmailVerificationCode();
  const inserted = await insertFinanceEmailCode({
    userId: profile.id,
    purpose: input.purpose,
    codeHash: hashEmailVerificationCode(code),
    expiresAt: getEmailCodeExpiresAt()
  });

  if (inserted.error) {
    return { ok: false, error: inserted.error };
  }

  const sent = await sendFinanceVerificationEmail({
    to: email,
    purposeLabel: PURPOSE_LABELS[input.purpose],
    code
  });

  if (!sent.ok) {
    return { ok: false, error: sent.error ?? "Không gửi được email xác nhận." };
  }

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "finance_email_code_sent",
    metadata: { purpose: input.purpose, email_domain: email.split("@")[1] ?? null }
  });

  return { ok: true };
}

export async function verifyFinanceEmailCode(input: {
  purpose: FinanceEmailCodePurpose;
  code: string;
}): Promise<{ ok: boolean; error?: string; codeId?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const trimmed = input.code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return { ok: false, error: "Mã xác nhận phải gồm 6 chữ số." };
  }

  const { getLatestFinanceEmailCode } = await import("@/lib/data/payout-profile");
  const latest = await getLatestFinanceEmailCode(profile.id, input.purpose);
  if (!latest.data) {
    return { ok: false, error: "Mã xác nhận không hợp lệ hoặc đã hết hạn." };
  }

  if (!verifyEmailVerificationCode(trimmed, latest.data.codeHash)) {
    return { ok: false, error: "Mã xác nhận không đúng." };
  }

  return { ok: true, codeId: latest.data.id };
}

export async function consumeVerifiedFinanceEmailCode(input: {
  purpose: FinanceEmailCodePurpose;
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  const verified = await verifyFinanceEmailCode(input);
  if (!verified.ok || !verified.codeId) {
    return { ok: false, error: verified.error };
  }

  const { consumeFinanceEmailCode } = await import("@/lib/data/payout-profile");
  const consumed = await consumeFinanceEmailCode(verified.codeId);
  if (!consumed.ok) {
    return { ok: false, error: consumed.error ?? "Không thể xác nhận mã." };
  }

  return { ok: true };
}
