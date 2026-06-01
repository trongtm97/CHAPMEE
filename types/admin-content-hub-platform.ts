export type ContentHubPlatformTabId = "campaigns" | "seo";

export const CONTENT_HUB_PLATFORM_TABS: Array<{
  id: ContentHubPlatformTabId;
  label: string;
  description: string;
}> = [
  {
    id: "campaigns",
    label: "Chiến dịch thông báo",
    description: "Gửi thông báo có chọn đối tượng, lịch gửi và kiểm soát an toàn."
  },
  {
    id: "seo",
    label: "Quản trị SEO",
    description: "Kiểm soát index, heading, canonical, robots và metadata."
  }
];

export type SeoGovernanceSubTabId =
  | "overview"
  | "taxonomy"
  | "routes"
  | "headings"
  | "metadata"
  | "robots"
  | "audit";

export const SEO_GOVERNANCE_SUB_TABS: Array<{ id: SeoGovernanceSubTabId; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "taxonomy", label: "Taxonomy SEO" },
  { id: "routes", label: "Route rules" },
  { id: "headings", label: "Heading rules" },
  { id: "metadata", label: "Metadata templates" },
  { id: "robots", label: "Robots & sitemap" },
  { id: "audit", label: "Audit logs" }
];
