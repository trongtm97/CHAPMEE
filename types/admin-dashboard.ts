export type AdminActionQueueItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  priority: "high" | "medium" | "low";
};

export type AdminRiskAlert = {
  id: string;
  label: string;
  description: string;
  href: string;
  severity: "high" | "medium";
};

export type AdminQuickMetric = {
  id: string;
  label: string;
  value: number | null;
  sublabel?: string;
  href?: string;
  unavailable?: boolean;
};

export type AdminShortcutLink = {
  label: string;
  href: string;
  disabled?: boolean;
  disabledReason?: string;
};

export type AdminShortcutGroup = {
  id: string;
  title: string;
  description: string;
  links: AdminShortcutLink[];
};

export type AdminDashboardSummary = {
  actionQueue: AdminActionQueueItem[];
  riskAlerts: AdminRiskAlert[];
  quickMetrics: AdminQuickMetric[];
  shortcutGroups: AdminShortcutGroup[];
  hasActionItems: boolean;
  error: string | null;
};
