/** Permission keys for taxonomy admin (wire to RBAC when available). */
export const TAXONOMY_PERMISSIONS = {
  view: "taxonomy.view",
  create: "taxonomy.create",
  edit: "taxonomy.edit",
  delete: "taxonomy.delete",
  import: "taxonomy.import",
  export: "taxonomy.export",
  requestsReview: "taxonomy.requests.review",
  templatesManage: "taxonomy.templates.manage"
} as const;

/** Fallback permissions used today in staff guards. */
export const TAXONOMY_PERMISSION_FALLBACK = {
  view: ["admin.settings.view", "admin.dashboard.view"],
  mutate: ["admin.settings.update"],
  import: ["admin.settings.update"],
  export: ["admin.settings.view", "admin.settings.update"],
  delete: ["admin.settings.update"],
  requests: ["admin.settings.update"],
  templates: ["admin.settings.update"]
} as const;
