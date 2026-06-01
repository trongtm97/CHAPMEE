export type AdminAnnouncementCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
};

export function buildAdminAnnouncementCapabilities(
  permissions: string[]
): AdminAnnouncementCapabilities {
  const has = (code: string) => permissions.includes(code);

  return {
    canView: has("platform.announcement.view") || has("admin.dashboard.view"),
    canCreate: has("platform.announcement.create") || has("admin.dashboard.view"),
    canUpdate: has("platform.announcement.update") || has("admin.dashboard.view")
  };
}

export type AnnouncementActionResult = {
  ok: boolean;
  message: string | null;
  id?: string;
  slug?: string;
};
