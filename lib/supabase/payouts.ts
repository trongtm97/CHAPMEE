import { createClient } from "@/lib/supabase/server";
import type {
  CreatorPayoutAccount,
  PayoutMethod,
  PayoutRequest,
  PayoutRequestStatus
} from "@/types/payout";
import type { CreatorWallet } from "@/types/wallet";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPayoutAccount(row: Record<string, unknown>): CreatorPayoutAccount {
  return {
    id: String(row.id),
    creator_user_id: String(row.creator_user_id),
    method: row.method as PayoutMethod,
    account_holder_name: (row.account_holder_name as string | null) ?? null,
    bank_name: (row.bank_name as string | null) ?? null,
    bank_account_number_masked: (row.bank_account_number_masked as string | null) ?? null,
    wallet_phone_masked: (row.wallet_phone_masked as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    is_default: Boolean(row.is_default),
    verification_status: row.verification_status as CreatorPayoutAccount["verification_status"],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapPayoutRequest(row: Record<string, unknown>): PayoutRequest {
  return {
    id: String(row.id),
    creator_user_id: String(row.creator_user_id),
    amount_vnd: toNumber(row.amount_vnd),
    method: row.method as PayoutMethod,
    status: row.status as PayoutRequestStatus,
    payout_account_snapshot:
      (row.payout_account_snapshot as Record<string, unknown> | null) ?? null,
    admin_note: (row.admin_note as string | null) ?? null,
    creator_note: (row.creator_note as string | null) ?? null,
    reject_reason: (row.reject_reason as string | null) ?? null,
    payment_reference: (row.payment_reference as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
    risk_level: (row.risk_level as PayoutRequest["risk_level"]) ?? "normal",
    requested_at: String(row.requested_at),
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    transaction_id: (row.transaction_id as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapCreatorWallet(row: Record<string, unknown>): CreatorWallet {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    pending_revenue_vnd: toNumber(row.pending_revenue_vnd),
    available_revenue_vnd: toNumber(row.available_revenue_vnd),
    locked_revenue_vnd: toNumber(row.locked_revenue_vnd),
    total_earned_vnd: toNumber(row.total_earned_vnd),
    total_withdrawn_vnd: toNumber(row.total_withdrawn_vnd),
    currency: String(row.currency ?? "VND"),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function listCreatorPayoutAccounts(creatorUserId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_payout_accounts")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as CreatorPayoutAccount[], error: error.message };
  }
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapPayoutAccount),
    error: null
  };
}

export async function createCreatorPayoutAccount(input: {
  creatorUserId: string;
  method: PayoutMethod;
  accountHolderName?: string | null;
  bankName?: string | null;
  bankAccountNumberMasked?: string | null;
  walletPhoneMasked?: string | null;
  metadata?: Record<string, unknown>;
  isDefault?: boolean;
}) {
  const supabase = await createClient();

  if (input.isDefault) {
    await supabase
      .from("creator_payout_accounts")
      .update({ is_default: false })
      .eq("creator_user_id", input.creatorUserId);
  }

  const { data, error } = await supabase
    .from("creator_payout_accounts")
    .insert({
      creator_user_id: input.creatorUserId,
      method: input.method,
      account_holder_name: input.accountHolderName ?? null,
      bank_name: input.bankName ?? null,
      bank_account_number_masked: input.bankAccountNumberMasked ?? null,
      wallet_phone_masked: input.walletPhoneMasked ?? null,
      metadata: input.metadata ?? {},
      is_default: Boolean(input.isDefault),
      verification_status: "verified"
    })
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create payout account." };
  }
  return { data: mapPayoutAccount(data as Record<string, unknown>), error: null };
}

export async function getCreatorPayoutAccountById(accountId: string, creatorUserId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_payout_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("creator_user_id", creatorUserId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Payout account not found." };
  return { data: mapPayoutAccount(data as Record<string, unknown>), error: null };
}

export async function shiftCreatorWalletBalances(input: {
  creatorUserId: string;
  from: "available" | "locked" | "pending";
  to: "available" | "locked" | "pending" | "none";
  amountVnd: number;
  increaseWithdrawn?: boolean;
}) {
  const amount = Number(input.amountVnd.toFixed(2));
  if (!(amount > 0)) {
    return { data: null, error: "Số tiền phải lớn hơn 0." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shift_creator_wallet_balances", {
    input_creator_user_id: input.creatorUserId,
    input_from: input.from,
    input_to: input.to === "none" ? "none" : input.to,
    input_amount_vnd: amount,
    input_increase_withdrawn: Boolean(input.increaseWithdrawn)
  });

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not update creator wallet." };
  }
  return { data: mapCreatorWallet(data as Record<string, unknown>), error: null };
}

export async function createPayoutRequestRecord(input: {
  creatorUserId: string;
  amountVnd: number;
  method: PayoutMethod;
  status: PayoutRequestStatus;
  payoutAccountSnapshot?: Record<string, unknown> | null;
  transactionId?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payout_requests")
    .insert({
      creator_user_id: input.creatorUserId,
      amount_vnd: input.amountVnd,
      method: input.method,
      status: input.status,
      payout_account_snapshot: input.payoutAccountSnapshot ?? null,
      transaction_id: input.transactionId ?? null
    })
    .select("*")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create payout request." };
  }
  return { data: mapPayoutRequest(data as Record<string, unknown>), error: null };
}

export async function maybeAutoApproveOwnPayoutRequest(requestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("maybe_auto_approve_own_payout_request", {
    p_request_id: requestId
  });
  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Could not auto-approve payout request."
    };
  }
  return { data: mapPayoutRequest(data as Record<string, unknown>), error: null };
}

export async function getPayoutRequestById(requestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Payout request not found." };
  return { data: mapPayoutRequest(data as Record<string, unknown>), error: null };
}

export async function listPayoutRequestsForCreator(creatorUserId: string, limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("creator_user_id", creatorUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as PayoutRequest[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapPayoutRequest),
    error: null
  };
}

export async function listPayoutRequestsForAdmin(limit = 100) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as PayoutRequest[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapPayoutRequest),
    error: null
  };
}

