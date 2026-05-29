export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type RiskEventStatus = "open" | "reviewing" | "resolved" | "ignored";
export type RiskLevel = "normal" | "watch" | "high" | "blocked";

export type RiskEvent = {
  id: string;
  user_id: string | null;
  creator_user_id: string | null;
  transaction_id: string | null;
  story_id: string | null;
  chapter_id: string | null;
  event_type: string;
  severity: RiskSeverity;
  risk_score: number;
  status: RiskEventStatus;
  reason: string;
  metadata: Record<string, unknown> | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRiskProfile = {
  id: string;
  user_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  payout_blocked: boolean;
  monetization_blocked: boolean;
  last_risk_event_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};
