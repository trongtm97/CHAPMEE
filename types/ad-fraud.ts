export type AdFraudSeverity = "info" | "warning" | "high" | "critical";

export type AdFraudRuleAction = "flag" | "hold_creator" | "hold_story" | "disable_ads";

export type AdFraudSignalStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type AdFraudRule = {
  id: string;
  rule_key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  severity: AdFraudSeverity;
  threshold_config: Record<string, unknown>;
  action: AdFraudRuleAction;
  created_at: string;
  updated_at: string;
};

export type AdFraudRuleInput = Partial<
  Pick<AdFraudRule, "is_enabled" | "severity" | "threshold_config" | "action" | "description">
>;

export type AdFraudSignal = {
  id: string;
  rule_key: string;
  severity: AdFraudSeverity;
  author_id: string | null;
  story_id: string | null;
  chapter_id: string | null;
  month: string | null;
  event_date: string | null;
  signal_data: Record<string, unknown>;
  status: AdFraudSignalStatus;
  admin_note: string | null;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
};

export type AdFraudSignalListItem = AdFraudSignal & {
  author_username: string | null;
  author_display_name: string | null;
  story_title: string | null;
  rule_name: string | null;
};

export type AdFraudDashboard = {
  openSignals: number;
  criticalSignals: number;
  heldCreators: number;
  heldAmountEstimateVnd: number;
};

export const AD_FRAUD_SIGNAL_STATUS_LABELS: Record<AdFraudSignalStatus, string> = {
  open: "Mở",
  reviewing: "Đang xem xét",
  resolved: "Đã xử lý",
  dismissed: "Đã bỏ qua"
};

export const AD_FRAUD_SEVERITY_LABELS: Record<AdFraudSeverity, string> = {
  info: "Thông tin",
  warning: "Cảnh báo",
  high: "Cao",
  critical: "Nghiêm trọng"
};
