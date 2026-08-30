"use server";

import { refundTypeLabel } from "@/lib/admin/refunds/refund-labels";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { createClient } from "@/lib/data/server";
import { getRefundById } from "@/lib/data/refunds";
import type { AdminRefundDetail, RefundProcessingHistoryEntry } from "@/types/admin-refund";

function toNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildProcessingHistory(detail: {
  refund: Awaited<ReturnType<typeof getRefundById>>["data"];
  createdByUsername: string | null;
  reviewedByUsername: string | null;
  completedByUsername: string | null;
}): RefundProcessingHistoryEntry[] {
  const r = detail.refund;
  if (!r) return [];
  const entries: RefundProcessingHistoryEntry[] = [
    {
      id: "created",
      label: "Tạo yêu cầu",
      at: r.createdAt,
      actorUsername: detail.createdByUsername,
      detail: r.reasonPublic ?? r.reason
    }
  ];
  if (r.reviewedAt) {
    entries.push({
      id: "reviewed",
      label: "Xem xét",
      at: r.reviewedAt,
      actorUsername: detail.reviewedByUsername,
      detail: null
    });
  }
  if (r.status === "approved") {
    entries.push({
      id: "approved",
      label: "Đã duyệt",
      at: r.reviewedAt ?? r.createdAt,
      actorUsername: detail.reviewedByUsername,
      detail: null
    });
  }
  if (r.status === "processing") {
    entries.push({
      id: "processing",
      label: "Đang xử lý",
      at: r.reviewedAt ?? r.createdAt,
      actorUsername: detail.reviewedByUsername,
      detail: null
    });
  }
  if (r.completedAt && r.status === "completed") {
    entries.push({
      id: "completed",
      label: "Hoàn tất",
      at: r.completedAt,
      actorUsername: detail.completedByUsername,
      detail: null
    });
  }
  if (r.rejectedAt) {
    entries.push({
      id: "rejected",
      label: "Từ chối",
      at: r.rejectedAt,
      actorUsername: detail.completedByUsername,
      detail: r.failureReason
    });
  }
  if (r.status === "failed") {
    entries.push({
      id: "failed",
      label: "Thất bại",
      at: r.completedAt ?? r.createdAt,
      actorUsername: detail.completedByUsername,
      detail: r.failureReason
    });
  }
  return entries;
}

export async function loadAdminRefundDetailAction(refundId: string): Promise<{
  detail: AdminRefundDetail | null;
  error: string | null;
}> {
  const auth = await checkStaffAnyPermission(["finance.refund.view", "finance.refund.create"]);
  if (!auth.ok) return { detail: null, error: auth.error };

  const refundResult = await getRefundById(refundId);
  if (!refundResult.data) return { detail: null, error: refundResult.error };

  const refund = refundResult.data;
  const db = await createClient();

  const userIds = [refund.userId, refund.creatorUserId, refund.createdBy, refund.reviewedBy, refund.completedBy].filter(
    Boolean
  ) as string[];

  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("id, username, display_name").in("id", userIds)
    : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        username: p.username as string | null,
        displayName: p.display_name as string | null,
        accountStatus: null as string | null
      }
    ])
  );

  const buyerProfile = refund.userId ? profileById.get(refund.userId) : null;
  const creatorProfile = refund.creatorUserId ? profileById.get(refund.creatorUserId) : null;
  const createdByProfile = refund.createdBy ? profileById.get(refund.createdBy) : null;
  const reviewedByProfile = refund.reviewedBy ? profileById.get(refund.reviewedBy) : null;
  const completedByProfile = refund.completedBy ? profileById.get(refund.completedBy) : null;

  const { data: originalTx } = await db
    .from("transactions")
    .select("id, type, coin_amount, paid_coin_amount, bonus_coin_amount, money_amount_vnd, created_at, status")
    .eq("id", refund.originalTransactionId)
    .maybeSingle();

  let storyTitle: string | null = null;
  let chapterTitle: string | null = null;
  let contentStatus: string | null = null;

  if (refund.storyId) {
    const { data: story } = await db
      .from("stories")
      .select("title, monetization_status, review_status")
      .eq("id", refund.storyId)
      .maybeSingle();
    storyTitle = (story?.title as string) ?? null;
    contentStatus = (story?.monetization_status as string) ?? null;
  }
  if (refund.chapterId) {
    const { data: chapter } = await db
      .from("episodes")
      .select("title, status")
      .eq("id", refund.chapterId)
      .maybeSingle();
    chapterTitle = (chapter?.title as string) ?? null;
    if (!contentStatus) contentStatus = (chapter?.status as string) ?? null;
  }

  const { data: auditRows } = await db
    .from("admin_audit_logs")
    .select("id, action, actor_id, created_at, metadata")
    .or(`target_id.eq.${refund.id},metadata->>refund_id.eq.${refund.id}`)
    .order("created_at", { ascending: false })
    .limit(20);

  const auditActorIds = (auditRows ?? [])
    .map((a) => a.actor_id as string | null)
    .filter(Boolean) as string[];
  const { data: auditProfiles } = auditActorIds.length
    ? await db.from("profiles").select("id, username").in("id", auditActorIds)
    : { data: [] };
  const auditProfileById = new Map(
    (auditProfiles ?? []).map((p) => [p.id as string, p.username as string | null])
  );

  const auditLog = (auditRows ?? []).map((a) => ({
    id: a.id as string,
    action: a.action as string,
    actorUsername: a.actor_id ? auditProfileById.get(a.actor_id as string) ?? null : null,
    at: a.created_at as string,
    detail: null,
    metadata: (a.metadata as Record<string, unknown>) ?? null
  }));

  const processingHistory = buildProcessingHistory({
    refund,
    createdByUsername: createdByProfile?.username ?? null,
    reviewedByUsername: reviewedByProfile?.username ?? null,
    completedByUsername: completedByProfile?.username ?? null
  });

  const evidence =
    (refund.metadata?.evidence as string) ??
    (refund.metadata?.complaint_text as string) ??
    null;

  return {
    detail: {
      refund,
      kind: "refund",
      buyer: {
        userId: refund.userId,
        username: buyerProfile?.username ?? null,
        email: null,
        displayName: buyerProfile?.displayName ?? null,
        accountStatus: buyerProfile?.accountStatus ?? null
      },
      creator: {
        userId: refund.creatorUserId,
        username: creatorProfile?.username ?? null,
        displayName: creatorProfile?.displayName ?? null
      },
      originalTransaction: originalTx
        ? {
            id: originalTx.id as string,
            type: originalTx.type as string,
            coinAmount: originalTx.coin_amount as number | null,
            paidCoinAmount: originalTx.paid_coin_amount as number | null,
            bonusCoinAmount: originalTx.bonus_coin_amount as number | null,
            moneyAmountVnd: originalTx.money_amount_vnd as number | null,
            createdAt: originalTx.created_at as string,
            status: originalTx.status as string
          }
        : null,
      content: {
        storyId: refund.storyId,
        storyTitle,
        chapterId: refund.chapterId,
        chapterTitle,
        contentStatus
      },
      processingHistory,
      auditLog,
      evidence
    },
    error: null
  };
}

