export type FinanceExportType =
  | "transactions"
  | "coin_purchases"
  | "creator_revenue"
  | "payouts"
  | "refunds"
  | "chargebacks"
  | "supporter_transactions"
  | "vip_subscriptions"
  | "fan_club_memberships"
  | "sponsored_campaign_revenue";

export type FinanceExportFilters = {
  from?: string;
  to?: string;
  type?: string;
  status?: string;
  userId?: string;
  creatorUserId?: string;
  source?: string;
  currency?: string;
};
