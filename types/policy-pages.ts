export const POLICY_TYPES = [
  "account",
  "content",
  "creator",
  "monetization",
  "community",
  "privacy",
  "advertising"
] as const;

export type PolicyType = (typeof POLICY_TYPES)[number];

export const POLICY_STATUSES = ["draft", "published", "archived"] as const;

export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const POLICY_VISIBILITIES = ["public", "internal"] as const;

export type PolicyVisibility = (typeof POLICY_VISIBILITIES)[number];

export type PolicyPage = {
  id: string;
  public_code: string | null;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  policy_type: PolicyType;
  status: PolicyStatus;
  visibility: PolicyVisibility;
  version: number;
  is_required: boolean;
  effective_date: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_indexable: boolean;
  canonical_path: string | null;
  created_by: string | null;
  updated_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PolicyVersion = {
  id: string;
  policy_id: string;
  version: number;
  title: string;
  summary: string | null;
  content: string;
  change_note: string | null;
  created_by: string | null;
  created_at: string;
};

export type CreatePolicyPageInput = {
  title: string;
  slug: string;
  summary?: string | null;
  content?: string;
  policy_type: PolicyType;
  status?: PolicyStatus;
  visibility?: PolicyVisibility;
  is_required?: boolean;
  effective_date?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_indexable?: boolean;
  /** Public URL path, e.g. /legal/terms or /about */
  canonical_path?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type UpdatePolicyPageInput = Partial<CreatePolicyPageInput> & {
  change_note?: string | null;
};

export type SitePageGroupFilter = "all" | "legal" | "info" | "legacy";

export type ListPolicyPagesOptions = {
  status?: PolicyStatus | PolicyStatus[] | "all";
  policyType?: PolicyType | "all";
  siteGroup?: SitePageGroupFilter;
  search?: string;
  publicOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type PolicyPageStats = {
  total: number;
  published: number;
  draft: number;
  archived: number;
};

export type AdminPolicyCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canViewVersions: boolean;
};

export function buildAdminPolicyCapabilities(permissions: string[]): AdminPolicyCapabilities {
  const has = (code: string) => permissions.includes(code);
  return {
    canView: has("policies.view") || has("admin.dashboard.view") || has("content.post.view"),
    canCreate: has("policies.create") || has("content.post.create"),
    canEdit: has("policies.edit") || has("content.post.update"),
    canPublish: has("policies.publish") || has("content.post.update"),
    canViewVersions: has("policies.version.view") || has("policies.view")
  };
}

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  account: "Tài khoản",
  content: "Nội dung",
  creator: "Tác giả",
  monetization: "Kiếm tiền",
  community: "Cộng đồng",
  privacy: "Quyền riêng tư",
  advertising: "Quảng cáo"
};

export const POLICY_TYPE_GROUPS: Array<{ type: PolicyType; label: string }> = [
  { type: "account", label: "Tài khoản" },
  { type: "privacy", label: "Quyền riêng tư" },
  { type: "content", label: "Nội dung" },
  { type: "creator", label: "Tác giả" },
  { type: "monetization", label: "Kiếm tiền" },
  { type: "community", label: "Cộng đồng" },
  { type: "advertising", label: "Quảng cáo" }
];
