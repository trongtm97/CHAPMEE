import { createClient } from "@/lib/data/server";
import type { RefundRecord, RefundStatus } from "@/types/refund";

type RefundRow = {
  id: string;
  original_transaction_id: string;
  user_id: string | null;
  creator_user_id: string | null;
  story_id: string | null;
  chapter_id: string | null;
  amount_vnd: number | null;
  coin_amount: number | null;
  refund_type: string | null;
  source: string | null;
  coin_type: string | null;
  reason: string | null;
  reason_public: string | null;
  reason_internal: string | null;
  status: RefundStatus | "requested" | "processed";
  provider: string | null;
  provider_reference: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  completed_by: string | null;
  processed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  rejected_at: string | null;
  processed_at: string | null;
  failure_reason: string | null;
  quality_case_id: string | null;
  coin_refund_batch_id: string | null;
  is_high_risk: boolean | null;
  metadata: Record<string, unknown> | null;
};

function normalizeStatus(status: RefundRow["status"]): RefundStatus {
  if (status === "requested") return "pending";
  if (status === "processed") return "completed";
  return status as RefundStatus;
}

export function mapRefund(row: RefundRow): RefundRecord {
  return {
    id: row.id,
    originalTransactionId: row.original_transaction_id,
    userId: row.user_id,
    creatorUserId: row.creator_user_id,
    storyId: row.story_id,
    chapterId: row.chapter_id,
    amountVnd: row.amount_vnd,
    coinAmount: row.coin_amount,
    refundType: row.refund_type as RefundRecord["refundType"],
    source: row.source as RefundRecord["source"],
    coinType: row.coin_type as RefundRecord["coinType"],
    reason: row.reason,
    reasonPublic: row.reason_public ?? row.reason,
    reasonInternal: row.reason_internal,
    status: normalizeStatus(row.status),
    provider: row.provider,
    providerReference: row.provider_reference,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    completedBy: row.completed_by ?? row.processed_by,
    processedBy: row.processed_by,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    completedAt: row.processed_at,
    rejectedAt: row.rejected_at,
    processedAt: row.processed_at,
    failureReason: row.failure_reason,
    qualityCaseId: row.quality_case_id,
    coinRefundBatchId: row.coin_refund_batch_id,
    isHighRisk: Boolean(row.is_high_risk),
    metadata: row.metadata
  };
}

export async function listRefundsForAdmin(limit = 200) {
  const db = await createClient();
  const { data, error } = await db
    .from("refunds")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: [] as RefundRecord[], error: error.message };
  return { data: ((data ?? []) as RefundRow[]).map(mapRefund), error: null };
}

export async function queryRefundsForAdmin(input: {
  limit?: number;
  offset?: number;
  status?: RefundStatus | RefundStatus[];
  refundType?: string;
  source?: string;
  coinType?: string;
  userId?: string;
  creatorUserId?: string;
  storyId?: string;
  chapterId?: string;
  startDate?: string;
  endDate?: string;
  highRiskOnly?: boolean;
}) {
  const db = await createClient();
  let query = db.from("refunds").select("*", { count: "exact" });

  if (input.status) {
    const statuses = Array.isArray(input.status) ? input.status : [input.status];
    query = query.in("status", statuses);
  }
  if (input.refundType) query = query.eq("refund_type", input.refundType);
  if (input.source) query = query.eq("source", input.source);
  if (input.coinType && input.coinType !== "all") {
    query = query.eq("coin_type", input.coinType);
  }
  if (input.userId) query = query.eq("user_id", input.userId);
  if (input.creatorUserId) query = query.eq("creator_user_id", input.creatorUserId);
  if (input.storyId) query = query.eq("story_id", input.storyId);
  if (input.chapterId) query = query.eq("chapter_id", input.chapterId);
  if (input.startDate) query = query.gte("created_at", input.startDate);
  if (input.endDate) query = query.lte("created_at", `${input.endDate}T23:59:59.999Z`);
  if (input.highRiskOnly) query = query.eq("is_high_risk", true);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(input.offset ?? 0, (input.offset ?? 0) + (input.limit ?? 50) - 1);

  if (error) return { data: [] as RefundRecord[], total: 0, error: error.message };
  return {
    data: ((data ?? []) as RefundRow[]).map(mapRefund),
    total: count ?? 0,
    error: null
  };
}

