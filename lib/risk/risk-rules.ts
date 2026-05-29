import type { RiskSeverity } from "@/types/risk";

export type RiskRuleDefinition = {
  eventType: string;
  defaultSeverity: RiskSeverity;
  baseScore: number;
  reason: string;
};

export const RISK_RULES: Record<string, RiskRuleDefinition> = {
  daily_tip_amount_exceeded: {
    eventType: "daily_tip_amount_exceeded",
    defaultSeverity: "medium",
    baseScore: 30,
    reason: "Người dùng vượt ngưỡng tip theo ngày."
  },
  repeated_tips_same_creator: {
    eventType: "repeated_tips_same_creator",
    defaultSeverity: "medium",
    baseScore: 35,
    reason: "Tip lặp lại quá dày cho cùng creator."
  },
  self_tip_attempt: {
    eventType: "self_tip_attempt",
    defaultSeverity: "critical",
    baseScore: 95,
    reason: "User cố tự tip cho chính mình."
  },
  high_bonus_coin_spend_to_creator: {
    eventType: "high_bonus_coin_spend_to_creator",
    defaultSeverity: "high",
    baseScore: 70,
    reason: "Dùng bonus coin bất thường để tạo doanh thu creator."
  },
  suspicious_unlock_pattern: {
    eventType: "suspicious_unlock_pattern",
    defaultSeverity: "medium",
    baseScore: 40,
    reason: "Unlock chapter với tần suất bất thường."
  },
  rapid_coin_spend_after_reward_ads: {
    eventType: "rapid_coin_spend_after_reward_ads",
    defaultSeverity: "high",
    baseScore: 65,
    reason: "Chi tiêu coin ngay sau rewarded ads với nhịp bất thường."
  },
  too_many_ad_sessions: {
    eventType: "too_many_ad_sessions",
    defaultSeverity: "medium",
    baseScore: 35,
    reason: "Tạo quá nhiều ad sessions."
  },
  high_failed_ad_sessions: {
    eventType: "high_failed_ad_sessions",
    defaultSeverity: "high",
    baseScore: 60,
    reason: "Tỷ lệ ad session failed/cancelled cao."
  },
  repeated_reward_claims: {
    eventType: "repeated_reward_claims",
    defaultSeverity: "critical",
    baseScore: 90,
    reason: "Có dấu hiệu claim thưởng lặp bất thường."
  },
  daily_reward_limit_attempt: {
    eventType: "daily_reward_limit_attempt",
    defaultSeverity: "medium",
    baseScore: 30,
    reason: "Cố vượt daily rewarded ads limit."
  },
  creator_revenue_spike_abnormal: {
    eventType: "creator_revenue_spike_abnormal",
    defaultSeverity: "high",
    baseScore: 70,
    reason: "Doanh thu creator tăng đột biến."
  },
  payout_blocked_by_risk: {
    eventType: "payout_blocked_by_risk",
    defaultSeverity: "high",
    baseScore: 75,
    reason: "Payout bị chặn do risk profile hoặc open risk events."
  },
  transaction_flagged: {
    eventType: "transaction_flagged",
    defaultSeverity: "medium",
    baseScore: 40,
    reason: "Giao dịch bị đánh cờ rủi ro."
  }
};

export function getRiskRule(eventType: string): RiskRuleDefinition {
  return (
    RISK_RULES[eventType] ?? {
      eventType,
      defaultSeverity: "low",
      baseScore: 10,
      reason: "Risk event custom."
    }
  );
}
