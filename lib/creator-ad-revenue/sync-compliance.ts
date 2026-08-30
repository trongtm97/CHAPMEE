import { createAdminClient } from "@/lib/data/admin";
import { getFinanceIdentityStatus } from "@/lib/finance/get-finance-identity-status";
import type {
  CreatorAdKycStatus,
  CreatorAdPayoutStatus,
  CreatorAdTaxStatus
} from "@/types/creator-ad-revenue-policy";

export async function resolveLiveComplianceStatuses(userId: string): Promise<{
  kyc_status: CreatorAdKycStatus;
  tax_status: CreatorAdTaxStatus;
  payout_status: CreatorAdPayoutStatus;
}> {
  const db = createAdminClient();
  const [identity, payoutResult] = await Promise.all([
    getFinanceIdentityStatus(userId),
    db
      .from("creator_payout_accounts")
      .select("verification_status, is_default")
      .eq("creator_user_id", userId)
  ]);

  let kyc_status: CreatorAdKycStatus = "not_started";
  if (identity.status === "verified") kyc_status = "verified";
  else if (identity.status === "pending") kyc_status = "pending";
  else if (identity.status === "rejected") kyc_status = "rejected";

  const accounts = payoutResult.data ?? [];
  const verifiedAccount = accounts.find(
    (a) => a.verification_status === "verified" && a.is_default
  );
  const pendingAccount = accounts.find((a) => a.verification_status === "pending");
  const rejectedAccount = accounts.find((a) => a.verification_status === "rejected");

  let payout_status: CreatorAdPayoutStatus = "not_setup";
  if (verifiedAccount) payout_status = "verified";
  else if (pendingAccount) payout_status = "pending";
  else if (rejectedAccount) payout_status = "blocked";
  else if (accounts.length > 0) payout_status = "pending";

  const { data: profileRow } = await db
    .from("creator_ad_monetization_profiles")
    .select("tax_status")
    .eq("user_id", userId)
    .maybeSingle();

  const storedTax = profileRow?.tax_status as CreatorAdTaxStatus | undefined;
  const tax_status: CreatorAdTaxStatus = storedTax ?? "not_submitted";

  return { kyc_status, tax_status, payout_status };
}

export async function syncCreatorAdProfileCompliance(userId: string): Promise<void> {
  const db = createAdminClient();
  const { data: existing } = await db
    .from("creator_ad_monetization_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) return;

  const live = await resolveLiveComplianceStatuses(userId);
  await db
    .from("creator_ad_monetization_profiles")
    .update({
      kyc_status: live.kyc_status,
      payout_status: live.payout_status
    })
    .eq("user_id", userId);
}
