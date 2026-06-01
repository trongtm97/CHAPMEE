export type TaxonomyQualityFlagType =
  | "missing_required"
  | "too_many_tags"
  | "hot_tag_abuse"
  | "conflicting_taxonomy"
  | "missing_warning"
  | "user_reported_wrong_tag"
  | "import_error"
  | "taxonomy_behavior_mismatch"
  | "admin_manual";

export type TaxonomyQualitySeverity = "low" | "medium" | "high" | "critical";

export type TaxonomyQualityFlagStatus =
  | "open"
  | "reviewing"
  | "resolved"
  | "dismissed"
  | "sent_to_creator";

export type TaxonomyQualityDetectedBy = "system" | "admin" | "user_report" | "import";

export type TaxonomyQualityAdminTab =
  | "overview"
  | "stories"
  | "hot_tags"
  | "missing_warnings"
  | "import_errors"
  | "revision_requests"
  | "rules";

export type TaxonomyQualityFlagRow = {
  id: string;
  storyId: string;
  storyTitle: string;
  storySlug: string;
  authorId: string;
  authorName: string;
  mainGenre: string | null;
  tagCount: number;
  ageRating: string | null;
  warningStatus: string;
  flagType: TaxonomyQualityFlagType;
  severity: TaxonomyQualitySeverity;
  status: TaxonomyQualityFlagStatus;
  reason: string;
  details: Record<string, unknown>;
  detectedBy: TaxonomyQualityDetectedBy;
  userReportCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TaxonomyQualityRuleRow = {
  id: string;
  ruleKey: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  severity: TaxonomyQualitySeverity;
  config: Record<string, unknown>;
  updatedAt: string;
};

export type CreatorTaxonomyRevisionRequestRow = {
  id: string;
  storyId: string;
  storyTitle: string;
  storySlug: string;
  creatorId: string;
  reason: string;
  requiredChanges: Record<string, unknown>;
  status: "open" | "creator_submitted" | "approved" | "rejected" | "cancelled";
  dueAt: string | null;
  creatorNote: string | null;
  creatorSubmittedAt: string | null;
  createdAt: string;
};

export type TaxonomyQualitySummary = {
  missingRequired: number;
  wrongGenre: number;
  tagAbuse: number;
  missingWarning: number;
  userReported: number;
  abnormalUsage: number;
  openRevisionRequests: number;
};

export type TaxonomyQualityFilterOptions = {
  mainGenres: Array<{ slug: string; name: string }>;
  recentImportJobs: Array<{ id: string; label: string }>;
};

export type TaxonomyQualityPageData = {
  summary: TaxonomyQualitySummary;
  flags: TaxonomyQualityFlagRow[];
  flagsTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
  rules: TaxonomyQualityRuleRow[];
  revisionRequests: CreatorTaxonomyRevisionRequestRow[];
  revisionRequestsTotal: number;
  hotTagAbuse: Array<{
    termId: string;
    termName: string;
    termSlug: string;
    storyCount: number;
    featured: boolean;
    reportCount: number;
  }>;
  filterOptions: TaxonomyQualityFilterOptions;
  error: string | null;
};

export type TaxonomyQualityFlagFilters = {
  tab?: TaxonomyQualityAdminTab;
  flagType?: TaxonomyQualityFlagType | "all";
  severity?: TaxonomyQualitySeverity | "all";
  status?: TaxonomyQualityFlagStatus | "all";
  mainGenre?: string;
  author?: string;
  importJobId?: string;
  hasUserReports?: boolean;
  page?: number;
  pageSize?: number;
};
