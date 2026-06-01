import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";
import type { StudioMonetizationPageData } from "@/types/studio-monetization";

export type StudioMonetizationTab =
  | "overview"
  | "paid-stories"
  | "ad-revenue"
  | "payout"
  | "transactions"
  | "policy";

export const STUDIO_MONETIZATION_TABS: Array<{
  id: StudioMonetizationTab;
  label: string;
}> = [
  { id: "overview", label: "Tổng quan" },
  { id: "paid-stories", label: "Truyện trả phí" },
  { id: "ad-revenue", label: "Doanh thu quảng cáo" },
  { id: "payout", label: "Rút tiền" },
  { id: "transactions", label: "Giao dịch" },
  { id: "policy", label: "Chính sách" }
];

export type EligibilityCheckStatus = "ok" | "missing" | "warning" | "locked";

export type MonetizationEligibilityItem = {
  id: string;
  label: string;
  description?: string;
  status: EligibilityCheckStatus;
  href?: string;
  ctaLabel?: string;
};

export type MonetizationProgramBadge = {
  label: string;
  tone: "slate" | "amber" | "green" | "rose" | "cyan";
  description?: string;
};

export type MonetizationHeaderCta = {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  title?: string;
};

export type StudioAdRevenueSummaryView = {
  programEnabled: boolean;
  betaMode: boolean;
  adsRevenueEnabled: boolean;
  participationLabel: string;
  estimatedCurrentMonthVnd: number | null;
  finalizedTotalVnd: number;
  reserveHoldTotalVnd: number;
  payableTotalVnd: number;
  estimatesVisible: boolean;
};

export type StudioTransactionFilter =
  | "all"
  | "paid_chapter"
  | "full_story_purchase"
  | "tip"
  | "ad_estimated"
  | "ad_finalized"
  | "reserve_hold"
  | "reserve_release"
  | "adjustment"
  | "payout"
  | "refund"
  | "chargeback";

export type StudioMonetizationDashboardProps = {
  data: StudioMonetizationPageData;
  adDashboard: CreatorAdRevenueDashboard;
};

export type StudioMonetizationTransactionsPage = {
  rows: import("@/types/studio-monetization").StudioMonetizationRecentTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
};
