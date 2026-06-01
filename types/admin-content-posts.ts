export type AdminContentPostCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
};

export function buildAdminContentPostCapabilities(
  permissions: string[]
): AdminContentPostCapabilities {
  const has = (code: string) => permissions.includes(code);

  return {
    canView: has("content.post.view") || has("admin.dashboard.view"),
    canCreate: has("content.post.create") || has("admin.dashboard.view"),
    canUpdate: has("content.post.update") || has("admin.dashboard.view")
  };
}

export type ContentPostActionResult = {
  ok: boolean;
  message: string | null;
  id?: string;
  slug?: string;
};

export type ContentPostCoverUploadResult = {
  ok: boolean;
  message: string | null;
  url: string | null;
};
