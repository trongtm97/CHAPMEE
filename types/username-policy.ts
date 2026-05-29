export const USERNAME_POLICY_RULE_TYPES = [
  "banned_username",
  "reserved_username",
  "protected_word",
  "banned_display_name_word",
  "display_name_protected_word",
  "impersonation_risk",
  "brand_reserved",
  "official_only",
  "system_reserved"
] as const;

export type UsernamePolicyRuleType = (typeof USERNAME_POLICY_RULE_TYPES)[number];

export const USERNAME_POLICY_MATCH_TYPES = [
  "exact",
  "contains",
  "starts_with",
  "ends_with",
  "regex"
] as const;

export type UsernamePolicyMatchType = (typeof USERNAME_POLICY_MATCH_TYPES)[number];

export const USERNAME_POLICY_SCOPES = ["username", "display_name", "both"] as const;

export type UsernamePolicyScope = (typeof USERNAME_POLICY_SCOPES)[number];

export const USERNAME_POLICY_ENFORCEMENT_LEVELS = [
  "block",
  "require_review",
  "warn_only"
] as const;

export type UsernamePolicyEnforcementLevel =
  (typeof USERNAME_POLICY_ENFORCEMENT_LEVELS)[number];

export type UsernamePolicyRuleRow = {
  id: string;
  rule_type: UsernamePolicyRuleType;
  value: string;
  normalized_value: string;
  match_type: UsernamePolicyMatchType;
  scope: UsernamePolicyScope;
  enforcement_level: UsernamePolicyEnforcementLevel;
  is_active: boolean;
  allowed_user_ids: string[] | null;
  note: string | null;
  reason: string | null;
  priority: number;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type UsernamePolicyValidationErrorCode =
  | "required"
  | "format"
  | "taken"
  | "reserved"
  | "banned"
  | "protected_word"
  | "requires_review"
  | "url_not_allowed"
  | "junk_name";

export type UsernamePolicyValidationResult = {
  valid: boolean;
  error_code: UsernamePolicyValidationErrorCode | null;
  message: string | null;
  normalized: string | null;
};

export type UsernameChangeHistoryRow = {
  id: string;
  user_id: string;
  old_username: string | null;
  new_username: string;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
    username: string | null;
  } | null;
  changer?: {
    display_name: string | null;
    username: string | null;
  } | null;
};

export type UsernamePolicyAdminTab =
  | "overview"
  | "rules"
  | "banned"
  | "reserved"
  | "protected"
  | "exceptions"
  | "conflicts"
  | "history"
  | "audit";

export type UsernamePolicySummaryCardKey =
  | "banned"
  | "reserved"
  | "protected"
  | "exceptions"
  | "conflicts"
  | "changes7d"
  | "inactive";

export type UsernamePolicyOperationsSummary = Record<UsernamePolicySummaryCardKey, number>;

export type UsernamePolicyConflictItem = {
  userId: string;
  username: string | null;
  displayName: string | null;
  ruleId: string;
  ruleType: UsernamePolicyRuleType;
  ruleValue: string;
  enforcementLevel: UsernamePolicyEnforcementLevel;
  field: "username" | "display_name";
  hasException: boolean;
};

export type UsernamePolicyAuditLogRow = {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: {
    display_name: string | null;
    username: string | null;
  } | null;
};

export type UsernamePolicyCheckHit = {
  ruleId: string;
  ruleType: UsernamePolicyRuleType;
  ruleValue: string;
  matchType: UsernamePolicyMatchType;
  scope: UsernamePolicyScope;
  enforcementLevel: UsernamePolicyEnforcementLevel;
  field: "username" | "display_name";
  hasException: boolean;
};

export type UsernamePolicyCheckResult = {
  username: {
    valid: boolean;
    message: string | null;
    normalized: string | null;
    isTaken: boolean;
  };
  displayName: {
    valid: boolean;
    message: string | null;
  };
  hits: UsernamePolicyCheckHit[];
  needsReview: boolean;
  suggestions: string[];
};

export type UsernamePolicyImportPreviewLine = {
  line: number;
  value: string;
  normalized: string;
  valid: boolean;
  error: string | null;
  duplicate: boolean;
};

export type UsernamePolicyImportPreview = {
  lines: UsernamePolicyImportPreviewLine[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
};

export type UsernamePolicyAdminCapabilities = {
  canView: boolean;
  canManageRules: boolean;
  canImport: boolean;
  canAssignUsername: boolean;
  canManageExceptions: boolean;
  canViewSensitiveNotes: boolean;
  canViewAudit: boolean;
};

export type UsernamePolicyExceptionRow = {
  id: string;
  rule_id: string;
  user_id: string;
  exception_scope: UsernamePolicyScope;
  expires_at: string | null;
  reason: string | null;
  public_note: string | null;
  created_by: string | null;
  revoked_at: string | null;
  created_at: string;
  rule?: Pick<UsernamePolicyRuleRow, "id" | "value" | "rule_type"> | null;
  user?: {
    username: string | null;
    display_name: string | null;
  } | null;
};

export type UsernamePolicyExceptionScope = UsernamePolicyScope;
