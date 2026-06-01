import type { SeoAuditFinding } from "@/lib/seo/audit";
import type { SeoRule } from "@/types/platform-content";

export type AdminSeoCapabilities = {
  canViewRules: boolean;
  canUpdateRules: boolean;
  canViewAudit: boolean;
  canRunAudit: boolean;
};

export function buildAdminSeoCapabilities(permissions: string[]): AdminSeoCapabilities {
  const has = (code: string) => permissions.includes(code);
  const isAdmin = has("admin.dashboard.view");

  return {
    canViewRules: has("seo.rule.view") || isAdmin,
    canUpdateRules: has("seo.rule.update") || isAdmin,
    canViewAudit: has("seo.audit.view") || has("seo.rule.view") || isAdmin,
    canRunAudit: has("seo.audit.view") || isAdmin
  };
}

export type SeoDashboardStats = {
  totalRules: number;
  indexableRules: number;
  noindexRules: number;
  followRules: number;
  nofollowRules: number;
  sitemapIncluded: number;
  sitemapExcluded: number;
  metadataTemplates: number;
  headingIssues: number;
  auditFindings: number;
  criticalFindings: number;
  warningFindings: number;
  sitemapStatus: "ok" | "warning" | "error";
  robotsStatus: "ok" | "warning";
};

export type SeoQuickAlert = {
  id: string;
  label: string;
  count: number;
  tone: "ok" | "warning" | "critical" | "info";
};

export type SeoMetadataTemplate = {
  id: string;
  page_type: string;
  title_template: string | null;
  description_template: string | null;
  og_title_template: string | null;
  og_description_template: string | null;
  twitter_title_template: string | null;
  twitter_description_template: string | null;
  robots_directive: string | null;
  canonical_mode: string;
  is_active: boolean;
  updated_at: string;
};

export type SeoHeadingGovernanceRule = {
  id: string;
  page_type: string;
  route_example: string | null;
  expected_h1: string;
  allowed_h2: string[];
  allowed_h3: string[];
  notes: string | null;
  is_active: boolean;
  status: "ok" | "review" | "warning";
  last_audit: string | null;
  issues: string[];
};

export type SeoChangeLog = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  before_json: Record<string, unknown>;
  after_json: Record<string, unknown>;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
};

export type SeoSitemapChildStats = {
  id: string;
  path: string;
  urlCount: number;
};

export type SeoSitemapStats = {
  url: string;
  lastGenerated: string | null;
  totalUrls: number;
  indexedUrls: number;
  excludedUrls: number;
  errorCount: number;
  breakdown: Record<string, number>;
  childSitemaps: SeoSitemapChildStats[];
};

export type SeoControlCenterData = {
  stats: SeoDashboardStats;
  quickAlerts: SeoQuickAlert[];
  rules: SeoRule[];
  findings: SeoAuditFinding[];
  metadataTemplates: SeoMetadataTemplate[];
  headingRules: SeoHeadingGovernanceRule[];
  changeLogs: SeoChangeLog[];
  sitemapStats: SeoSitemapStats;
  error: string | null;
};

export type SeoDashboardData = SeoControlCenterData;

export type SeoRuleActionResult = {
  ok: boolean;
  message: string | null;
};

export type SeoControlTabId =
  | "overview"
  | "taxonomy"
  | "rules"
  | "metadata"
  | "headings"
  | "sitemap"
  | "robots"
  | "audit"
  | "logs"
  | "urls";

export const SEO_CONTROL_TABS: Array<{ id: SeoControlTabId; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "taxonomy", label: "Taxonomy SEO" },
  { id: "rules", label: "Quy tắc SEO" },
  { id: "metadata", label: "Mẫu metadata" },
  { id: "headings", label: "Kiểm soát heading" },
  { id: "sitemap", label: "Sitemap" },
  { id: "robots", label: "Robots" },
  { id: "audit", label: "Audit SEO" },
  { id: "logs", label: "Nhật ký thay đổi" },
  { id: "urls", label: "URL & Redirects" }
];

export const SEO_PAGE_TYPES = [
  "story",
  "chapter",
  "author",
  "reels",
  "discover",
  "category",
  "ranking",
  "community",
  "content_post",
  "announcement",
  "admin",
  "studio",
  "auth",
  "wallet",
  "messages",
  "notifications",
  "settings",
  "private_user",
  "search",
  "system"
] as const;

export const SEO_CHANGE_ACTION_LABELS: Record<string, string> = {
  update_rule: "Cập nhật quy tắc SEO",
  bulk_update_rules: "Cập nhật hàng loạt quy tắc",
  update_metadata_template: "Cập nhật mẫu metadata",
  reset_metadata_template: "Reset mẫu metadata",
  run_audit: "Chạy audit SEO"
};
