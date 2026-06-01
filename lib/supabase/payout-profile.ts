import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type {
  CreatorPayoutProfileView,
  FinanceEmailCodePurpose,
  PayoutLockReason,
  PayoutVerificationStatus
} from "@/types/finance";

function mapProfile(row: Record<string, unknown>): CreatorPayoutProfileView {
  return {
    userId: String(row.user_id),
    legalName: (row.legal_name as string | null) ?? null,
    verificationEmail: (row.verification_email as string | null) ?? null,
    verificationStatus: row.verification_status as PayoutVerificationStatus,
    verifiedAt: (row.verified_at as string | null) ?? null,
    needsReverificationReason: (row.needs_reverification_reason as string | null) ?? null,
    lastBankChangeAt: (row.last_bank_change_at as string | null) ?? null,
    withdrawalLockedUntil: (row.withdrawal_locked_until as string | null) ?? null,
    withdrawalLockReason: (row.withdrawal_lock_reason as PayoutLockReason | null) ?? null,
    defaultPayoutAccountId: (row.default_payout_account_id as string | null) ?? null
  };
}

export async function getCreatorPayoutProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_payout_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      return { data: null, error: null };
    }
    return { data: null, error: error.message };
  }

  return {
    data: data ? mapProfile(data as Record<string, unknown>) : null,
    error: null
  };
}

export async function upsertCreatorPayoutProfile(input: {
  userId: string;
  legalName?: string | null;
  verificationEmail?: string | null;
  verificationStatus?: PayoutVerificationStatus;
  verifiedAt?: string | null;
  needsReverificationReason?: string | null;
  lastBankChangeAt?: string | null;
  withdrawalLockedUntil?: string | null;
  withdrawalLockReason?: PayoutLockReason | null;
  defaultPayoutAccountId?: string | null;
}) {
  const supabase = await createClient();
  const payload: Record<string, unknown> = {
    user_id: input.userId,
    updated_at: new Date().toISOString()
  };

  if (input.legalName !== undefined) payload.legal_name = input.legalName;
  if (input.verificationEmail !== undefined) payload.verification_email = input.verificationEmail;
  if (input.verificationStatus !== undefined) payload.verification_status = input.verificationStatus;
  if (input.verifiedAt !== undefined) payload.verified_at = input.verifiedAt;
  if (input.needsReverificationReason !== undefined) {
    payload.needs_reverification_reason = input.needsReverificationReason;
  }
  if (input.lastBankChangeAt !== undefined) payload.last_bank_change_at = input.lastBankChangeAt;
  if (input.withdrawalLockedUntil !== undefined) {
    payload.withdrawal_locked_until = input.withdrawalLockedUntil;
  }
  if (input.withdrawalLockReason !== undefined) {
    payload.withdrawal_lock_reason = input.withdrawalLockReason;
  }
  if (input.defaultPayoutAccountId !== undefined) {
    payload.default_payout_account_id = input.defaultPayoutAccountId;
  }

  const { data, error } = await supabase
    .from("creator_payout_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingSchemaError(error)) {
      return { data: null, error: "Hệ thống tài chính chưa được cập nhật. Liên hệ quản trị viên." };
    }
    return { data: null, error: error.message };
  }

  return { data: mapProfile(data as Record<string, unknown>), error: null };
}

export async function insertFinanceEmailCode(input: {
  userId: string;
  purpose: FinanceEmailCodePurpose;
  codeHash: string;
  expiresAt: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_finance_email_codes")
    .insert({
      user_id: input.userId,
      purpose: input.purpose,
      code_hash: input.codeHash,
      expires_at: input.expiresAt
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingSchemaError(error)) {
      return { id: null, error: "Hệ thống xác thực email chưa sẵn sàng." };
    }
    return { id: null, error: error.message };
  }

  return { id: data?.id ? String(data.id) : null, error: null };
}

export async function getLatestFinanceEmailCode(userId: string, purpose: FinanceEmailCodePurpose) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_finance_email_codes")
    .select("id, code_hash, expires_at, consumed_at, created_at")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      return { data: null, error: null };
    }
    return { data: null, error: error.message };
  }

  if (!data) return { data: null, error: null };

  return {
    data: {
      id: String(data.id),
      codeHash: String(data.code_hash),
      expiresAt: String(data.expires_at),
      createdAt: String(data.created_at)
    },
    error: null
  };
}

export async function consumeFinanceEmailCode(codeId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("creator_finance_email_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", codeId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function getRecentFinanceEmailCodeSentAt(userId: string, purpose: FinanceEmailCodePurpose) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_finance_email_codes")
    .select("created_at")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return String(data.created_at);
}
