import type { AuthPermissionContext } from "@/types/auth";
import type { CampaignStaffPermissions } from "@/types/campaign";
import type { PermissionCode } from "@/types/permissions";

export const CAMPAIGN_VIEW_PERMISSIONS: PermissionCode[] = [
  "campaign.view",
  "admin.settings.view",
  "admin.settings.update",
  "finance.dashboard.view"
];

export const CAMPAIGN_CREATE_PERMISSIONS: PermissionCode[] = [
  "campaign.create",
  "admin.settings.update"
];

export const CAMPAIGN_UPDATE_PERMISSIONS: PermissionCode[] = [
  "campaign.update",
  "admin.settings.update"
];

export const CAMPAIGN_PAUSE_PERMISSIONS: PermissionCode[] = [
  "campaign.pause",
  "admin.settings.update"
];

export const CAMPAIGN_ARCHIVE_PERMISSIONS: PermissionCode[] = [
  "campaign.archive",
  "admin.settings.update"
];

export const SPONSOR_VIEW_PERMISSIONS: PermissionCode[] = [
  "sponsor.view",
  "campaign.view",
  "admin.settings.view",
  "admin.settings.update"
];

export const SPONSOR_MANAGE_PERMISSIONS: PermissionCode[] = [
  "sponsor.create",
  "sponsor.update",
  "admin.settings.update"
];

export const CAMPAIGN_FINANCE_VIEW_PERMISSIONS: PermissionCode[] = [
  "campaign.finance.view",
  "finance.dashboard.view",
  "admin.settings.update"
];

export const CAMPAIGN_SETTINGS_UPDATE_PERMISSIONS: PermissionCode[] = [
  "campaign.settings.update",
  "admin.settings.update"
];

function hasAny(ctx: AuthPermissionContext, codes: PermissionCode[]) {
  return codes.some((code) => ctx.permissions.includes(code));
}

export function buildCampaignStaffPermissions(
  ctx: AuthPermissionContext
): CampaignStaffPermissions {
  return {
    canView: hasAny(ctx, CAMPAIGN_VIEW_PERMISSIONS),
    canCreate: hasAny(ctx, CAMPAIGN_CREATE_PERMISSIONS),
    canUpdate: hasAny(ctx, CAMPAIGN_UPDATE_PERMISSIONS),
    canPause: hasAny(ctx, CAMPAIGN_PAUSE_PERMISSIONS),
    canArchive: hasAny(ctx, CAMPAIGN_ARCHIVE_PERMISSIONS),
    canViewFinance: hasAny(ctx, CAMPAIGN_FINANCE_VIEW_PERMISSIONS),
    canManageSponsors: hasAny(ctx, SPONSOR_MANAGE_PERMISSIONS),
    canUpdateSettings: hasAny(ctx, CAMPAIGN_SETTINGS_UPDATE_PERMISSIONS)
  };
}
