import { createClient } from "@/lib/supabase/server";
import { getFinanceIdentityStatus } from "@/lib/finance/get-finance-identity-status";
import type { CreatorAdComplianceView } from "@/types/creator-ad-revenue-dashboard";
import type {
  CreatorAdKycStatus,
  CreatorAdPayoutStatus,
  CreatorAdTaxStatus
} from "@/types/creator-ad-revenue-policy";

export async function getCreatorComplianceForStudio(
  userId: string
): Promise<CreatorAdComplianceView> {
  const supabase = await createClient();

  const [identity, payoutResult, profileResult] = await Promise.all([
    getFinanceIdentityStatus(userId),
    supabase
      .from("creator_payout_accounts")
      .select("verification_status, is_default")
      .eq("creator_user_id", userId),
    supabase
      .from("creator_ad_monetization_profiles")
      .select("kyc_status, tax_status, payout_status")
      .eq("user_id", userId)
      .maybeSingle()
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

  let payout_status: CreatorAdPayoutStatus =
    (profileResult.data?.payout_status as CreatorAdPayoutStatus) ?? "not_setup";
  if (verifiedAccount) payout_status = "verified";
  else if (pendingAccount) payout_status = "pending";
  else if (rejectedAccount) payout_status = "blocked";
  else if (accounts.length > 0 && payout_status === "not_setup") payout_status = "pending";

  const tax_status: CreatorAdTaxStatus =
    (profileResult.data?.tax_status as CreatorAdTaxStatus) ?? "not_submitted";

  return { kyc_status, tax_status, payout_status };
}
