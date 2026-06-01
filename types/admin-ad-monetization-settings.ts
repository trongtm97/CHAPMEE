import type { CreatorAdPolicyAuditLog } from "@/types/creator-ad-revenue-policy";
import type { CreatorAdRevenuePolicy } from "@/types/creator-ad-revenue-policy";
import type { AdRevenueEstimateSettings } from "@/types/ad-revenue";

export type AdMonetizationOverview = {
  policy: CreatorAdRevenuePolicy;
  estimateSettings: AdRevenueEstimateSettings;
  adsPlacementsEnabled: number;
  adsPlacementsTotal: number;
  currentMonthKey: string;
  currentMonthEstimateGrossVnd: number;
  lastReconciledMonth: string | null;
  openFraudSignals: number;
  draftReconciliations: number;
};

export type AdMonetizationHubSaveInput = {
  creator_pool_percent?: number;
  reserve_percent?: number;
  reserve_hold_days?: number;
  min_payout_vnd?: number;
  beta_mode?: boolean;
  is_estimate_visible_to_creators?: boolean;
  reason?: string;
};

export type AdMonetizationHubSaveResult = {
  ok: boolean;
  message: string | null;
  overview: AdMonetizationOverview | null;
};

export type { CreatorAdPolicyAuditLog };
