export type CreatorBonusPoolStatus =
  | "draft"
  | "calculated"
  | "approved"
  | "paid"
  | "cancelled";

export type CreatorBonusAllocationStatus =
  | "pending"
  | "approved"
  | "credited"
  | "rejected";

export type CreatorBonusPool = {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  total_amount_vnd: number;
  status: CreatorBonusPoolStatus;
  rules: Record<string, unknown> | null;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatorBonusAllocation = {
  id: string;
  pool_id: string;
  creator_user_id: string;
  score: number;
  amount_vnd: number;
  status: CreatorBonusAllocationStatus;
  transaction_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};
