export const CREATOR_AD_REVENUE_POLICY_ID = "22222222-2222-2222-2222-222222222222";

export type CreatorAdMonetizationStatus =
  | "not_enabled"
  | "pending_review"
  | "eligible"
  | "suspended"
  | "rejected"
  | "fraud_hold";

export type CreatorAdPolicyPublishStatus = "draft" | "published" | "archived";

export type CreatorAdKycStatus = "not_started" | "pending" | "verified" | "rejected";

export type CreatorAdTaxStatus = "not_submitted" | "submitted" | "verified" | "rejected";

export type CreatorAdPayoutStatus = "not_setup" | "pending" | "verified" | "blocked";

export type CreatorAdRevenuePolicy = {
  id: string;
  is_enabled: boolean;
  beta_mode: boolean;
  creator_pool_percent: number;
  reserve_percent: number;
  reserve_hold_days: number;
  min_payout_vnd: number;
  payout_cycle: string;
  require_kyc: boolean;
  require_tax_info: boolean;
  require_payout_setup: boolean;
  require_good_standing: boolean;
  min_monthly_valid_reads: number;
  min_monthly_ad_impressions: number;
  invalid_traffic_hold_enabled: boolean;
  internal_tracking_only: boolean;
  show_estimated_revenue_to_creators: boolean;
  estimated_revenue_disclaimer_enabled: boolean;
  max_invalid_traffic_rate: number;
  max_suspicious_ctr: number;
  auto_hold_invalid_traffic: boolean;
  auto_hold_suspicious_ctr: boolean;
  auto_hold_traffic_spike: boolean;
  auto_hold_reported_content: boolean;
  auto_hold_copyright_dispute: boolean;
  auto_hold_missing_compliance: boolean;
  policy_version: string;
  policy_status: CreatorAdPolicyPublishStatus;
  policy_effective_at: string | null;
  policy_published_at: string | null;
  policy_text: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type CreatorAdRevenuePolicyInput = Partial<
  Omit<CreatorAdRevenuePolicy, "id" | "updated_at" | "updated_by">
>;

export type CreatorAdMonetizationProfile = {
  id: string;
  user_id: string;
  status: CreatorAdMonetizationStatus;
  kyc_status: CreatorAdKycStatus;
  tax_status: CreatorAdTaxStatus;
  payout_status: CreatorAdPayoutStatus;
  ads_revenue_enabled: boolean;
  fraud_hold: boolean;
  internal_note: string | null;
  suspension_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatorAdMonetizationProfileListItem = CreatorAdMonetizationProfile & {
  username: string | null;
  display_name: string | null;
  estimated_revenue_month_vnd?: number;
  has_fraud_signal?: boolean;
};

export type CreatorAdPolicyAuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  target_user_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
  note?: string | null;
  actor_display_name?: string | null;
  actor_username?: string | null;
  target_username?: string | null;
};

export type AdminAdRevenuePolicyOverview = {
  eligibleCreators: number;
  fraudHoldCreators: number;
  missingComplianceCreators: number;
  openFraudSignals: number;
  placementsEnabled: number;
  checklist: { id: string; label: string; met: boolean; detail?: string }[];
};

export type CreatorAdEligibilityChecklistItem = {
  id: string;
  label: string;
  met: boolean;
  ctaLabel?: string;
  ctaHref?: string;
};

export type CreatorAdSharingStatusForStudio = {
  programEnabled: boolean;
  betaMode: boolean;
  participationStatus: CreatorAdMonetizationStatus;
  adsRevenueEnabled: boolean;
  policy: Pick<
    CreatorAdRevenuePolicy,
    | "creator_pool_percent"
    | "reserve_percent"
    | "reserve_hold_days"
    | "min_payout_vnd"
    | "payout_cycle"
  >;
  policyText: string;
  checklist: CreatorAdEligibilityChecklistItem[];
  allRequirementsMet: boolean;
  statusMessage: string | null;
  statusTone: "neutral" | "success" | "warning" | "danger";
};

export type AdminCreatorAdProfileAction =
  | "approve"
  | "suspend"
  | "reject"
  | "reset"
  | "fraud_hold"
  | "release_fraud_hold"
  | "toggle_ads";

export const CREATOR_AD_STATUS_LABELS: Record<CreatorAdMonetizationStatus, string> = {
  not_enabled: "Chưa bật",
  pending_review: "Chờ duyệt",
  eligible: "Đủ điều kiện",
  suspended: "Tạm dừng",
  rejected: "Từ chối",
  fraud_hold: "Giữ do fraud"
};

export const CREATOR_AD_PAYOUT_CYCLE_LABELS: Record<string, string> = {
  monthly_m1: "Hàng tháng (M+1)",
  monthly_m2_day_5_10: "Hàng tháng (M+2, ngày 5–10)",
  custom: "Tùy chỉnh (cấu hình nội bộ)"
};

export const CREATOR_AD_POLICY_STATUS_LABELS: Record<CreatorAdPolicyPublishStatus, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Lưu trữ"
};

export function creatorPublicProfilePath(username: string | null | undefined, userId: string) {
  if (username?.trim()) return `/@${username.trim()}`;
  return `/u/${userId}`;
}
