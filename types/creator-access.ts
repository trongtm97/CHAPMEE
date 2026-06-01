export type CreatorAccessSource = "default_enabled" | "admin_override";

export type CreatorAccessOverrideRow = {
  id: string;
  user_id: string;
  monetization_disabled: boolean;
  monetization_disabled_reason: string | null;
  monetization_disabled_by: string | null;
  monetization_disabled_at: string | null;
  withdrawal_disabled: boolean;
  withdrawal_disabled_reason: string | null;
  withdrawal_disabled_by: string | null;
  withdrawal_disabled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatorAccessStatus = {
  monetizationEnabled: boolean;
  withdrawalEnabled: boolean;
  monetizationDisabledReason: string | null;
  withdrawalDisabledReason: string | null;
  source: CreatorAccessSource;
  canRequestWithdrawal: boolean;
  withdrawalBlockReason: string | null;
  override: CreatorAccessOverrideRow | null;
};
