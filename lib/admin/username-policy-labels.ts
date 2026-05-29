import type {
  UsernamePolicyEnforcementLevel,
  UsernamePolicyMatchType,
  UsernamePolicyRuleType,
  UsernamePolicyScope
} from "@/types/username-policy";

export const RULE_TYPE_LABELS: Record<UsernamePolicyRuleType, string> = {
  banned_username: "Username bị cấm",
  reserved_username: "Username giữ chỗ",
  protected_word: "Từ được bảo vệ",
  banned_display_name_word: "Từ bảo vệ trong tên hiển thị",
  display_name_protected_word: "Từ bảo vệ trong tên hiển thị",
  impersonation_risk: "Nguy cơ mạo danh",
  brand_reserved: "Thương hiệu giữ chỗ",
  official_only: "Chỉ tài khoản chính thức được dùng",
  system_reserved: "Từ hệ thống"
};

export const MATCH_TYPE_LABELS: Record<UsernamePolicyMatchType, string> = {
  exact: "Khớp chính xác",
  contains: "Có chứa",
  starts_with: "Bắt đầu bằng",
  ends_with: "Kết thúc bằng",
  regex: "Regex"
};

export const SCOPE_LABELS: Record<UsernamePolicyScope, string> = {
  username: "Username",
  display_name: "Tên hiển thị",
  both: "Cả hai"
};

export const ENFORCEMENT_LABELS: Record<UsernamePolicyEnforcementLevel, string> = {
  block: "Chặn cứng",
  require_review: "Cần admin duyệt",
  warn_only: "Chỉ cảnh báo"
};

export function ruleTypeLabel(type: UsernamePolicyRuleType) {
  return RULE_TYPE_LABELS[type] ?? type;
}

export function matchTypeLabel(type: UsernamePolicyMatchType) {
  return MATCH_TYPE_LABELS[type] ?? type;
}

export function scopeLabel(scope: UsernamePolicyScope) {
  return SCOPE_LABELS[scope] ?? scope;
}

export function enforcementLabel(level: UsernamePolicyEnforcementLevel) {
  return ENFORCEMENT_LABELS[level] ?? level;
}

export const BANNED_RULE_TYPES: UsernamePolicyRuleType[] = [
  "banned_username",
  "banned_display_name_word",
  "impersonation_risk",
  "system_reserved"
];

export const RESERVED_RULE_TYPES: UsernamePolicyRuleType[] = [
  "reserved_username",
  "brand_reserved"
];

export const PROTECTED_RULE_TYPES: UsernamePolicyRuleType[] = [
  "protected_word",
  "display_name_protected_word",
  "banned_display_name_word",
  "official_only"
];
