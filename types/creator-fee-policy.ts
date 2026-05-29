export type CreatorFeePolicyStatus =
  | "draft"
  | "active"
  | "scheduled"
  | "expired"
  | "disabled";

export type CreatorFeePolicySource = "default_config" | "creator_override";

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
  note: string | null;
  public_note: string | null;
  show_details_to_creator: boolean;
  status: CreatorFeePolicyStatus;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  note?: string | null;
  publicNote?: string | null;
  showDetailsToCreator?: boolean;
  status?: CreatorFeePolicyStatus;
  startsAt?: string;
  endsAt?: string | null;
};

export type ResolvedCreatorFeePolicy = {
  source: CreatorFeePolicySource;
  policyId: string | null;
  policyName: string | null;
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
};

export type CreatorFeePolicySnapshot = {
  policy_source: CreatorFeePolicySource;
  policy_id: string | null;
  policy_name: string | null;
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
};
