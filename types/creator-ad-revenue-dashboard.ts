import type { CreatorAdRevenueEstimate } from "@/types/ad-revenue";
import type { CreatorReconciledAdRevenueMonth } from "@/types/ad-revenue-reconciliation";
import type {
  CreatorAdKycStatus,
  CreatorAdPayoutStatus,
  CreatorAdSharingStatusForStudio,
  CreatorAdTaxStatus
} from "@/types/creator-ad-revenue-policy";

export type CreatorAdComplianceView = {
  kyc_status: CreatorAdKycStatus;
  tax_status: CreatorAdTaxStatus;
  payout_status: CreatorAdPayoutStatus;
};

export type CreatorAdRevenueEstimateMonthView = {
  month: string;
  rendered_impressions: number;
  estimated_gross_revenue_vnd: number;
  creator_pool_estimate_vnd: number;
  reserve_hold_estimate_vnd: number;
  estimated_payable_vnd: number;
};

export type CreatorAdRevenueDashboard = {
  sharing: CreatorAdSharingStatusForStudio;
  compliance: CreatorAdComplianceView;
  policyUpdatedAt: string | null;
  estimate: {
    visible: boolean;
    error: string | null;
    currentMonth: CreatorAdRevenueEstimateMonthView | null;
    settings: CreatorAdRevenueEstimate["settings"] | null;
  };
  history: {
    reconciledMonths: CreatorReconciledAdRevenueMonth[];
    estimateMonthsInHistory: CreatorReconciledAdRevenueMonth[];
    estimatesVisible: boolean;
  };
};
