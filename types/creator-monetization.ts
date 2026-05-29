export type CreatorMonetizationStatus =
  | "not_eligible"
  | "eligible"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended"
  | "permanently_disabled";

export type CreatorKycStatus = "not_started" | "pending" | "verified" | "rejected";

export type CreatorMonetizationProfile = {
  id: string;
  user_id: string;
  status: CreatorMonetizationStatus;
  monetization_enabled: boolean;
  terms_accepted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  suspended_reason: string | null;
  kyc_status: CreatorKycStatus;
  payout_enabled: boolean;
  tips_accepted: boolean;
  tip_thank_you_message: string | null;
  custom_revenue_share: Record<string, number> | null;
  created_at: string;
  updated_at: string;
};

export type CreatorEligibilityResult = {
  eligible: boolean;
  reasons: string[];
  stats: {
    followers: number;
    total_reads: number;
    chapters_count: number;
    violations_count: number;
    account_age_days: number;
  };
};
