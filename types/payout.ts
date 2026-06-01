export type PayoutMethod = "bank_transfer" | "momo" | "zalopay" | "manual";

export type PayoutRequestStatus =
  | "requested"
  | "under_review"
  | "approved"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled"
  | "failed";

export type PayoutVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type CreatorPayoutAccount = {
  id: string;
  creator_user_id: string;
  method: PayoutMethod;
  account_holder_name: string | null;
  bank_name: string | null;
  bank_account_number_masked: string | null;
  bank_branch?: string | null;
  wallet_phone_masked: string | null;
  withdrawal_locked_until?: string | null;
  email_verified_at?: string | null;
  metadata: Record<string, unknown> | null;
  is_default: boolean;
  verification_status: PayoutVerificationStatus;
  created_at: string;
  updated_at: string;
};

export type PayoutRiskLevel = "normal" | "warning" | "high";

export type PayoutRequest = {
  id: string;
  creator_user_id: string;
  amount_vnd: number;
  method: PayoutMethod;
  status: PayoutRequestStatus;
  payout_account_snapshot: Record<string, unknown> | null;
  admin_note: string | null;
  creator_note: string | null;
  reject_reason: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  risk_level: PayoutRiskLevel;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
};
