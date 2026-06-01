export const ALGORITHM_SETTING_CATEGORIES = [
  "reels",
  "discover",
  "search",
  "ranking",
  "cold_start",
  "fairness",
  "safety",
  "spam",
  "monetization",
  "system"
] as const;

export type AlgorithmSettingCategory = (typeof ALGORITHM_SETTING_CATEGORIES)[number];

export const ALGORITHM_VALUE_TYPES = [
  "number",
  "boolean",
  "string",
  "json",
  "percentage"
] as const;

export type AlgorithmValueType = (typeof ALGORITHM_VALUE_TYPES)[number];

export type AlgorithmSettingRow = {
  id: string;
  key: string;
  value: unknown;
  value_type: AlgorithmValueType;
  category: AlgorithmSettingCategory;
  label: string;
  description: string | null;
  min_value: number | null;
  max_value: number | null;
  default_value: unknown;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AlgorithmConfig = Record<string, unknown>;

export type AlgorithmControlTabId =
  | "overview"
  | "reels"
  | "discover"
  | "search"
  | "ranking"
  | "cold_start"
  | "fairness"
  | "quality_penalties"
  | "safety_spam"
  | "exposure_audit"
  | "simulation"
  | "audit";

export type AlgorithmHealthStatus = "ok" | "warning" | "critical";

export type AlgorithmHealthCheck = {
  id: string;
  label: string;
  status: AlgorithmHealthStatus;
  message: string;
  tabId?: AlgorithmControlTabId;
};

export type AlgorithmColdStartSummary = {
  activeCount: number;
  qualifiedCount: number;
  failedCount: number;
  schemaMissing?: boolean;
};

export const ALGORITHM_CONTROL_TABS: {
  id: AlgorithmControlTabId;
  label: string;
  shortLabel?: string;
  section: "overview" | "surface" | "fairness" | "ops";
  categories?: AlgorithmSettingCategory[];
  description?: string;
}[] = [
  {
    id: "overview",
    label: "Tổng quan",
    shortLabel: "Tổng quan",
    section: "overview",
    description: "KPI, sức khỏe hệ thống và thay đổi gần đây."
  },
  {
    id: "reels",
    label: "Reels",
    shortLabel: "Reels",
    section: "surface",
    categories: ["reels"],
    description: "Trọng số và cap cho feed Reels."
  },
  {
    id: "discover",
    label: "Khám phá",
    shortLabel: "Khám phá",
    section: "surface",
    categories: ["discover"],
    description: "Trọng số Discover và diversity."
  },
  {
    id: "search",
    label: "Tìm kiếm",
    shortLabel: "Tìm kiếm",
    section: "surface",
    categories: ["search"],
    description: "Ranking tìm kiếm và fairness kết quả."
  },
  {
    id: "ranking",
    label: "Bảng xếp hạng",
    shortLabel: "BXH",
    section: "surface",
    categories: ["ranking"],
    description: "Công thức bảng xếp hạng và penalty."
  },
  {
    id: "cold_start",
    label: "Cold start",
    shortLabel: "Cold start",
    section: "fairness",
    categories: ["cold_start"],
    description: "Boost và quota cho nội dung mới."
  },
  {
    id: "fairness",
    label: "Fairness caps",
    shortLabel: "Fairness",
    section: "fairness",
    categories: ["fairness"],
    description: "Giới hạn exposure và phân phối công bằng."
  },
  {
    id: "quality_penalties",
    label: "Quality penalties",
    shortLabel: "Chất lượng",
    section: "fairness",
    categories: ["safety"],
    description: "Điểm trừ chất lượng nội dung."
  },
  {
    id: "safety_spam",
    label: "An toàn & spam",
    shortLabel: "An toàn",
    section: "fairness",
    categories: ["safety", "spam"],
    description: "Báo cáo, ẩn, spam và moderation."
  },
  {
    id: "exposure_audit",
    label: "Exposure audit",
    shortLabel: "Exposure",
    section: "ops",
    description: "Phân tích exposure và score breakdown."
  },
  {
    id: "simulation",
    label: "Simulation",
    shortLabel: "Mô phỏng",
    section: "ops",
    description: "Chạy thử ranking không ghi exposure."
  },
  {
    id: "audit",
    label: "Audit log",
    shortLabel: "Audit",
    section: "ops",
    description: "Lịch sử thay đổi cấu hình."
  }
];

export type AlgorithmWeightValidation = {
  groupId: string;
  label: string;
  keys: string[];
  sum: number;
  targetSum: number;
  isValid: boolean;
  delta: number;
};

export type AlgorithmSettingAuditRow = {
  id: string;
  setting_key: string;
  old_value: unknown;
  new_value: unknown;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  changer?: {
    username: string | null;
    display_name: string | null;
  } | null;
};

export type AlgorithmControlCenterData = {
  error: string | null;
  version: string;
  activeCount: number;
  totalCount: number;
  lastUpdatedAt: string | null;
  configWarnings: string[];
  weightValidations: AlgorithmWeightValidation[];
  exposureConcentration: {
    topAuthorSharePercent: number | null;
    topStorySharePercent: number | null;
    sampleDays: number;
  } | null;
  coldStartSummary: AlgorithmColdStartSummary | null;
  healthStatus: AlgorithmHealthStatus;
  healthChecks: AlgorithmHealthCheck[];
  overviewKpis: {
    coldStartActive: number | null;
    authorsOverCap: number;
    qualityPenaltyActive: number;
    surfacesActive: number;
    invalidWeightGroups: number;
  };
  settings: AlgorithmSettingRow[];
  auditLogs: AlgorithmSettingAuditRow[];
  canUpdate: boolean;
};

export type AlgorithmDangerousChange = {
  code: string;
  message: string;
  requiresConfirm: true;
};
