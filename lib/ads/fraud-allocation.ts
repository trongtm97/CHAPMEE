import { createAdminClient } from "@/lib/supabase/admin";
import { logAdFraudAudit } from "@/lib/ads/fraud-audit";
import { logAdRevenueReconciliationAudit } from "@/lib/ads/reconciliation-audit";
import type { AdRevenueCreatorAllocation } from "@/types/ad-revenue-reconciliation";

function mapAllocation(row: Record<string, unknown>): AdRevenueCreatorAllocation {
  return {
    id: String(row.id),
    reconciliation_id: String(row.reconciliation_id),
    month: String(row.month),
    author_id: String(row.author_id),
    contribution_impressions: Number(row.contribution_impressions ?? 0),
    contribution_reads: Number(row.contribution_reads ?? 0),
    contribution_score: Number(row.contribution_score ?? 0),
    contribution_percent: Number(row.contribution_percent ?? 0),
    gross_allocated_vnd: Number(row.gross_allocated_vnd ?? 0),
    reserve_hold_vnd: Number(row.reserve_hold_vnd ?? 0),
    payable_after_reserve_vnd: Number(row.payable_after_reserve_vnd ?? 0),
    invalid_adjustment_vnd: Number(row.invalid_adjustment_vnd ?? 0),
    final_payable_vnd: Number(row.final_payable_vnd ?? 0),
    status: row.status as AdRevenueCreatorAllocation["status"],
    hold_reason: (row.hold_reason as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

async function getAllocation(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ad_revenue_creator_allocations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { allocation: null, error: error?.message ?? "Không tìm thấy allocation." };
  return { allocation: mapAllocation(data as Record<string, unknown>), error: null };
}

export async function holdCreatorAllocation(input: {
  allocationId: string;
  reason: string;
  actorId: string;
  fraudSignalId?: string | null;
}): Promise<{ allocation: AdRevenueCreatorAllocation | null; error: string | null }> {
  const reason = input.reason.trim();
  if (!reason) {
    return { allocation: null, error: "Vui lòng nhập lý do giữ doanh thu." };
  }

  const { allocation: before, error: loadError } = await getAllocation(input.allocationId);
  if (!before || loadError) {
    return { allocation: null, error: loadError };
  }

  if (before.status === "cancelled") {
    return { allocation: null, error: "Allocation đã bị hủy." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ad_revenue_creator_allocations")
    .update({
      status: "held",
      hold_reason: reason,
      fraud_signal_id: input.fraudSignalId ?? null
    })
    .eq("id", input.allocationId)
    .select("*")
    .single();

  if (error) return { allocation: null, error: error.message };

  const allocation = mapAllocation(data as Record<string, unknown>);
  await Promise.all([
    logAdFraudAudit({
      actorId: input.actorId,
      action: "allocation_held",
      allocationId: input.allocationId,
      signalId: input.fraudSignalId,
      before: before as unknown as Record<string, unknown>,
      after: allocation as unknown as Record<string, unknown>
    }),
    logAdRevenueReconciliationAudit({
      actorId: input.actorId,
      action: "allocation_held_fraud",
      reconciliationId: before.reconciliation_id,
      before: before as unknown as Record<string, unknown>,
      after: allocation as unknown as Record<string, unknown>
    })
  ]);

  return { allocation, error: null };
}

export async function releaseCreatorAllocationHold(input: {
  allocationId: string;
  reason: string;
  actorId: string;
  restoreStatus?: "locked" | "payable";
}): Promise<{ allocation: AdRevenueCreatorAllocation | null; error: string | null }> {
  const reason = input.reason.trim();
  if (!reason) {
    return { allocation: null, error: "Vui lòng nhập lý do mở giữ." };
  }

  const { allocation: before, error: loadError } = await getAllocation(input.allocationId);
  if (!before || loadError) {
    return { allocation: null, error: loadError };
  }

  if (before.status !== "held") {
    return { allocation: null, error: "Allocation không ở trạng thái held." };
  }

  const supabase = createAdminClient();
  const { data: rec } = await supabase
    .from("ad_revenue_monthly_reconciliations")
    .select("status")
    .eq("id", before.reconciliation_id)
    .maybeSingle();

  let nextStatus: AdRevenueCreatorAllocation["status"] = input.restoreStatus ?? "locked";
  if (!input.restoreStatus) {
    if (rec?.status === "reconciled") nextStatus = "payable";
    else if (rec?.status === "locked") nextStatus = "locked";
    else nextStatus = "estimate";
  }

  const { data, error } = await supabase
    .from("ad_revenue_creator_allocations")
    .update({
      status: nextStatus,
      hold_reason: `released: ${reason}`,
      fraud_signal_id: null
    })
    .eq("id", input.allocationId)
    .select("*")
    .single();

  if (error) return { allocation: null, error: error.message };

  const allocation = mapAllocation(data as Record<string, unknown>);
  await logAdFraudAudit({
    actorId: input.actorId,
    action: "allocation_released",
    allocationId: input.allocationId,
    before: before as unknown as Record<string, unknown>,
    after: allocation as unknown as Record<string, unknown>
  });

  return { allocation, error: null };
}

export async function cancelCreatorAllocation(input: {
  allocationId: string;
  reason: string;
  actorId: string;
  fraudSignalId?: string | null;
}): Promise<{ allocation: AdRevenueCreatorAllocation | null; error: string | null }> {
  const reason = input.reason.trim();
  if (!reason) {
    return { allocation: null, error: "Vui lòng nhập lý do hủy allocation." };
  }

  const { allocation: before, error: loadError } = await getAllocation(input.allocationId);
  if (!before || loadError) {
    return { allocation: null, error: loadError };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ad_revenue_creator_allocations")
    .update({
      status: "cancelled",
      hold_reason: reason,
      final_payable_vnd: 0,
      fraud_signal_id: input.fraudSignalId ?? null
    })
    .eq("id", input.allocationId)
    .select("*")
    .single();

  if (error) return { allocation: null, error: error.message };

  const allocation = mapAllocation(data as Record<string, unknown>);
  await Promise.all([
    logAdFraudAudit({
      actorId: input.actorId,
      action: "allocation_cancelled",
      allocationId: input.allocationId,
      signalId: input.fraudSignalId,
      before: before as unknown as Record<string, unknown>,
      after: allocation as unknown as Record<string, unknown>
    }),
    logAdRevenueReconciliationAudit({
      actorId: input.actorId,
      action: "allocation_cancelled_fraud",
      reconciliationId: before.reconciliation_id,
      before: before as unknown as Record<string, unknown>,
      after: allocation as unknown as Record<string, unknown>
    })
  ]);

  return { allocation, error: null };
}

export async function findAllocationsForAuthorMonth(authorId: string, month: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ad_revenue_creator_allocations")
    .select("id, status, final_payable_vnd, month, author_id")
    .eq("author_id", authorId)
    .eq("month", month)
    .order("created_at", { ascending: false });
  return data ?? [];
}
