export type CreatorFeePolicyStatus =
  | "draft"
  | "active"
  | "scheduled"
  | "expired"
  | "disabled"
  | "paused"
  | "revoked";

export type CreatorFeePolicySource = "default_config" | "creator_override";

export type CreatorFeeRevenueSourceId =
  | "paid_chapter"
  | "tip"
  | "early_access"
  | "vip_subscription"
  | "fan_club_subscription"
  | "virtual_gift"
  | "rewarded_ads"
  | "sponsored_challenge";

export type CreatorFeeSourceRate = {
  author_percent: number;
  platform_percent: number;
};

export type CreatorFeeSourceRates = Partial<
  Record<CreatorFeeRevenueSourceId, CreatorFeeSourceRate>
>;

export type CreatorFeePolicyCreatorType =
  | "normal"
  | "verified"
  | "blue_tick"
  | "originals"
  | "strategic_partner";

export type CreatorFeePolicyRow = {
  id: string;
  creator_id: string;
  policy_name: string;
  creator_revenue_share_percent: number | null;
  platform_fee_percent: number | null;
  payment_processing_fee_percent: number | null;
  payment_processing_fixed_fee: number | null;
  tip_platform_fee_percent: number | null;
  min_withdraw_amount_override: number | null;
  allowed_price_steps_override: number[] | null;
  source_rates: CreatorFeeSourceRates | null;
  creator_type: CreatorFeePolicyCreatorType | null;
  contract_ref: string | null;
  note: string | null;
  public_note: string | null;
  show_details_to_creator: boolean;
  status: CreatorFeePolicyStatus;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revoked_reason: string | null;
};

export type CreatorFeePolicyInput = {
  creatorId: string;
  policyName: string;
  creatorRevenueSharePercent?: number | null;
  platformFeePercent?: number | null;
  paymentProcessingFeePercent?: number | null;
  paymentProcessingFixedFee?: number | null;
  tipPlatformFeePercent?: number | null;
  minWithdrawAmountOverride?: number | null;
  allowedPriceStepsOverride?: number[] | null;
  sourceRates?: CreatorFeeSourceRates | null;
  creatorType?: CreatorFeePolicyCreatorType | null;
  contractRef?: string | null;
  note?: string | null;
  publicNote?: string | null;
  showDetailsToCreator?: boolean;
  status?: CreatorFeePolicyStatus;
  startsAt?: string;
  endsAt?: string | null;
  confirmOverlap?: boolean;
};

export type ResolvedCreatorFeePolicy = {
  source: CreatorFeePolicySource;
  policyId: string | null;
  policyName: string | null;
  revenueSource: CreatorFeeRevenueSourceId;
  creatorRevenueSharePercent: number;
  platformFeePercent: number;
  paymentProcessingFeePercent: number;
  paymentProcessingFixedFeeVnd: number;
  tipPlatformFeePercent: number | null;
  minWithdrawAmountOverride: number | null;
  allowedPriceStepsOverride: number[] | null;
  publicNote: string | null;
  showDetailsToCreator: boolean;
  revenueBasis: "gross" | "net";
  calculateOnNetAfterChannelFee: boolean;
  policyEffectiveFrom: string | null;
  appliedPolicyType: "default" | "custom";
};

export type CreatorFeePolicySnapshot = {
  policy_source: CreatorFeePolicySource;
  policy_id: string | null;
  policy_name: string | null;
  revenue_source_snapshot: CreatorFeeRevenueSourceId;
  applied_policy_type: "default" | "custom";
  policy_effective_from_snapshot: string | null;
  author_percent_snapshot: number;
  platform_percent_snapshot: number;
  platform_fee_percent: number;
  creator_revenue_share_percent: number;
  payment_processing_fee_percent: number;
  payment_processing_fixed_fee_vnd: number;
  tip_platform_fee_percent?: number | null;
  min_withdraw_amount_override?: number | null;
};

export type CreatorFeePolicyAdminView = CreatorFeePolicyRow & {
  transaction_count: number;
  creator_label: string;
  creator_username: string | null;
  creator_email: string | null;
  creator_avatar_url: string | null;
  studio_name: string | null;
  updated_by_label: string | null;
  revenue_30d_vnd?: number;
};

export type CreatorFeePolicyPreviewResult = {
  coinAmount: number;
  revenueSource: CreatorFeeRevenueSourceId;
  totalCoin: number;
  authorCoin: number;
  platformCoin: number;
  authorPercent: number;
  platformPercent: number;
  defaultAuthorPercent: number;
  defaultPlatformPercent: number;
  authorDeltaCoin: number;
  platformDeltaCoin: number;
  appliedPolicyType: "default" | "custom";
  policyName: string | null;
};

export type CreatorFeePolicyAuditEntry = {
  id: string;
  action: string;
  actorUserId: string | null;
  actorLabel: string | null;
  targetCreatorUserId: string | null;
  policyId: string | null;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
};
