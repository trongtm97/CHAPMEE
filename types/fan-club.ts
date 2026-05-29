export type FanClubPlan = {
  id: string;
  creator_user_id: string;
  story_id: string | null;
  name: string;
  description: string | null;
  coin_price: number;
  duration_days: number;
  benefits: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FanClubMembershipStatus = "active" | "expired" | "cancelled";

export type FanClubMembership = {
  id: string;
  user_id: string;
  creator_user_id: string;
  story_id: string | null;
  plan_id: string;
  status: FanClubMembershipStatus;
  started_at: string | null;
  expires_at: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
  plan?: FanClubPlan | null;
};