export async function loadQualityBatchDetailAction(batchId: string): Promise<{
  detail: AdminRefundDetail | null;
  error: string | null;
}> {
  const auth = await checkStaffAnyPermission(["finance.refund.view", "finance.refund.create"]);
  if (!auth.ok) return { detail: null, error: auth.error };

  const db = await createClient();
  const { data: batch } = await db
    .from("coin_refund_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) return { detail: null, error: "Không tìm thấy batch hoàn coin." };

  const statusMap: Record<string, string> = {
    pending: "pending",
    processing: "processing",
    completed: "completed",
    partial_failed: "failed",
    failed: "failed",
    cancelled: "cancelled"
  };

  const pseudoRefund = {
    id: batch.id as string,
    originalTransactionId: "",
    userId: null,
    creatorUserId: null,
    storyId: batch.target_type === "story" ? (batch.target_id as string) : null,
    chapterId: batch.target_type === "chapter" ? (batch.target_id as string) : null,
    amountVnd: null,
    coinAmount: toNumber(batch.total_coin_refunded),
    refundType: "quality_low_refund" as const,
    source: "content_quality_action" as const,
    coinType: "all" as const,
    reason: batch.reason_code as string,
    reasonPublic: batch.reason_code as string,
    reasonInternal: batch.admin_note as string | null,
    status: (statusMap[batch.status as string] ?? "processing") as AdminRefundDetail["refund"]["status"],
    provider: null,
    providerReference: null,
    createdBy: batch.created_by as string | null,
    reviewedBy: batch.confirmed_by as string | null,
    completedBy: batch.confirmed_by as string | null,
    processedBy: batch.confirmed_by as string | null,
    createdAt: batch.created_at as string,
    reviewedAt: batch.confirmed_at as string | null,
    completedAt: batch.confirmed_at as string | null,
    rejectedAt: null,
    processedAt: batch.confirmed_at as string | null,
    failureReason: null,
    qualityCaseId: batch.quality_case_id as string | null,
    coinRefundBatchId: batch.id as string,
    isHighRisk: false,
    metadata: { batch_status: batch.status, total_users: batch.total_users }
  };

  const detailResult = await loadAdminRefundDetailAction(pseudoRefund.id).catch(() => null);

  return {
    detail: {
      refund: pseudoRefund,
      kind: "quality_batch",
      buyer: { userId: null, username: null, email: null, displayName: null, accountStatus: null },
      creator: { userId: null, username: null, displayName: null },
      originalTransaction: null,
      content: detailResult?.detail?.content ?? {
        storyId: pseudoRefund.storyId,
        storyTitle: null,
        chapterId: pseudoRefund.chapterId,
        chapterTitle: null,
        contentStatus: null
      },
      processingHistory: [
        {
          id: "batch-created",
          label: "Tạo batch hoàn coin",
          at: pseudoRefund.createdAt,
          actorUsername: null,
          detail: refundTypeLabel("quality_low_refund")
        },
        ...(pseudoRefund.completedAt
          ? [
              {
                id: "batch-completed",
                label: "Hoàn tất batch",
                at: pseudoRefund.completedAt,
                actorUsername: null,
                detail: `${toNumber(batch.total_users)} người dùng`
              }
            ]
          : [])
      ],
      auditLog: [],
      evidence: batch.author_note as string | null
    },
    error: null
  };
}

export async function loadRefundDetailByRowId(rowId: string, kind: "refund" | "quality_batch") {
  if (kind === "quality_batch") {
    return loadQualityBatchDetailAction(rowId);
  }
  return loadAdminRefundDetailAction(rowId);
}
