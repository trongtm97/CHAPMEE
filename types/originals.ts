export type StoryOriginalStatus =
  | "none"
  | "candidate"
  | "under_review"
  | "original"
  | "declined"
  | "ended";

export type IpDealType =
  | "exclusive"
  | "non_exclusive"
  | "option"
  | "licensing"
  | "co_production";

export type IpDealStatus =
  | "draft"
  | "negotiating"
  | "signed"
  | "active"
  | "ended"
  | "cancelled";

export type IpFinancialType = "advance" | "cost" | "revenue" | "royalty" | "payment";

export type StoryOriginalsStatusRow = {
  id: string;
  story_id: string;
  creator_user_id: string;
  status: StoryOriginalStatus;
  selected_by: string | null;
  selected_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type IpDealRow = {
  id: string;
  story_id: string;
  creator_user_id: string;
  deal_type: IpDealType;
  rights: Record<string, unknown> | null;
  status: IpDealStatus;
  start_date: string | null;
  end_date: string | null;
  advance_amount_vnd: number | null;
  revenue_share: Record<string, unknown> | null;
  admin_note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type IpDealFinancialRow = {
  id: string;
  deal_id: string;
  type: IpFinancialType;
  amount_vnd: number;
  description: string | null;
  transaction_id: string | null;
  created_at: string;
};
