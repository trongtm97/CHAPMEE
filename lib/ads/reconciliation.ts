import { createAdminClient } from "@/lib/data/admin";
import { createClient } from "@/lib/data/server";
import { getAdRevenueEstimateSettings } from "@/lib/ads/ad-revenue-settings";
import { logAdRevenueReconciliationAudit } from "@/lib/ads/reconciliation-audit";
import { getCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy";
import type {
  AdRevenueCreatorAllocation,
  AdRevenueCreatorAllocationListItem,
  AdRevenueMonthlyReconciliation,
  AdRevenueMonthlyReconciliationInput,
  AdRevenueReconciliationWithAllocations,
  CreatorReconciledAdRevenueMonth
} from "@/types/ad-revenue-reconciliation";

const MONTH_RE = /^\d{4}-\d{2}$/;

export function computeNetValidRevenueVnd(input: {
  gross_partner_revenue_vnd: number;
  invalid_traffic_adjustment_vnd: number;
  refund_adjustment_vnd: number;
  tax_fee_adjustment_vnd: number;
  other_adjustment_vnd: number;
}): number {
  const net =
    input.gross_partner_revenue_vnd -
    input.invalid_traffic_adjustment_vnd -
    input.refund_adjustment_vnd -
    input.tax_fee_adjustment_vnd -
    input.other_adjustment_vnd;
  return Math.max(0, net);
}

export function computeReconciliationPoolAmounts(input: {
  net_valid_revenue_vnd: number;
  creator_pool_percent: number;
  reserve_percent: number;
}) {
  const creator_pool_vnd = input.net_valid_revenue_vnd * (input.creator_pool_percent / 100);
  const reserve_vnd = creator_pool_vnd * (input.reserve_percent / 100);
  const distributable_vnd = creator_pool_vnd - reserve_vnd;
  return { creator_pool_vnd, reserve_vnd, distributable_vnd };
}

export function computeAuthorAllocation(input: {
  contribution_score: number;
  total_score: number;
  creator_pool_vnd: number;
  reserve_percent: number;
  invalid_adjustment_vnd: number;
}) {
  const contribution_percent =
    input.total_score > 0 ? (input.contribution_score / input.total_score) * 100 : 0;
  const gross_allocated_vnd = input.creator_pool_vnd * (contribution_percent / 100);
  const reserve_hold_vnd = gross_allocated_vnd * (input.reserve_percent / 100);
  const payable_after_reserve_vnd = gross_allocated_vnd - reserve_hold_vnd;
  let final_payable_vnd = payable_after_reserve_vnd - input.invalid_adjustment_vnd;
  let hold_reason: string | null = null;
  if (final_payable_vnd < 0) {
    hold_reason = "final_payable_clamped_to_zero";
    final_payable_vnd = 0;
  }
  return {
    contribution_percent,
    gross_allocated_vnd,
    reserve_hold_vnd,
    payable_after_reserve_vnd,
    final_payable_vnd,
    hold_reason
  };
}

function mapReconciliation(row: Record<string, unknown>): AdRevenueMonthlyReconciliation {
  return {
    id: String(row.id),
    month: String(row.month),
    gross_partner_revenue_vnd: Number(row.gross_partner_revenue_vnd ?? 0),
    invalid_traffic_adjustment_vnd: Number(row.invalid_traffic_adjustment_vnd ?? 0),
    refund_adjustment_vnd: Number(row.refund_adjustment_vnd ?? 0),
    tax_fee_adjustment_vnd: Number(row.tax_fee_adjustment_vnd ?? 0),
    other_adjustment_vnd: Number(row.other_adjustment_vnd ?? 0),
    net_valid_revenue_vnd: Number(row.net_valid_revenue_vnd ?? 0),
    creator_pool_percent: Number(row.creator_pool_percent ?? 0),
    creator_pool_vnd: Number(row.creator_pool_vnd ?? 0),
    reserve_percent: Number(row.reserve_percent ?? 0),
    reserve_hold_days: Number(row.reserve_hold_days ?? 0),
    reserve_vnd: Number(row.reserve_vnd ?? 0),
    distributable_vnd: Number(row.distributable_vnd ?? 0),
    status: row.status as AdRevenueMonthlyReconciliation["status"],
    notes: (row.notes as string | null) ?? null,
    locked_by: (row.locked_by as string | null) ?? null,
    locked_at: (row.locked_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

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

async function snapshotPolicyPercents() {
  const policy = await getCreatorAdRevenuePolicy({ useAdmin: true });
  return {
    creator_pool_percent: policy.creator_pool_percent,
    reserve_percent: policy.reserve_percent,
    reserve_hold_days: policy.reserve_hold_days
  };
}

function buildTotalsPatch(rec: {
  gross_partner_revenue_vnd: number;
  invalid_traffic_adjustment_vnd: number;
  refund_adjustment_vnd: number;
  tax_fee_adjustment_vnd: number;
  other_adjustment_vnd: number;
  creator_pool_percent: number;
  reserve_percent: number;
}) {
  const net_valid_revenue_vnd = computeNetValidRevenueVnd(rec);
  const pools = computeReconciliationPoolAmounts({
    net_valid_revenue_vnd,
    creator_pool_percent: rec.creator_pool_percent,
    reserve_percent: rec.reserve_percent
  });
  return { net_valid_revenue_vnd, ...pools };
}

export async function listAdRevenueReconciliations(): Promise<{
  reconciliations: AdRevenueMonthlyReconciliation[];
  error: string | null;
}> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("ad_revenue_monthly_reconciliations")
      .select("*")
      .order("month", { ascending: false });
    if (error) return { reconciliations: [], error: error.message };
    return {
      reconciliations: (data ?? []).map((r) => mapReconciliation(r as Record<string, unknown>)),
      error: null
    };
  } catch {
    return { reconciliations: [], error: "Không tải được danh sách đối soát." };
  }
}

export async function getAdRevenueReconciliation(
  id: string
): Promise<{ reconciliation: AdRevenueReconciliationWithAllocations | null; error: string | null }> {
  try {
    const db = createAdminClient();
    const { data: rec, error: recError } = await db
      .from("ad_revenue_monthly_reconciliations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (recError || !rec) {
      return { reconciliation: null, error: recError?.message ?? "Không tìm thấy kỳ đối soát." };
    }

    const { data: allocations, error: allocError } = await db
      .from("ad_revenue_creator_allocations")
      .select(
        `
        *,
        author:profiles!ad_revenue_creator_allocations_author_id_fkey(username, display_name)
      `
      )
      .eq("reconciliation_id", id)
      .order("contribution_score", { ascending: false });

    if (allocError) {
      return { reconciliation: null, error: allocError.message };
    }

    const mappedAllocations: AdRevenueCreatorAllocationListItem[] = (allocations ?? []).map(
      (row) => {
        const base = mapAllocation(row as Record<string, unknown>);
        const author = (row as { author?: { username?: string; display_name?: string } }).author;
        return {
          ...base,
          username: author?.username ?? null,
          display_name: author?.display_name ?? null
        };
      }
    );

    const totalContributionScore = mappedAllocations.reduce(
      (s, a) => s + a.contribution_score,
      0
    );
    const totalContributionPercent = mappedAllocations.reduce(
      (s, a) => s + a.contribution_percent,
      0
    );

    return {
      reconciliation: {
        ...mapReconciliation(rec as Record<string, unknown>),
        allocations: mappedAllocations,
        allocationSummary: {
          totalContributionScore,
          totalContributionPercent,
          authorCount: mappedAllocations.length
        }
      },
      error: null
    };
  } catch {
    return { reconciliation: null, error: "Không tải được kỳ đối soát." };
  }
}

export async function createAdRevenueReconciliation(
  input: AdRevenueMonthlyReconciliationInput,
  actorId: string
): Promise<{ reconciliation: AdRevenueMonthlyReconciliation | null; error: string | null }> {
  if (!MONTH_RE.test(input.month)) {
    return { reconciliation: null, error: "Tháng phải có định dạng YYYY-MM." };
  }

  try {
    const db = createAdminClient();
    const policy = await snapshotPolicyPercents();
    const totals = buildTotalsPatch({
      gross_partner_revenue_vnd: input.gross_partner_revenue_vnd ?? 0,
      invalid_traffic_adjustment_vnd: input.invalid_traffic_adjustment_vnd ?? 0,
      refund_adjustment_vnd: input.refund_adjustment_vnd ?? 0,
      tax_fee_adjustment_vnd: input.tax_fee_adjustment_vnd ?? 0,
      other_adjustment_vnd: input.other_adjustment_vnd ?? 0,
      creator_pool_percent: policy.creator_pool_percent,
      reserve_percent: policy.reserve_percent
    });

    const { data, error } = await db
      .from("ad_revenue_monthly_reconciliations")
      .insert({
        month: input.month,
        gross_partner_revenue_vnd: input.gross_partner_revenue_vnd ?? 0,
        invalid_traffic_adjustment_vnd: input.invalid_traffic_adjustment_vnd ?? 0,
        refund_adjustment_vnd: input.refund_adjustment_vnd ?? 0,
        tax_fee_adjustment_vnd: input.tax_fee_adjustment_vnd ?? 0,
        other_adjustment_vnd: input.other_adjustment_vnd ?? 0,
        notes: input.notes ?? null,
        creator_pool_percent: policy.creator_pool_percent,
        reserve_percent: policy.reserve_percent,
        reserve_hold_days: policy.reserve_hold_days,
        ...totals,
        status: "draft"
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { reconciliation: null, error: "Đã tồn tại kỳ đối soát cho tháng này." };
      }
      return { reconciliation: null, error: error.message };
    }

    const reconciliation = mapReconciliation(data as Record<string, unknown>);
    await logAdRevenueReconciliationAudit({
      actorId,
      action: "reconciliation_created",
      reconciliationId: reconciliation.id,
      after: reconciliation as unknown as Record<string, unknown>
    });
    return { reconciliation, error: null };
  } catch {
    return { reconciliation: null, error: "Không tạo được kỳ đối soát." };
  }
}

export async function updateAdRevenueReconciliation(
  id: string,
  input: AdRevenueMonthlyReconciliationInput,
  actorId: string
): Promise<{ reconciliation: AdRevenueMonthlyReconciliation | null; error: string | null }> {
  const existing = await getAdRevenueReconciliation(id);
  if (!existing.reconciliation) {
    return { reconciliation: null, error: existing.error };
  }
  if (existing.reconciliation.status !== "draft") {
    return {
      reconciliation: null,
      error: "Chỉ được sửa kỳ ở trạng thái nháp."
    };
  }

  const rec = existing.reconciliation;
  const before = { ...rec };
  const patch = {
    gross_partner_revenue_vnd:
      input.gross_partner_revenue_vnd ?? rec.gross_partner_revenue_vnd,
    invalid_traffic_adjustment_vnd:
      input.invalid_traffic_adjustment_vnd ?? rec.invalid_traffic_adjustment_vnd,
    refund_adjustment_vnd: input.refund_adjustment_vnd ?? rec.refund_adjustment_vnd,
    tax_fee_adjustment_vnd: input.tax_fee_adjustment_vnd ?? rec.tax_fee_adjustment_vnd,
    other_adjustment_vnd: input.other_adjustment_vnd ?? rec.other_adjustment_vnd,
    notes: input.notes !== undefined ? input.notes : rec.notes
  };
  const totals = buildTotalsPatch({
    ...patch,
    creator_pool_percent: rec.creator_pool_percent,
    reserve_percent: rec.reserve_percent
  });

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("ad_revenue_monthly_reconciliations")
      .update({ ...patch, ...totals })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return { reconciliation: null, error: error.message };
    const reconciliation = mapReconciliation(data as Record<string, unknown>);
    await logAdRevenueReconciliationAudit({
      actorId,
      action: "reconciliation_updated",
      reconciliationId: id,
      before: before as unknown as Record<string, unknown>,
      after: reconciliation as unknown as Record<string, unknown>
    });
    return { reconciliation, error: null };
  } catch {
    return { reconciliation: null, error: "Không cập nhật được kỳ đối soát." };
  }
}

type MonthlyAuthorContribution = {
  author_id: string;
  rendered_impressions: number;
  estimated_reads: number;
  invalid_adjustment_vnd: number;
};

async function loadMonthlyContributions(month: string): Promise<MonthlyAuthorContribution[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("ad_monthly_author_stats")
    .select("author_id, rendered_impressions, estimated_reads, invalid_adjustment_vnd")
    .eq("month", month);

  if (error) return [];
  return (data ?? []).map((row) => ({
    author_id: String(row.author_id),
    rendered_impressions: Number(row.rendered_impressions ?? 0),
    estimated_reads: Number(row.estimated_reads ?? 0),
    invalid_adjustment_vnd: Number(row.invalid_adjustment_vnd ?? 0)
  }));
}

function buildAllocationRows(
  rec: AdRevenueMonthlyReconciliation,
  contributions: MonthlyAuthorContribution[]
): Omit<AdRevenueCreatorAllocation, "id" | "created_at" | "updated_at">[] {
  const totalScore = contributions.reduce(
    (s, c) => s + c.rendered_impressions,
    0
  );

  return contributions.map((c) => {
    const score = c.rendered_impressions;
    const computed = computeAuthorAllocation({
      contribution_score: score,
      total_score: totalScore,
      creator_pool_vnd: rec.creator_pool_vnd,
      reserve_percent: rec.reserve_percent,
      invalid_adjustment_vnd: c.invalid_adjustment_vnd
    });
    return {
      reconciliation_id: rec.id,
      month: rec.month,
      author_id: c.author_id,
      contribution_impressions: c.rendered_impressions,
      contribution_reads: c.estimated_reads,
      contribution_score: score,
      contribution_percent: computed.contribution_percent,
      gross_allocated_vnd: computed.gross_allocated_vnd,
      reserve_hold_vnd: computed.reserve_hold_vnd,
      payable_after_reserve_vnd: computed.payable_after_reserve_vnd,
      invalid_adjustment_vnd: c.invalid_adjustment_vnd,
      final_payable_vnd: computed.final_payable_vnd,
      status: "estimate" as const,
      hold_reason: computed.hold_reason
    };
  });
}

export async function calculateAdRevenueAllocations(
  reconciliationId: string,
  options: { preview?: boolean; actorId?: string }
): Promise<{
  allocations: AdRevenueCreatorAllocationListItem[];
  summary: { totalContributionScore: number; totalContributionPercent: number };
  error: string | null;
}> {
  const { reconciliation, error } = await getAdRevenueReconciliation(reconciliationId);
  if (!reconciliation || error) {
    return {
      allocations: [],
      summary: { totalContributionScore: 0, totalContributionPercent: 0 },
      error: error ?? "Không tìm thấy kỳ."
    };
  }

  if (reconciliation.status !== "draft") {
    return {
      allocations: [],
      summary: { totalContributionScore: 0, totalContributionPercent: 0 },
      error: "Chỉ tính phân bổ khi kỳ đang ở trạng thái nháp."
    };
  }

  const contributions = await loadMonthlyContributions(reconciliation.month);
  const rows = buildAllocationRows(reconciliation, contributions);

  const totalContributionScore = rows.reduce((s, r) => s + r.contribution_score, 0);
  const totalContributionPercent = rows.reduce((s, r) => s + r.contribution_percent, 0);

  if (options.preview) {
    return {
      allocations: rows.map((r) => ({
        ...r,
        id: `preview-${r.author_id}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        username: null,
        display_name: null
      })),
      summary: { totalContributionScore, totalContributionPercent },
      error: null
    };
  }

  const db = createAdminClient();
  await db
    .from("ad_revenue_creator_allocations")
    .delete()
    .eq("reconciliation_id", reconciliationId);

  if (rows.length > 0) {
    const { error: insertError } = await db
      .from("ad_revenue_creator_allocations")
      .insert(rows);
    if (insertError) {
      return {
        allocations: [],
        summary: { totalContributionScore: 0, totalContributionPercent: 0 },
        error: insertError.message
      };
    }
  }

  if (options.actorId) {
    await logAdRevenueReconciliationAudit({
      actorId: options.actorId,
      action: "allocations_calculated",
      reconciliationId,
      after: {
        authorCount: rows.length,
        totalContributionScore,
        totalContributionPercent
      }
    });
  }

  const refreshed = await getAdRevenueReconciliation(reconciliationId);
  return {
    allocations: refreshed.reconciliation?.allocations ?? [],
    summary: {
      totalContributionScore,
      totalContributionPercent
    },
    error: null
  };
}

export async function lockAdRevenueReconciliation(
  id: string,
  actorId: string
): Promise<{ reconciliation: AdRevenueMonthlyReconciliation | null; error: string | null }> {
  const { reconciliation, error } = await getAdRevenueReconciliation(id);
  if (!reconciliation || error) {
    return { reconciliation: null, error: error ?? "Không tìm thấy kỳ." };
  }

  if (reconciliation.status !== "draft") {
    return { reconciliation: null, error: "Chỉ khóa được kỳ ở trạng thái nháp." };
  }

  if (reconciliation.net_valid_revenue_vnd < 0) {
    return { reconciliation: null, error: "Doanh thu hợp lệ không được âm." };
  }

  const totalScore = reconciliation.allocationSummary.totalContributionScore;
  if (reconciliation.creator_pool_vnd > 0 && totalScore <= 0) {
    return {
      reconciliation: null,
      error:
        "Không thể khóa: creator pool > 0 nhưng tổng contribution_score = 0. Hãy calculate allocations hoặc kiểm tra monthly stats."
    };
  }

  const lockedAt = new Date().toISOString();
  const db = createAdminClient();
  const before = { ...reconciliation };

  const { data, error: lockError } = await db
    .from("ad_revenue_monthly_reconciliations")
    .update({
      status: "locked",
      locked_by: actorId,
      locked_at: lockedAt
    })
    .eq("id", id)
    .select("*")
    .single();

  if (lockError) return { reconciliation: null, error: lockError.message };

  await db
    .from("ad_revenue_creator_allocations")
    .update({ status: "locked" })
    .eq("reconciliation_id", id)
    .neq("status", "cancelled");

  const updated = mapReconciliation(data as Record<string, unknown>);
  await logAdRevenueReconciliationAudit({
    actorId,
    action: "reconciliation_locked",
    reconciliationId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>
  });

  return { reconciliation: updated, error: null };
}

export async function cancelAdRevenueReconciliation(
  id: string,
  actorId: string
): Promise<{ reconciliation: AdRevenueMonthlyReconciliation | null; error: string | null }> {
  const { reconciliation, error } = await getAdRevenueReconciliation(id);
  if (!reconciliation || error) {
    return { reconciliation: null, error: error ?? "Không tìm thấy kỳ." };
  }

  if (reconciliation.status === "cancelled") {
    return { reconciliation: null, error: "Kỳ đã bị hủy trước đó." };
  }

  const db = createAdminClient();
  const before = { ...reconciliation };

  const { data, error: cancelError } = await db
    .from("ad_revenue_monthly_reconciliations")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select("*")
    .single();

  if (cancelError) return { reconciliation: null, error: cancelError.message };

  await db
    .from("ad_revenue_creator_allocations")
    .update({ status: "cancelled" })
    .eq("reconciliation_id", id);

  const updated = mapReconciliation(data as Record<string, unknown>);
  await logAdRevenueReconciliationAudit({
    actorId,
    action: "reconciliation_cancelled",
    reconciliationId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>
  });

  return { reconciliation: updated, error: null };
}

export async function markAdRevenueReconciliationReconciled(
  id: string,
  actorId: string
): Promise<{ reconciliation: AdRevenueMonthlyReconciliation | null; error: string | null }> {
  const { reconciliation, error } = await getAdRevenueReconciliation(id);
  if (!reconciliation || error) {
    return { reconciliation: null, error: error ?? "Không tìm thấy kỳ." };
  }
  if (reconciliation.status !== "locked") {
    return { reconciliation: null, error: "Chỉ đánh dấu đối soát sau khi đã khóa kỳ." };
  }

  const db = createAdminClient();
  const { data, error: updateError } = await db
    .from("ad_revenue_monthly_reconciliations")
    .update({ status: "reconciled" })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) return { reconciliation: null, error: updateError.message };

  await db
    .from("ad_revenue_creator_allocations")
    .update({ status: "payable" })
    .eq("reconciliation_id", id)
    .eq("status", "locked");

  const updated = mapReconciliation(data as Record<string, unknown>);
  await logAdRevenueReconciliationAudit({
    actorId,
    action: "reconciliation_reconciled",
    reconciliationId: id,
    after: updated as unknown as Record<string, unknown>
  });

  return { reconciliation: updated, error: null };
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function getCreatorReconciledAdRevenueMonths(
  authorUserId: string
): Promise<{
  months: CreatorReconciledAdRevenueMonth[];
  estimatesVisible: boolean;
  error: string | null;
}> {
  const estimateSettings = await getAdRevenueEstimateSettings();

  try {
    const db = await createClient();
    const { data: allocations, error } = await db
      .from("ad_revenue_creator_allocations")
      .select(
        `
        *,
        reconciliation:ad_revenue_monthly_reconciliations!inner(
          status,
          locked_at,
          reserve_hold_days
        )
      `
      )
      .eq("author_id", authorUserId)
      .order("month", { ascending: false })
      .limit(24);

    if (error) {
      return { months: [], estimatesVisible: false, error: error.message };
    }

    const reconciledMonths: CreatorReconciledAdRevenueMonth[] = (allocations ?? []).map(
      (row) => {
        const alloc = mapAllocation(row as Record<string, unknown>);
        const rec = (
          row as {
            reconciliation?: {
              status: string;
              locked_at: string | null;
              reserve_hold_days: number;
            };
          }
        ).reconciliation;
        const lockedAt = rec?.locked_at ?? null;
        const reserveDays = rec?.reserve_hold_days ?? 0;
        let displayStatus: CreatorReconciledAdRevenueMonth["displayStatus"] = "paid_track";
        let statusMessage: string | null = null;
        let finalPayable = alloc.final_payable_vnd;

        if (alloc.status === "held") {
          displayStatus = "under_review";
          statusMessage =
            "Một phần doanh thu quảng cáo tháng này đang được giữ để kiểm tra. ChapMee sẽ thông báo khi có kết quả.";
          finalPayable = 0;
        } else if (alloc.status === "cancelled") {
          displayStatus = "cancelled";
          statusMessage =
            "Doanh thu quảng cáo tháng này không được tính vào khoản thanh toán do điều kiện kiểm tra hoặc đối soát.";
          finalPayable = 0;
        } else if (alloc.status === "payable" || alloc.status === "locked") {
          displayStatus = "paid_track";
        }

        return {
          month: alloc.month,
          label: "reconciled" as const,
          grossAllocatedVnd: alloc.gross_allocated_vnd,
          reserveHoldVnd: alloc.reserve_hold_vnd,
          finalPayableVnd: finalPayable,
          reserveReleaseAt: lockedAt ? addDaysIso(lockedAt, reserveDays) : null,
          reconciliationStatus: rec?.status as CreatorReconciledAdRevenueMonth["reconciliationStatus"],
          allocationStatus: alloc.status,
          displayStatus,
          statusMessage
        };
      }
    );

    let estimateMonths: CreatorReconciledAdRevenueMonth[] = [];
    if (estimateSettings.is_estimate_visible_to_creators) {
      const admin = createAdminClient();
      const { data: stats } = await admin
        .from("ad_monthly_author_stats")
        .select("*")
        .eq("author_id", authorUserId)
        .order("month", { ascending: false })
        .limit(12);

      const reconciledMonthSet = new Set(reconciledMonths.map((m) => m.month));
      estimateMonths = (stats ?? [])
        .filter((s) => !reconciledMonthSet.has(String(s.month)))
        .map((s) => ({
          month: String(s.month),
          label: "estimate" as const,
          grossAllocatedVnd: Number(s.estimated_gross_revenue_vnd ?? 0),
          reserveHoldVnd: Number(s.reserve_hold_vnd ?? 0),
          finalPayableVnd: Number(s.estimated_payable_vnd ?? 0),
          reserveReleaseAt: null,
          reconciliationStatus: "draft" as const,
          allocationStatus: "estimate" as const,
          displayStatus: "estimate" as const,
          statusMessage:
            "Số liệu ước tính nội bộ, chưa phải doanh thu đã đối soát từ đối tác quảng cáo."
        }));
    }

    const months = [...reconciledMonths, ...estimateMonths].sort((a, b) =>
      b.month.localeCompare(a.month)
    );

    return {
      months,
      estimatesVisible: estimateSettings.is_estimate_visible_to_creators,
      error: null
    };
  } catch {
    return {
      months: [],
      estimatesVisible: false,
      error: "Không tải được doanh thu quảng cáo đã đối soát."
    };
  }
}