export async function updatePayoutRequestStatus(input: {
  requestId: string;
  status: PayoutRequestStatus;
  reviewedBy?: string | null;
  adminNote?: string | null;
  rejectReason?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  riskLevel?: PayoutRequest["risk_level"];
}) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status: input.status };
  if (input.reviewedBy) {
    patch.reviewed_by = input.reviewedBy;
    patch.reviewed_at = new Date().toISOString();
  }
  if (input.adminNote !== undefined) {
    patch.admin_note = input.adminNote;
  }
  if (input.rejectReason !== undefined) {
    patch.reject_reason = input.rejectReason;
  }
  if (input.paymentReference !== undefined) {
    patch.payment_reference = input.paymentReference;
  }
  if (input.paidAt !== undefined) {
    patch.paid_at = input.paidAt;
  }
  if (input.riskLevel !== undefined) {
    patch.risk_level = input.riskLevel;
  }
  if (input.status === "completed") {
    patch.completed_at = input.paidAt ?? new Date().toISOString();
    if (!patch.paid_at) {
      patch.paid_at = patch.completed_at;
    }
  }

  const { data, error } = await supabase
    .from("payout_requests")
    .update(patch)
    .eq("id", input.requestId)
    .select("*")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not update payout request status." };
  }
  return { data: mapPayoutRequest(data as Record<string, unknown>), error: null };
}

export async function createRevenueReleaseLog(input: {
  creatorUserId: string;
  sourceTransactionId: string;
  releasedAmountVnd: number;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_revenue_release_logs")
    .insert({
      creator_user_id: input.creatorUserId,
      source_transaction_id: input.sourceTransactionId,
      released_amount_vnd: input.releasedAmountVnd,
      metadata: input.metadata ?? {}
    })
    .select("id")
    .single();
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not create release log." };
  }
  return { data: { id: String((data as Record<string, unknown>).id) }, error: null };
}

export async function hasRevenueReleaseLog(sourceTransactionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_revenue_release_logs")
    .select("id")
    .eq("source_transaction_id", sourceTransactionId)
    .maybeSingle();
  if (error) return { data: false, error: error.message };
  return { data: Boolean(data), error: null };
}
