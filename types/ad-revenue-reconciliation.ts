export type AdRevenueReconciliationStatus = "draft" | "locked" | "reconciled" | "cancelled";

export type AdRevenueAllocationStatus =
  | "estimate"
  | "locked"
  | "payable"
  | "held"
  | "cancelled";

export type AdRevenueMonthlyReconciliation = {
  id: string;
  month: string;
  gross_partner_revenue_vnd: number;
  invalid_traffic_adjustment_vnd: number;
  refund_adjustment_vnd: number;
  tax_fee_adjustment_vnd: number;
  other_adjustment_vnd: number;
  net_valid_revenue_vnd: number;
  creator_pool_percent: number;
  creator_pool_vnd: number;
  reserve_percent: number;
  reserve_hold_days: number;
  reserve_vnd: number;
  distributable_vnd: number;
  status: AdRevenueReconciliationStatus;
  notes: string | null;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdRevenueMonthlyReconciliationInput = {
  month: string;
  gross_partner_revenue_vnd?: number;
  invalid_traffic_adjustment_vnd?: number;
  refund_adjustment_vnd?: number;
  tax_fee_adjustment_vnd?: number;
  other_adjustment_vnd?: number;
  notes?: string | null;
};

export type AdRevenueCreatorAllocation = {
  id: string;
  reconciliation_id: string;
  month: string;
  author_id: string;
  contribution_impressions: number;
  contribution_reads: number;
  contribution_score: number;
  contribution_percent: number;
  gross_allocated_vnd: number;
  reserve_hold_vnd: number;
  payable_after_reserve_vnd: number;
  invalid_adjustment_vnd: number;
  final_payable_vnd: number;
  status: AdRevenueAllocationStatus;
  hold_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AdRevenueCreatorAllocationListItem = AdRevenueCreatorAllocation & {
  username: string | null;
  display_name: string | null;
};

export type AdRevenueReconciliationWithAllocations = AdRevenueMonthlyReconciliation & {
  allocations: AdRevenueCreatorAllocationListItem[];
  allocationSummary: {
    totalContributionScore: number;
    totalContributionPercent: number;
    authorCount: number;
  };
};

export type CreatorReconciledAdRevenueMonth = {
  month: string;
  label: "reconciled" | "estimate";
  grossAllocatedVnd: number;
  reserveHoldVnd: number;
  finalPayableVnd: number;
  reserveReleaseAt: string | null;
  reconciliationStatus: AdRevenueReconciliationStatus;
  allocationStatus: AdRevenueAllocationStatus;
  /** Creator-facing status — no sensitive fraud rule details */
  displayStatus: "paid_track" | "under_review" | "cancelled" | "estimate";
  statusMessage: string | null;
};

export const AD_REVENUE_RECONCILIATION_STATUS_LABELS: Record<
  AdRevenueReconciliationStatus,
  string
> = {
  draft: "Nháp",
  locked: "Đã khóa",
  reconciled: "Đã đối soát",
  cancelled: "Đã hủy"
};
