import { buildCreatorAdEligibilityChecklist, getCreatorAdStatusPresentation } from "@/lib/creator-ad-revenue/eligibility";
import { getCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy";
import { getCreatorAdMonetizationProfile } from "@/lib/creator-ad-revenue/profiles";
import type { CreatorAdSharingStatusForStudio } from "@/types/creator-ad-revenue-policy";

export async function getCreatorAdSharingStatusForStudio(
  userId: string
): Promise<CreatorAdSharingStatusForStudio> {
  const policy = await getCreatorAdRevenuePolicy();
  const profile = await getCreatorAdMonetizationProfile(userId, { syncCompliance: true });

  const { checklist, allRequirementsMet } = await buildCreatorAdEligibilityChecklist({
    userId,
    policy,
    profile
  });

  const { statusMessage, statusTone } = getCreatorAdStatusPresentation(
    profile,
    policy.is_enabled
  );

  return {
    programEnabled: policy.is_enabled,
    betaMode: policy.beta_mode,
    participationStatus: profile?.status ?? "not_enabled",
    adsRevenueEnabled: Boolean(profile?.ads_revenue_enabled),
    policy: {
      creator_pool_percent: policy.creator_pool_percent,
      reserve_percent: policy.reserve_percent,
      reserve_hold_days: policy.reserve_hold_days,
      min_payout_vnd: policy.min_payout_vnd,
      payout_cycle: policy.payout_cycle
    },
    policyText: policy.policy_text ?? "",
    checklist,
    allRequirementsMet,
    statusMessage,
    statusTone
  };
}
