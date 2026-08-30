"use server";

import { checkStaffAnyPermission } from "@/lib/auth/staff-guards";
import { createClient } from "@/lib/data/server";
import type { RefundKpiSummary } from "@/types/admin-refund";

function toNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getRefundKpis(input?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data: RefundKpiSummary; error: string | null }> {
  const auth = await checkStaffAnyPermission(["finance.refund.view", "finance.refund.create"]);
  if (!auth.ok) {
    return {
      data: {
        pendingCount: 0,
        processingCount: 0,
        completedTodayCount: 0,
        totalCoinRefunded: 0,
        totalVndRefunded: 0,
        qualityLowCount: 0,
        adminManualCount: 0,
        failedOrReviewCount: 0
      },
      error: auth.error
    };
  }

  const db = await createClient();
  let query = db.from("refunds").select("*");
  if (input?.startDate) query = query.gte("created_at", input.startDate);
  if (input?.endDate) query = query.lte("created_at", `${input.endDate}T23:59:59.999Z`);

  const { data: refunds, error } = await query;
  if (error) {
    return {
      data: {
        pendingCount: 0,
        processingCount: 0,
        completedTodayCount: 0,
        totalCoinRefunded: 0,
        totalVndRefunded: 0,
        qualityLowCount: 0,
        adminManualCount: 0,
        failedOrReviewCount: 0
      },
      error: error.message
    };
  }

  const todayStart = startOfTodayIso();
  let pendingCount = 0;
  let processingCount = 0;
  let completedTodayCount = 0;
  let totalCoinRefunded = 0;
  let totalVndRefunded = 0;
  let qualityLowCount = 0;
  let adminManualCount = 0;
  let failedOrReviewCount = 0;

  for (const r of refunds ?? []) {
    const status = r.status as string;
    const coin = toNumber(r.coin_amount);
    const vnd = toNumber(r.amount_vnd);
    const refundType = r.refund_type as string | null;
    const processedAt = r.processed_at as string | null;

    if (status === "pending" || status === "reviewing") pendingCount += 1;
    if (status === "processing" || status === "approved") processingCount += 1;
    if (status === "completed" && processedAt && processedAt >= todayStart) {
      completedTodayCount += 1;
    }
    if (status === "completed") {
      totalCoinRefunded += coin;
      totalVndRefunded += vnd;
    }
    if (refundType === "quality_low_refund" || r.source === "content_quality_action") {
      qualityLowCount += 1;
    }
    if (refundType === "admin_manual_refund" || r.source === "admin_manual") {
      adminManualCount += 1;
    }
    if (status === "failed" || status === "reviewing") failedOrReviewCount += 1;
  }

  const { count: batchQualityCount } = await db
    .from("coin_refund_batches")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .eq("reason_code", "quality_low");

  qualityLowCount += batchQualityCount ?? 0;

  return {
    data: {
      pendingCount,
      processingCount,
      completedTodayCount,
      totalCoinRefunded,
      totalVndRefunded,
      qualityLowCount,
      adminManualCount,
      failedOrReviewCount
    },
    error: null
  };
}
