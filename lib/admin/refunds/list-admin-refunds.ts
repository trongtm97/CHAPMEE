"use server";

import { computeSlaHours, formatRefundId, refundTypeLabel } from "@/lib/admin/refunds/refund-labels";
import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { createClient } from "@/lib/data/server";
import { mapRefund, queryRefundsForAdmin } from "@/lib/data/refunds";
import type { AdminRefundListRow, RefundDashboardFilters } from "@/types/admin-refund";

function toNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sortRows(rows: AdminRefundListRow[], sort: RefundDashboardFilters["sort"]) {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "coin_desc":
        return b.coinAmount - a.coinAmount;
      case "coin_asc":
        return a.coinAmount - b.coinAmount;
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  return copy;
}

function matchesSearch(row: AdminRefundListRow, search: string) {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  const haystack = [
    row.refundId,
    formatRefundId(row.refundId),
    row.buyerUsername,
    row.buyerEmail,
    row.creatorUsername,
    row.contentLabel,
    row.originalTransactionId,
    row.refundType ? refundTypeLabel(row.refundType) : ""
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

async function loadProfileMaps(userIds: string[]) {
  const db = await createClient();
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const profileById = new Map<string, { username: string | null; display_name: string | null }>();
  const emailById = new Map<string, string>();

  if (unique.length === 0) return { profileById, emailById };

  const { data: profiles } = await db
    .from("profiles")
    .select("id, username, display_name")
    .in("id", unique);
  for (const p of profiles ?? []) {
    profileById.set(p.id as string, {
      username: p.username as string | null,
      display_name: p.display_name as string | null
    });
  }

  return { profileById, emailById };
}

async function loadContentLabels(storyIds: string[], chapterIds: string[]) {
  const db = await createClient();
  const storyById = new Map<string, string>();
  const chapterById = new Map<string, string>();

  if (storyIds.length > 0) {
    const { data } = await db.from("stories").select("id, title").in("id", storyIds);
    for (const s of data ?? []) storyById.set(s.id as string, s.title as string);
  }
  if (chapterIds.length > 0) {
    const { data } = await db.from("episodes").select("id, title").in("id", chapterIds);
    for (const c of data ?? []) chapterById.set(c.id as string, c.title as string);
  }

  return { storyById, chapterById };
}

function mapRefundToRow(
  refund: ReturnType<typeof mapRefund>,
  ctx: {
    profileById: Map<string, { username: string | null; display_name: string | null }>;
    storyById: Map<string, string>;
    chapterById: Map<string, string>;
    creatorProfileById: Map<string, { username: string | null; display_name: string | null }>;
  }
): AdminRefundListRow {
  const buyer = refund.userId ? ctx.profileById.get(refund.userId) : null;
  const creator = refund.creatorUserId ? ctx.creatorProfileById.get(refund.creatorUserId) : null;
  const creatorProfile = refund.createdBy ? ctx.profileById.get(refund.createdBy) : null;
  const storyTitle = refund.storyId ? ctx.storyById.get(refund.storyId) : null;
  const chapterTitle = refund.chapterId ? ctx.chapterById.get(refund.chapterId) : null;
  const contentLabel =
    storyTitle && chapterTitle
      ? `${storyTitle} / ${chapterTitle}`
      : storyTitle ?? chapterTitle ?? null;

  return {
    id: refund.id,
    kind: "refund",
    refundId: refund.id,
    buyerUserId: refund.userId,
    buyerUsername: buyer?.username ?? null,
    buyerEmail: null,
    creatorUserId: refund.creatorUserId,
    creatorUsername: creator?.username ?? null,
    originalTransactionId: refund.originalTransactionId,
    contentLabel,
    storyId: refund.storyId,
    chapterId: refund.chapterId,
    refundType: refund.refundType,
    source: refund.source,
    coinAmount: toNumber(refund.coinAmount),
    amountVnd: refund.amountVnd,
    coinType: refund.coinType,
    status: refund.status,
    reason: refund.reasonPublic ?? refund.reason,
    createdByUsername: creatorProfile?.username ?? null,
    createdAt: refund.createdAt,
    slaHours: computeSlaHours(refund.createdAt, refund.status),
    isHighRisk: refund.isHighRisk,
    qualityCaseId: refund.qualityCaseId,
    coinRefundBatchId: refund.coinRefundBatchId
  };
}

async function loadQualityBatchRows(filters: RefundDashboardFilters): Promise<AdminRefundListRow[]> {
  if (filters.refundType !== "all" && filters.refundType !== "quality_low_refund") {
    if (filters.source !== "all" && filters.source !== "content_quality_action") {
      return [];
    }
  }
  if (filters.source !== "all" && filters.source !== "content_quality_action") {
    return [];
  }

  const db = await createClient();
  let query = db
    .from("coin_refund_batches")
    .select("*")
    .neq("status", "preview")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.startDate) query = query.gte("created_at", filters.startDate);
  if (filters.endDate) query = query.lte("created_at", `${filters.endDate}T23:59:59.999Z`);

  const { data: batches } = await query;
  if (!batches?.length) return [];

  const storyIds: string[] = [];
  const chapterIds: string[] = [];
  const userIds: string[] = [];

  for (const b of batches) {
    if (b.created_by) userIds.push(b.created_by as string);
    if (b.target_type === "story") storyIds.push(b.target_id as string);
    if (b.target_type === "chapter") chapterIds.push(b.target_id as string);
  }

  const { profileById } = await loadProfileMaps(userIds);
  const { storyById, chapterById } = await loadContentLabels(storyIds, chapterIds);

  const batchStatusMap: Record<string, string> = {
    pending: "pending",
    processing: "processing",
    completed: "completed",
    partial_failed: "failed",
    failed: "failed",
    cancelled: "cancelled"
  };

  return batches
    .map((b) => {
      const creatorProfile = b.created_by ? profileById.get(b.created_by as string) : null;
      let contentLabel: string | null = null;
      let storyId: string | null = null;
      let chapterId: string | null = null;
      if (b.target_type === "story") {
        storyId = b.target_id as string;
        contentLabel = storyById.get(storyId) ?? storyId;
      } else {
        chapterId = b.target_id as string;
        contentLabel = chapterById.get(chapterId) ?? chapterId;
      }

      const status = batchStatusMap[b.status as string] ?? "processing";
      if (filters.status !== "all" && filters.status !== status) return null;

      const row: AdminRefundListRow = {
        id: `batch-${b.id}`,
        kind: "quality_batch",
        refundId: b.id as string,
        buyerUserId: null,
        buyerUsername: null,
        buyerEmail: null,
        creatorUserId: null,
        creatorUsername: null,
        originalTransactionId: null,
        contentLabel,
        storyId,
        chapterId,
        refundType: "quality_low_refund",
        source: "content_quality_action",
        coinAmount: toNumber(b.total_coin_refunded),
        amountVnd: null,
        coinType: "all",
        status,
        reason: b.reason_code as string,
        createdByUsername: creatorProfile?.username ?? null,
        createdAt: b.created_at as string,
        slaHours: computeSlaHours(b.created_at as string, status),
        isHighRisk: false,
        qualityCaseId: b.quality_case_id as string | null,
        coinRefundBatchId: b.id as string
      };
      return matchesSearch(row, filters.search) ? row : null;
    })
    .filter(Boolean) as AdminRefundListRow[];
}

export async function listAdminRefunds(filters: RefundDashboardFilters): Promise<{
  rows: AdminRefundListRow[];
  total: number;
  error: string | null;
}> {
  const auth = await checkStaffAnyPermission(["finance.refund.view", "finance.refund.create"]);
  if (!auth.ok) {
    return { rows: [], total: 0, error: auth.error };
  }

  const offset = (filters.page - 1) * filters.pageSize;
  const queryResult = await queryRefundsForAdmin({
    limit: filters.pageSize,
    offset,
    status: filters.status !== "all" ? filters.status : undefined,
    refundType: filters.refundType !== "all" ? filters.refundType : undefined,
    source: filters.source !== "all" ? filters.source : undefined,
    coinType: filters.coinType !== "all" ? filters.coinType : undefined,
    creatorUserId: filters.creatorUserId || undefined,
    storyId: filters.storyId || undefined,
    chapterId: filters.chapterId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    highRiskOnly: filters.highRiskOnly
  });

  if (queryResult.error) {
    return { rows: [], total: 0, error: queryResult.error };
  }

  const userIds = queryResult.data.flatMap((r) =>
    [r.userId, r.creatorUserId, r.createdBy].filter(Boolean) as string[]
  );
  const storyIds = queryResult.data.map((r) => r.storyId).filter(Boolean) as string[];
  const chapterIds = queryResult.data.map((r) => r.chapterId).filter(Boolean) as string[];

  const { profileById } = await loadProfileMaps(userIds);
  const { storyById, chapterById } = await loadContentLabels(storyIds, chapterIds);

  let rows = queryResult.data
    .map((r) =>
      mapRefundToRow(r, {
        profileById,
        storyById,
        chapterById,
        creatorProfileById: profileById
      })
    )
    .filter((r) => matchesSearch(r, filters.search));

  const batchRows = await loadQualityBatchRows(filters);
  if (batchRows.length > 0 && filters.refundType === "all" || filters.refundType === "quality_low_refund") {
    rows = sortRows([...rows, ...batchRows], filters.sort);
  } else {
    rows = sortRows(rows, filters.sort);
  }

  const total = queryResult.total + (batchRows.length > 0 ? batchRows.length : 0);

  return { rows, total, error: null };
}
