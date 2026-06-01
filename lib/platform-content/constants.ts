import type {
  ContentHubAdminCapabilities,
  ContentHubTabId
} from "@/types/admin-platform-content";
import { slugifyVietnameseTitle } from "@/lib/platform-content/slug";

export const CONTENT_HUB_TABS: Array<{ id: ContentHubTabId; label: string }> = [
  { id: "campaigns", label: "Notification campaigns" },
  { id: "seo", label: "SEO governance" }
];

export function buildContentHubCapabilities(
  permissions: string[]
): ContentHubAdminCapabilities {
  const has = (code: string) => permissions.includes(code);

  return {
    canViewPosts: has("content.post.view") || has("admin.dashboard.view"),
    canCreatePosts: has("content.post.create") || has("admin.dashboard.view"),
    canUpdatePosts: has("content.post.update") || has("admin.dashboard.view"),
    canViewAnnouncements:
      has("platform.announcement.view") || has("admin.dashboard.view"),
    canCreateAnnouncements:
      has("platform.announcement.create") || has("admin.dashboard.view"),
    canUpdateAnnouncements:
      has("platform.announcement.update") || has("admin.dashboard.view"),
    canViewCampaigns:
      has("notification.campaign.view") || has("admin.dashboard.view"),
    canCreateCampaigns:
      has("notification.campaign.create") || has("admin.dashboard.view"),
    canUpdateCampaigns:
      has("notification.campaign.update") || has("admin.dashboard.view"),
    canViewSeo: has("seo.rule.view") || has("admin.dashboard.view"),
    canUpdateSeo: has("seo.rule.update") || has("admin.dashboard.view"),
    canViewSeoAudit: has("seo.audit.view") || has("admin.dashboard.view")
  };
}

export function slugifyContentTitle(title: string) {
  return slugifyVietnameseTitle(title);
}

export { slugifyVietnameseTitle } from "@/lib/platform-content/slug";
