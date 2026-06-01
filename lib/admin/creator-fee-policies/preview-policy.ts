"use server";

import {
  getSourceRate,
  mapCreatorFeePolicyRow
} from "@/lib/admin/creator-fee-policy-shared";
import { requireCreatorFeeViewAccess } from "@/lib/auth/creator-fee-guards";
import {
  buildDefaultSourceRates,
  resolveCreatorFeePolicyForSource
} from "@/lib/finance/resolve-creator-fee-policy";
import { createClient } from "@/lib/supabase/server";
import type { CreatorFeePolicyKpiSummary } from "@/types/admin-creator-fee-policy";
import type { CreatorFeeRevenueSourceId } from "@/types/creator-fee-policy";

const EXPIRING_DAYS = 30;

export async function getCreatorFeePolicyStatsAction(): Promise<{
  data: CreatorFeePolicyKpiSummary;
  error: string | null;
}> {
  const guard = await requireCreatorFeeViewAccess();
  if (!guard.ok) {
    return {
      data: {
        activeCount: 0,
        expiringSoonCount: 0,
        customRateCreatorCount: 0,
        originalsCount: 0,
        pausedCount: 0,
        customPolicyTxToday: 0
      },
      error: guard.error
    };
  }

  const supabase = await createClient();
  const now = new Date();
  const expiringBefore = new Date(now.getTime() + EXPIRING_DAYS * 86400000).toISOString();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: activeCount },
    { count: expiringSoonCount },
    { count: customRateCreatorCount },
    { count: originalsCount },
    { count: pausedCount },
    { count: customPolicyTxToday }
  ] = await Promise.all([
    supabase
      .from("creator_fee_policies")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("creator_fee_policies")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .not("ends_at", "is", null)
      .lte("ends_at", expiringBefore)
      .gte("ends_at", now.toISOString()),
    supabase
      .from("creator_fee_policies")
      .select("creator_id", { count: "exact", head: true })
      .in("status", ["active", "scheduled", "paused"]),
    supabase
      .from("creator_fee_policies")
      .select("id", { count: "exact", head: true })
      .in("creator_type", ["originals", "strategic_partner"])
      .in("status", ["active", "scheduled"]),
    supabase
      .from("creator_fee_policies")
      .select("id", { count: "exact", head: true })
      .in("status", ["paused", "disabled"]),
    supabase
      .from("creator_earning_transactions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString())
      .filter("calculation_snapshot->>applied_policy_type", "eq", "custom")
  ]);

  return {
    data: {
      activeCount: activeCount ?? 0,
      expiringSoonCount: expiringSoonCount ?? 0,
      customRateCreatorCount: customRateCreatorCount ?? 0,
      originalsCount: originalsCount ?? 0,
      pausedCount: pausedCount ?? 0,
      customPolicyTxToday: customPolicyTxToday ?? 0
    },
    error: null
  };
}

export async function previewCreatorFeePolicyAction(input: {
  creatorId: string;
  revenueSource: CreatorFeeRevenueSourceId;
  coinAmount: number;
  sourceRates?: import("@/types/creator-fee-policy").CreatorFeeSourceRates | null;
  policyId?: string | null;
}) {
  const guard = await requireCreatorFeeViewAccess();
  if (!guard.ok) {
    return { preview: null, error: guard.error };
  }

  if (!Number.isFinite(input.coinAmount) || input.coinAmount <= 0) {
    return { preview: null, error: "Số coin phải lớn hơn 0." };
  }

  const defaultRates = await buildDefaultSourceRates();
  const defaultRate = defaultRates[input.revenueSource] ?? {
    author_percent: 70,
    platform_percent: 30
  };

  let resolved = await resolveCreatorFeePolicyForSource({
    creatorId: input.creatorId,
    revenueSource: input.revenueSource
  });

  if (input.sourceRates?.[input.revenueSource]) {
    const custom = input.sourceRates[input.revenueSource]!;
    resolved = {
      ...resolved,
      source: "creator_override",
      creatorRevenueSharePercent: custom.author_percent,
      platformFeePercent: custom.platform_percent,
      appliedPolicyType: "custom"
    };
  } else if (input.policyId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("creator_fee_policies")
      .select("*")
      .eq("id", input.policyId)
      .maybeSingle();
    if (data) {
      const policy = mapCreatorFeePolicyRow(data as Record<string, unknown>);
      const rate = getSourceRate(policy, input.revenueSource);
      if (rate) {
        resolved = {
          ...resolved,
          source: "creator_override",
          policyId: policy.id,
          policyName: policy.policy_name,
          creatorRevenueSharePercent: rate.author_percent,
          platformFeePercent: rate.platform_percent,
          appliedPolicyType: "custom",
          policyEffectiveFrom: policy.starts_at
        };
      }
    }
  }

  const authorCoin = Math.round(
    (input.coinAmount * resolved.creatorRevenueSharePercent) / 100
  );
  const platformCoin = input.coinAmount - authorCoin;
  const defaultAuthorCoin = Math.round(
    (input.coinAmount * defaultRate.author_percent) / 100
  );

  return {
    preview: {
      coinAmount: input.coinAmount,
      revenueSource: input.revenueSource,
      totalCoin: input.coinAmount,
      authorCoin,
      platformCoin,
      authorPercent: resolved.creatorRevenueSharePercent,
      platformPercent: resolved.platformFeePercent,
      defaultAuthorPercent: defaultRate.author_percent,
      defaultPlatformPercent: defaultRate.platform_percent,
      authorDeltaCoin: authorCoin - defaultAuthorCoin,
      platformDeltaCoin: platformCoin - (input.coinAmount - defaultAuthorCoin),
      appliedPolicyType: resolved.appliedPolicyType,
      policyName: resolved.policyName
    },
    error: null
  };
}