export async function createRefundRecord(input: {
  originalTransactionId: string;
  userId?: string | null;
  creatorUserId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
  amountVnd?: number | null;
  coinAmount?: number | null;
  refundType?: string | null;
  source?: string | null;
  coinType?: string | null;
  reason?: string | null;
  reasonPublic?: string | null;
  reasonInternal?: string | null;
  provider?: string | null;
  providerReference?: string | null;
  createdBy?: string | null;
  qualityCaseId?: string | null;
  coinRefundBatchId?: string | null;
  isHighRisk?: boolean;
  status?: RefundStatus;
  metadata?: Record<string, unknown>;
}) {
  const db = await createClient();
  const { data, error } = await db
    .from("refunds")
    .insert({
      original_transaction_id: input.originalTransactionId,
      user_id: input.userId ?? null,
      creator_user_id: input.creatorUserId ?? null,
      story_id: input.storyId ?? null,
      chapter_id: input.chapterId ?? null,
      amount_vnd: input.amountVnd ?? null,
      coin_amount: input.coinAmount ?? null,
      refund_type: input.refundType ?? null,
      source: input.source ?? null,
      coin_type: input.coinType ?? "all",
      reason: input.reasonPublic ?? input.reason ?? null,
      reason_public: input.reasonPublic ?? input.reason ?? null,
      reason_internal: input.reasonInternal ?? null,
      provider: input.provider ?? null,
      provider_reference: input.providerReference ?? null,
      created_by: input.createdBy ?? null,
      quality_case_id: input.qualityCaseId ?? null,
      coin_refund_batch_id: input.coinRefundBatchId ?? null,
      is_high_risk: input.isHighRisk ?? false,
      status: input.status ?? "pending",
      metadata: input.metadata ?? {}
    })
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not create refund." };
  return { data: mapRefund(data as RefundRow), error: null };
}

export async function getRefundById(refundId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("refunds")
    .select("*")
    .eq("id", refundId)
    .maybeSingle();
  if (error || !data) return { data: null, error: error?.message ?? "Refund not found." };
  return { data: mapRefund(data as RefundRow), error: null };
}

export async function findCompletedRefundByOriginalTransaction(originalTransactionId: string) {
  const db = await createClient();
  const { data } = await db
    .from("refunds")
    .select("*")
    .eq("original_transaction_id", originalTransactionId)
    .in("status", ["completed", "approved", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return mapRefund(data as RefundRow);
}

export async function findProcessedRefundByOriginalTransaction(originalTransactionId: string) {
  return findCompletedRefundByOriginalTransaction(originalTransactionId);
}

export async function updateRefundStatus(input: {
  refundId: string;
  status: RefundStatus;
  processedBy?: string | null;
  reviewedBy?: string | null;
  completedBy?: string | null;
  failureReason?: string | null;
  reasonInternal?: string | null;
  metadataPatch?: Record<string, unknown>;
}) {
  const db = await createClient();
  const { data: current } = await db
    .from("refunds")
    .select("metadata, reason_internal")
    .eq("id", input.refundId)
    .maybeSingle();
  const metadata = {
    ...((current?.metadata as Record<string, unknown> | null) ?? {}),
    ...(input.metadataPatch ?? {})
  };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: input.status,
    metadata
  };

  if (input.reasonInternal != null) {
    patch.reason_internal = input.reasonInternal;
  }
  if (input.failureReason != null) {
    patch.failure_reason = input.failureReason;
  }
  if (input.reviewedBy) {
    patch.reviewed_by = input.reviewedBy;
    patch.reviewed_at = now;
  }
  if (input.status === "completed") {
    patch.completed_by = input.completedBy ?? input.processedBy ?? null;
    patch.processed_by = input.completedBy ?? input.processedBy ?? null;
    patch.processed_at = now;
  }
  if (input.status === "rejected") {
    patch.rejected_at = now;
    patch.processed_by = input.processedBy ?? null;
  }
  if (input.status === "failed") {
    patch.processed_by = input.processedBy ?? null;
  }

  const { data, error } = await db
    .from("refunds")
    .update(patch)
    .eq("id", input.refundId)
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not update refund." };
  return { data: mapRefund(data as RefundRow), error: null };
}

export async function appendRefundInternalNote(refundId: string, note: string, adminId: string) {
  const db = await createClient();
  const { data: current } = await db
    .from("refunds")
    .select("metadata, reason_internal")
    .eq("id", refundId)
    .maybeSingle();
  const existingNotes = String(current?.reason_internal ?? "");
  const timestamp = new Date().toISOString();
  const nextNote = existingNotes
    ? `${existingNotes}\n[${timestamp}] ${note}`
    : `[${timestamp}] ${note}`;
  const metadata = {
    ...((current?.metadata as Record<string, unknown> | null) ?? {}),
    last_note_by: adminId,
    last_note_at: timestamp
  };
  const { data, error } = await db
    .from("refunds")
    .update({ reason_internal: nextNote, metadata })
    .eq("id", refundId)
    .select("*")
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Could not append note." };
  return { data: mapRefund(data as RefundRow), error: null };
}
