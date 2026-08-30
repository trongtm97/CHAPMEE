import { createAdminClient } from "@/lib/data/admin";

function taxonomyAdminDb() {
  return createAdminClient();
}
import { slugify } from "@/lib/slugify";
import {
  defaultFlagsForType,
  validateTaxonomyTermInput
} from "@/lib/taxonomy/admin-validation";
import { mapFormatTemplateRow, mapTaxonomyRequestRow, mapTaxonomyTermRow } from "@/lib/taxonomy/map-row";
import { taxonomyParentTypeFor } from "@/lib/taxonomy/parent-types";
import type {
  StoryFormatTemplateRow,
  TaxonomyRequestRow,
  TaxonomyRequestStatus,
  TaxonomyTermRow,
  TaxonomyType
} from "@/types/taxonomy";
import { TAXONOMY_TYPES } from "@/types/taxonomy";
import {
  detectCatalogQualityIssues,
  summarizeCatalogQuality,
  type CatalogQualitySummary
} from "@/lib/taxonomy/catalog-quality";

export type AdminTaxonomyListFilters = {
  type?: TaxonomyType;
  types?: TaxonomyType[];
  search?: string;
  activeOnly?: boolean;
  inactiveOnly?: boolean;
  deprecatedOnly?: boolean;
  isPublic?: boolean;
  creatorSelectable?: boolean;
  featuredOnly?: boolean;
  usageMin?: number;
  usageMax?: number;
  hasAliases?: boolean;
  seoOnly?: boolean;
  discoverOnly?: boolean;
  rankingOnly?: boolean;
  moderationOnly?: boolean;
  presentationOnly?: boolean;
  parentId?: string | null;
  sort?: import("@/lib/taxonomy/admin-tabs").TaxonomyTermSort;
  page?: number;
  pageSize?: number;
};

export type TaxonomyTermAdminRow = TaxonomyTermRow & {
  parent_slug: string | null;
  parent_name: string | null;
};

export type TaxonomyRequestAdminRow = TaxonomyRequestRow & {
  requester_username: string | null;
  requester_display_name: string | null;
};

export type TaxonomyAdminDashboardStats = {
  totalTerms: number;
  activeTerms: number;
  inactiveTerms: number;
  mainGenreCount: number;
  creatorSelectableCount: number;
  pendingRequests: number;
  activeAgeRatings: number;
  topUsage: { name: string; slug: string; type: TaxonomyType; usage_count: number } | null;
  qualityAlerts: number;
  error: string | null;
};

export type TaxonomyAuditLogRow = {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_display_name: string | null;
};

export type UpsertTaxonomyTermInput = {
  type: TaxonomyType;
  slug: string;
  name: string;
  parent_id?: string | null;
  description?: string | null;
  display_label?: string | null;
  internal_note?: string | null;
  icon?: string | null;
  color?: string | null;
  aliases?: string[];
  is_active?: boolean;
  is_public?: boolean;
  is_selectable_by_creator?: boolean;
  is_featured?: boolean;
  use_for_seo?: boolean;
  use_for_discover?: boolean;
  use_for_ranking?: boolean;
  use_for_moderation?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_h1?: string | null;
  seo_intro?: string | null;
  canonical_path?: string | null;
  seo_indexable?: boolean;
  sitemap_priority?: number | null;
  sitemap_changefreq?: string | null;
  og_image_url?: string | null;
  og_image_asset_id?: string | null;
  use_for_pinterest_feed?: boolean;
  min_stories_override?: number | null;
  sort_order?: number;
};

function mapTerm(row: Record<string, unknown>) {
  return mapTaxonomyTermRow(row, { includeInternalNote: true }) as TaxonomyTermRow;
}

export async function assertTaxonomySlugAvailable(
  type: TaxonomyType,
  slug: string,
  excludeId?: string
): Promise<string | null> {
  const db = taxonomyAdminDb();
  let query = db
    .from("taxonomy_terms")
    .select("id")
    .eq("type", type)
    .eq("slug", slug);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return error.message;
  if (data) {
    return `Slug "${slug}" đã tồn tại trong nhóm ${type}.`;
  }
  return null;
}

async function validateAgeRatingMinimumActive(
  termId: string,
  nextIsActive: boolean,
  type: TaxonomyType
): Promise<string | null> {
  if (type !== "age_rating" || nextIsActive !== false) {
    return null;
  }

  const db = taxonomyAdminDb();
  const { count, error } = await db
    .from("taxonomy_terms")
    .select("id", { count: "exact", head: true })
    .eq("type", "age_rating")
    .eq("is_active", true)
    .neq("id", termId);

  if (error) {
    return error.message;
  }

  if ((count ?? 0) < 1) {
    return "Phải giữ ít nhất một nhãn độ tuổi đang hoạt động.";
  }

  return null;
}

async function attachParentLabels(
  items: TaxonomyTermRow[]
): Promise<TaxonomyTermAdminRow[]> {
  if (items.length === 0) return [];

  const db = taxonomyAdminDb();
  const parentIds = [
    ...new Set(items.map((t) => t.parent_id).filter(Boolean))
  ] as string[];

  const parentMap = new Map<string, { slug: string; name: string }>();
  if (parentIds.length > 0) {
    const { data } = await db
      .from("taxonomy_terms")
      .select("id, slug, name")
      .in("id", parentIds);
    for (const row of data ?? []) {
      parentMap.set(String(row.id), {
        slug: String(row.slug),
        name: String(row.name)
      });
    }
  }

  return items.map((term) => {
    const parent = term.parent_id ? parentMap.get(term.parent_id) : null;
    return {
      ...term,
      parent_slug: parent?.slug ?? null,
      parent_name: parent?.name ?? null
    };
  });
}

export async function listTaxonomyTermsForAdmin(filters: AdminTaxonomyListFilters = {}) {
  const db = taxonomyAdminDb();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db.from("taxonomy_terms").select("*", { count: "exact" });

  const sort = filters.sort ?? "updated_desc";
  if (sort === "usage_desc") {
    query = query.order("usage_count", { ascending: false }).order("name", { ascending: true });
  } else if (sort === "usage_asc") {
    query = query.order("usage_count", { ascending: true }).order("name", { ascending: true });
  } else if (sort === "name_asc") {
    query = query.order("name", { ascending: true });
  } else {
    query = query
      .order("updated_at", { ascending: false })
      .order("sort_order", { ascending: true });
  }

  if (filters.type) {
    query = query.eq("type", filters.type);
  } else if (filters.types?.length) {
    query = query.in("type", filters.types);
  }

  if (filters.activeOnly) query = query.eq("is_active", true);
  if (filters.inactiveOnly) query = query.eq("is_active", false);
  if (filters.deprecatedOnly) {
    query = query.eq("is_active", false).gt("usage_count", 0);
  }
  if (filters.isPublic === true) query = query.eq("is_public", true);
  if (filters.isPublic === false) query = query.eq("is_public", false);
  if (filters.creatorSelectable === true) {
    query = query.eq("is_selectable_by_creator", true);
  }
  if (filters.creatorSelectable === false) {
    query = query.eq("is_selectable_by_creator", false);
  }
  if (filters.featuredOnly) query = query.eq("is_featured", true);
  if (filters.usageMin !== undefined && filters.usageMin > 0) {
    query = query.gte("usage_count", filters.usageMin);
  }
  if (filters.usageMax !== undefined) {
    query = query.lte("usage_count", filters.usageMax);
  }

  if (filters.hasAliases === true) {
    query = query.not("aliases", "eq", "[]");
  } else if (filters.hasAliases === false) {
    query = query.eq("aliases", "[]");
  }

  if (filters.seoOnly) query = query.eq("use_for_seo", true);
  if (filters.discoverOnly) query = query.eq("use_for_discover", true);
  if (filters.rankingOnly) query = query.eq("use_for_ranking", true);
  if (filters.moderationOnly) query = query.eq("use_for_moderation", true);
  if (filters.presentationOnly) query = query.eq("type", "presentation_mode");

  if (filters.parentId !== undefined) {
    if (filters.parentId === null) {
      query = query.is("parent_id", null);
    } else {
      query = query.eq("parent_id", filters.parentId);
    }
  }

  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    query = query.or(
      `name.ilike.${q},slug.ilike.${q},display_label.ilike.${q},aliases::text.ilike.${q}`
    );
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    return { items: [] as TaxonomyTermAdminRow[], total: 0, error: error.message };
  }

  const rows = ((data ?? []) as Record<string, unknown>[]).map(mapTerm);
  const items = await attachParentLabels(rows);

  return {
    items,
    total: count ?? 0,
    error: null
  };
}

export async function getTaxonomyTermById(termId: string) {
  const db = taxonomyAdminDb();
  const { data, error } = await db
    .from("taxonomy_terms")
    .select("*")
    .eq("id", termId)
    .maybeSingle();

  if (error || !data) {
    return { item: null as TaxonomyTermRow | null, error: error?.message ?? "Không tìm thấy." };
  }

  return { item: mapTerm(data as Record<string, unknown>), error: null };
}

export async function getParentChainIds(termId: string): Promise<string[]> {
  const db = taxonomyAdminDb();
  const chain: string[] = [];
  let currentId: string | null = termId;

  for (let depth = 0; depth < 12 && currentId; depth++) {
    const { data: parentRow }: { data: { parent_id: string | null } | null } =
      await db
        .from("taxonomy_terms")
        .select("parent_id")
        .eq("id", currentId)
        .maybeSingle();

    const parentId: string | null = parentRow?.parent_id
      ? String(parentRow.parent_id)
      : null;
    if (!parentId) break;
    if (chain.includes(parentId)) break;
    chain.push(parentId);
    currentId = parentId;
  }

  return chain;
}

export async function listTaxonomyRequestsForAdmin(options?: {
  status?: TaxonomyRequestStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = taxonomyAdminDb();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, options?.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from("taxonomy_requests")
    .select("*, requester:profiles!requested_by(username, display_name)", {
      count: "exact"
    })
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.search?.trim()) {
    const q = `%${options.search.trim()}%`;
    query = query.or(`name.ilike.${q},description.ilike.${q}`);
  }

  let { data, error, count } = await query.range(from, to);

  if (error) {
    let fallbackQuery = db
      .from("taxonomy_requests")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (options?.status) {
      fallbackQuery = fallbackQuery.eq("status", options.status);
    }
    const fallback = await fallbackQuery.range(from, to);
    data = fallback.data;
    error = fallback.error;
    count = fallback.count;
  }

  if (error) {
    return { items: [] as TaxonomyRequestAdminRow[], total: 0, error: error.message };
  }

  const requesterIds = [
    ...new Set(
      ((data ?? []) as Record<string, unknown>[]).map((row) =>
        String(row.requested_by ?? "")
      )
    )
  ].filter(Boolean);

  const profileMap = new Map<
    string,
    { username: string | null; display_name: string | null }
  >();

  if (requesterIds.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, username, display_name")
      .in("id", requesterIds);
    for (const profile of profiles ?? []) {
      profileMap.set(String(profile.id), {
        username: profile.username as string | null,
        display_name: profile.display_name as string | null
      });
    }
  }

  const items = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const requester = row.requester as
      | { username: string | null; display_name: string | null }
      | { username: string | null; display_name: string | null }[]
      | null;
    const profileFromJoin = Array.isArray(requester) ? requester[0] : requester;
    const profileFromMap = profileMap.get(String(row.requested_by ?? ""));
    const mapped = mapTaxonomyRequestRow(row);
    return {
      ...mapped,
      requester_username:
        profileFromJoin?.username ?? profileFromMap?.username ?? null,
      requester_display_name:
        profileFromJoin?.display_name ?? profileFromMap?.display_name ?? null
    } satisfies TaxonomyRequestAdminRow;
  });

  return {
    items,
    total: count ?? 0,
    error: null
  };
}

export async function listTaxonomyAuditLogsForAdmin(options?: {
  page?: number;
  pageSize?: number;
  action?: string;
}) {
  const db = taxonomyAdminDb();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, options?.pageSize ?? 15));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from("admin_audit_logs")
    .select("id, action, target_type, target_id, metadata, created_at, actor_id", {
      count: "exact"
    })
    .order("created_at", { ascending: false });

  if (options?.action) {
    query = query.eq("action", options.action);
  } else {
    query = query.like("action", "taxonomy%");
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    return { items: [] as TaxonomyAuditLogRow[], total: 0, error: error.message };
  }

  const actorIds = [
    ...new Set((data ?? []).map((row) => row.actor_id).filter(Boolean))
  ] as string[];

  const actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await db
      .from("profiles")
      .select("id, display_name, username")
      .in("id", actorIds);
    for (const actor of actors ?? []) {
      actorMap.set(
        String(actor.id),
        String(actor.display_name ?? actor.username ?? actor.id)
      );
    }
  }

  return {
    items: (data ?? []).map((row) => ({
      id: String(row.id),
      action: String(row.action),
      target_type: row.target_type as string | null,
      target_id: row.target_id as string | null,
      metadata: (row.metadata as Record<string, unknown>) ?? null,
      created_at: String(row.created_at),
      actor_display_name: row.actor_id
        ? (actorMap.get(String(row.actor_id)) ?? null)
        : null
    })),
    total: count ?? 0,
    error: null
  };
}

function escapeCsvCell(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportTaxonomyAuditLogsForAdmin(options?: {
  action?: string;
  limit?: number;
}) {
  const limit = Math.min(5000, Math.max(50, options?.limit ?? 2000));
  const result = await listTaxonomyAuditLogsForAdmin({
    page: 1,
    pageSize: limit,
    action: options?.action
  });

  if (result.error) {
    return { csv: "", error: result.error };
  }

  const header = [
    "created_at",
    "action",
    "actor",
    "target_type",
    "target_id",
    "metadata"
  ];

  const lines = [
    header.join(","),
    ...result.items.map((row) =>
      [
        row.created_at,
        row.action,
        row.actor_display_name ?? "",
        row.target_type ?? "",
        row.target_id ?? "",
        row.metadata ? JSON.stringify(row.metadata) : ""
      ]
        .map((cell) => escapeCsvCell(String(cell)))
        .join(",")
    )
  ];

  return { csv: lines.join("\n"), error: null };
}

export async function getTaxonomyAdminStats() {
  const stats = await getTaxonomyAdminDashboardStats();
  return {
    totalTerms: stats.totalTerms,
    pendingRequests: stats.pendingRequests,
    error: stats.error
  };
}

export async function getTaxonomyAdminDashboardStats(): Promise<TaxonomyAdminDashboardStats> {
  const db = taxonomyAdminDb();

  const [
    totalRes,
    activeRes,
    mainGenreRes,
    selectableRes,
    pendingRes,
    ageRatingRes,
    topRes
  ] = await Promise.all([
    db.from("taxonomy_terms").select("id", { count: "exact", head: true }),
    db
      .from("taxonomy_terms")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    db
      .from("taxonomy_terms")
      .select("id", { count: "exact", head: true })
      .eq("type", "main_genre")
      .eq("is_active", true),
    db
      .from("taxonomy_terms")
      .select("id", { count: "exact", head: true })
      .eq("is_selectable_by_creator", true)
      .eq("is_active", true),
    db
      .from("taxonomy_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("taxonomy_terms")
      .select("id", { count: "exact", head: true })
      .eq("type", "age_rating")
      .eq("is_active", true),
    db
      .from("taxonomy_terms")
      .select("name, slug, type, usage_count")
      .order("usage_count", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const totalTerms = totalRes.count ?? 0;
  const activeTerms = activeRes.count ?? 0;

  const topRow = topRes.data as
    | { name: string; slug: string; type: string; usage_count: number }
    | null;

  return {
    totalTerms,
    activeTerms,
    inactiveTerms: Math.max(0, totalTerms - activeTerms),
    mainGenreCount: mainGenreRes.count ?? 0,
    creatorSelectableCount: selectableRes.count ?? 0,
    pendingRequests: pendingRes.count ?? 0,
    activeAgeRatings: ageRatingRes.count ?? 0,
    topUsage: topRow
      ? {
          name: String(topRow.name),
          slug: String(topRow.slug),
          type: topRow.type as TaxonomyType,
          usage_count: Number(topRow.usage_count ?? 0)
        }
      : null,
    qualityAlerts: 0,
    error:
      totalRes.error?.message ??
      activeRes.error?.message ??
      pendingRes.error?.message ??
      null
  };
}

export async function getCatalogQualityForAdmin(): Promise<{
  summary: CatalogQualitySummary;
  error: string | null;
}> {
  const db = taxonomyAdminDb();
  const { data, error } = await db
    .from("taxonomy_terms")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5000);

  if (error) {
    return {
      summary: {
        totalIssues: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        issues: []
      },
      error: error.message
    };
  }

  const terms = ((data ?? []) as Record<string, unknown>[]).map(mapTerm);
  const issues = detectCatalogQualityIssues(terms);
  return { summary: summarizeCatalogQuality(issues), error: null };
}

function buildInsertPayload(actorId: string, input: UpsertTaxonomyTermInput) {
  const defaults = defaultFlagsForType(input.type);
  return {
    type: input.type,
    parent_id: input.parent_id ?? null,
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description ?? null,
    display_label: input.display_label ?? null,
    internal_note: input.internal_note ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    aliases: input.aliases ?? [],
    is_active: input.is_active ?? true,
    is_public: input.is_public ?? true,
    is_selectable_by_creator:
      input.is_selectable_by_creator ?? defaults.is_selectable_by_creator ?? true,
    is_featured: input.is_featured ?? false,
    use_for_seo: input.use_for_seo ?? defaults.use_for_seo ?? true,
    use_for_discover: input.use_for_discover ?? defaults.use_for_discover ?? true,
    use_for_ranking: input.use_for_ranking ?? defaults.use_for_ranking ?? false,
    use_for_moderation:
      input.use_for_moderation ?? defaults.use_for_moderation ?? false,
    seo_title: input.seo_title ?? null,
    seo_description: input.seo_description ?? null,
    seo_h1: input.seo_h1 ?? null,
    seo_intro: input.seo_intro ?? null,
    canonical_path: input.canonical_path?.trim() || null,
    seo_indexable: input.seo_indexable ?? true,
    sitemap_priority: input.sitemap_priority ?? null,
    sitemap_changefreq: input.sitemap_changefreq?.trim() || null,
    og_image_url: input.og_image_url?.trim() || null,
    og_image_asset_id: input.og_image_asset_id?.trim() || null,
    use_for_pinterest_feed: input.use_for_pinterest_feed ?? false,
    min_stories_override: input.min_stories_override ?? null,
    sort_order: input.sort_order ?? 0,
    created_by: actorId,
    updated_by: actorId
  };
}

export async function createTaxonomyTermAdmin(
  actorId: string,
  input: UpsertTaxonomyTermInput
) {
  const validation = validateTaxonomyTermInput(input);
  if (validation) return { item: null, error: validation };

  const slugError = await assertTaxonomySlugAvailable(input.type, input.slug);
  if (slugError) return { item: null, error: slugError };

  const db = taxonomyAdminDb();
  const { data, error } = await db
    .from("taxonomy_terms")
    .insert(buildInsertPayload(actorId, input))
    .select("*")
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  return { item: mapTerm(data as Record<string, unknown>), error: null };
}

export async function updateTaxonomyTermAdmin(
  termId: string,
  actorId: string,
  patch: Partial<UpsertTaxonomyTermInput>
) {
  const existing = await getTaxonomyTermById(termId);
  if (!existing.item) {
    return { item: null, error: existing.error ?? "Không tìm thấy." };
  }

  const merged: UpsertTaxonomyTermInput = {
    type: patch.type ?? existing.item.type,
    slug: patch.slug ?? existing.item.slug,
    name: patch.name ?? existing.item.name,
    parent_id: patch.parent_id !== undefined ? patch.parent_id : existing.item.parent_id,
    description:
      patch.description !== undefined ? patch.description : existing.item.description,
    display_label:
      patch.display_label !== undefined
        ? patch.display_label
        : existing.item.display_label,
    internal_note:
      patch.internal_note !== undefined
        ? patch.internal_note
        : existing.item.internal_note,
    icon: patch.icon !== undefined ? patch.icon : existing.item.icon,
    color: patch.color !== undefined ? patch.color : existing.item.color,
    aliases: patch.aliases ?? existing.item.aliases,
    is_active: patch.is_active ?? existing.item.is_active,
    is_public: patch.is_public ?? existing.item.is_public,
    is_selectable_by_creator:
      patch.is_selectable_by_creator ?? existing.item.is_selectable_by_creator,
    is_featured: patch.is_featured ?? existing.item.is_featured,
    use_for_seo: patch.use_for_seo ?? existing.item.use_for_seo,
    use_for_discover: patch.use_for_discover ?? existing.item.use_for_discover,
    use_for_ranking: patch.use_for_ranking ?? existing.item.use_for_ranking,
    use_for_moderation:
      patch.use_for_moderation ?? existing.item.use_for_moderation,
    seo_title: patch.seo_title !== undefined ? patch.seo_title : existing.item.seo_title,
    seo_description:
      patch.seo_description !== undefined
        ? patch.seo_description
        : existing.item.seo_description,
    seo_h1: patch.seo_h1 !== undefined ? patch.seo_h1 : existing.item.seo_h1,
    seo_intro: patch.seo_intro !== undefined ? patch.seo_intro : existing.item.seo_intro,
    canonical_path:
      patch.canonical_path !== undefined
        ? patch.canonical_path
        : existing.item.canonical_path,
    seo_indexable: patch.seo_indexable ?? existing.item.seo_indexable,
    sitemap_priority:
      patch.sitemap_priority !== undefined
        ? patch.sitemap_priority
        : existing.item.sitemap_priority,
    sitemap_changefreq:
      patch.sitemap_changefreq !== undefined
        ? patch.sitemap_changefreq
        : existing.item.sitemap_changefreq,
    og_image_url:
      patch.og_image_url !== undefined ? patch.og_image_url : existing.item.og_image_url,
    og_image_asset_id:
      patch.og_image_asset_id !== undefined
        ? patch.og_image_asset_id
        : existing.item.og_image_asset_id,
    use_for_pinterest_feed:
      patch.use_for_pinterest_feed ?? existing.item.use_for_pinterest_feed,
    min_stories_override:
      patch.min_stories_override !== undefined
        ? patch.min_stories_override
        : existing.item.min_stories_override,
    sort_order: patch.sort_order ?? existing.item.sort_order
  };

  const parentChain = await getParentChainIds(termId);
  const validation = validateTaxonomyTermInput(merged, {
    termId,
    parentChainIds: parentChain
  });
  if (validation) return { item: null, error: validation };

  const slugChanged =
    merged.slug !== existing.item.slug || merged.type !== existing.item.type;
  if (slugChanged) {
    const slugError = await assertTaxonomySlugAvailable(
      merged.type,
      merged.slug,
      termId
    );
    if (slugError) return { item: null, error: slugError };
  }

  const ageRatingError = await validateAgeRatingMinimumActive(
    termId,
    merged.is_active ?? true,
    merged.type
  );
  if (ageRatingError) return { item: null, error: ageRatingError };

  const db = taxonomyAdminDb();
  const insertPayload = buildInsertPayload(actorId, merged);
  const { created_by: _createdBy, ...updatePayload } = insertPayload;

  const { data, error } = await db
    .from("taxonomy_terms")
    .update(updatePayload)
    .eq("id", termId)
    .select("*")
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  return { item: mapTerm(data as Record<string, unknown>), error: null };
}

export async function deleteTaxonomyTermAdmin(termId: string) {
  const existing = await getTaxonomyTermById(termId);
  if (!existing.item) {
    return { ok: false, error: existing.error ?? "Không tìm thấy." };
  }
  if (existing.item.usage_count > 0) {
    return {
      ok: false,
      error: `Nhãn đang được ${existing.item.usage_count} truyện dùng — chỉ tắt hoặc gộp.`
    };
  }

  const db = taxonomyAdminDb();
  const { error } = await db.from("taxonomy_terms").delete().eq("id", termId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export async function duplicateTaxonomyTermAdmin(termId: string, actorId: string) {
  const existing = await getTaxonomyTermById(termId);
  if (!existing.item) {
    return { item: null, error: existing.error ?? "Không tìm thấy." };
  }

  const baseSlug = `${existing.item.slug}-copy`;
  let slug = baseSlug;
  let suffix = 2;
  const db = taxonomyAdminDb();

  while (true) {
    const { data } = await db
      .from("taxonomy_terms")
      .select("id")
      .eq("type", existing.item.type)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return createTaxonomyTermAdmin(actorId, {
    type: existing.item.type,
    slug,
    name: `${existing.item.name} (bản sao)`,
    parent_id: existing.item.parent_id,
    description: existing.item.description,
    display_label: existing.item.display_label,
    internal_note: existing.item.internal_note,
    icon: existing.item.icon,
    color: existing.item.color,
    aliases: [...existing.item.aliases],
    is_active: false,
    is_public: existing.item.is_public,
    is_selectable_by_creator: existing.item.is_selectable_by_creator,
    is_featured: false,
    use_for_seo: existing.item.use_for_seo,
    use_for_discover: existing.item.use_for_discover,
    use_for_ranking: existing.item.use_for_ranking,
    use_for_moderation: existing.item.use_for_moderation,
    sort_order: existing.item.sort_order + 1
  });
}

export async function mergeTaxonomyTermsAdmin(
  sourceId: string,
  targetId: string,
  actorId: string
) {
  if (sourceId === targetId) {
    return { ok: false, error: "Không thể gộp vào chính nó." };
  }

  const [source, target] = await Promise.all([
    getTaxonomyTermById(sourceId),
    getTaxonomyTermById(targetId)
  ]);

  if (!source.item || !target.item) {
    return { ok: false, error: "Nhãn nguồn hoặc đích không tồn tại." };
  }
  if (source.item.type !== target.item.type) {
    return { ok: false, error: "Hai nhãn phải cùng nhóm type." };
  }

  const db = taxonomyAdminDb();

  const { data: links } = await db
    .from("story_taxonomy_terms")
    .select("story_id")
    .eq("term_id", sourceId);

  for (const row of links ?? []) {
    await db.from("story_taxonomy_terms").upsert(
      {
        story_id: row.story_id,
        term_id: targetId,
        type: target.item.type
      },
      { onConflict: "story_id,term_id" }
    );
  }

  await db.from("story_taxonomy_terms").delete().eq("term_id", sourceId);

  const aliases = [...new Set([...target.item.aliases, source.item.name, source.item.slug])];

  await updateTaxonomyTermAdmin(targetId, actorId, { aliases });
  await updateTaxonomyTermAdmin(sourceId, actorId, { is_active: false });

  await db.rpc("refresh_taxonomy_usage_counts");

  return { ok: true, error: null };
}

export async function listStoriesUsingTerm(termId: string, limit = 20) {
  const db = taxonomyAdminDb();
  const { data, error } = await db
    .from("story_taxonomy_terms")
    .select("story_id, stories(id, title, slug, status, visibility)")
    .eq("term_id", termId)
    .limit(limit);

  if (error) {
    return { items: [] as Array<{ id: string; title: string; slug: string }>, error: error.message };
  }

  const items = (data ?? [])
    .map((row) => {
      const story = row.stories as
        | { id: string; title: string; slug: string }
        | { id: string; title: string; slug: string }[]
        | null;
      const rel = Array.isArray(story) ? story[0] : story;
      if (!rel) return null;
      return { id: String(rel.id), title: String(rel.title), slug: String(rel.slug) };
    })
    .filter((row): row is { id: string; title: string; slug: string } => Boolean(row));

  return { items, error: null };
}

export async function resolveParentSlugToId(
  type: TaxonomyType,
  parentSlug: string | null | undefined
) {
  if (!parentSlug?.trim()) return null;
  const parentType = taxonomyParentTypeFor(type);
  if (!parentType) return null;

  const db = taxonomyAdminDb();
  const { data } = await db
    .from("taxonomy_terms")
    .select("id")
    .eq("type", parentType)
    .eq("slug", parentSlug.trim())
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}

export async function listFormatTemplatesForAdmin() {
  const db = taxonomyAdminDb();
  const { data, error } = await db
    .from("story_format_templates")
    .select("*")
    .order("mode", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    return { items: [] as StoryFormatTemplateRow[], error: error.message };
  }

  return {
    items: ((data ?? []) as Record<string, unknown>[]).map((row) =>
      mapFormatTemplateRow(row)
    ),
    error: null
  };
}

export type UpsertFormatTemplateInput = {
  id?: string;
  mode: string;
  name: string;
  description?: string | null;
  schema_json?: Record<string, unknown>;
  example_json?: Record<string, unknown>;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
};

export async function saveFormatTemplateAdmin(
  actorId: string,
  input: UpsertFormatTemplateInput
) {
  const db = taxonomyAdminDb();
  const payload = {
    mode: input.mode.trim(),
    name: input.name.trim(),
    description: input.description ?? null,
    schema_json: input.schema_json ?? {},
    example_json: input.example_json ?? {},
    is_active: input.is_active ?? true,
    is_default: input.is_default ?? false,
    sort_order: input.sort_order ?? 0
  };

  if (input.id) {
    const { data, error } = await db
      .from("story_format_templates")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) return { item: null, error: error.message };
    return { item: mapFormatTemplateRow(data as Record<string, unknown>), error: null };
  }

  const { data, error } = await db
    .from("story_format_templates")
    .insert(payload)
    .select("*")
    .single();

  if (error) return { item: null, error: error.message };
  return { item: mapFormatTemplateRow(data as Record<string, unknown>), error: null };
}

export async function duplicateFormatTemplateAdmin(templateId: string, actorId: string) {
  const db = taxonomyAdminDb();
  const { data, error } = await db
    .from("story_format_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error || !data) {
    return { item: null, error: error?.message ?? "Không tìm thấy template." };
  }

  const row = mapFormatTemplateRow(data as Record<string, unknown>);
  return saveFormatTemplateAdmin(actorId, {
    mode: row.mode,
    name: `${row.name} (bản sao)`,
    description: row.description,
    schema_json: row.schema_json,
    example_json: row.example_json,
    is_active: row.is_active,
    is_default: false,
    sort_order: row.sort_order + 1
  });
}

export type TaxonomyExportScope = {
  type?: TaxonomyType;
  types?: TaxonomyType[];
};

export async function exportTaxonomyTermsForAdmin(scope?: TaxonomyExportScope) {
  const result = await listTaxonomyTermsForAdmin({
    type: scope?.type,
    types: scope?.types,
    page: 1,
    pageSize: 5000
  });

  if (result.error) {
    return { rows: [] as TaxonomyTermRow[], csv: "", error: result.error };
  }

  const parentSlugs = new Map<string, string>();
  const db = taxonomyAdminDb();
  const parentIds = [
    ...new Set(result.items.map((t) => t.parent_id).filter(Boolean))
  ] as string[];

  if (parentIds.length > 0) {
    const { data } = await db
      .from("taxonomy_terms")
      .select("id, slug")
      .in("id", parentIds);
    for (const row of data ?? []) {
      parentSlugs.set(String(row.id), String(row.slug));
    }
  }

  const header = [
    "type",
    "parent_slug",
    "name",
    "slug",
    "description",
    "display_label",
    "aliases",
    "icon",
    "color",
    "is_active",
    "is_public",
    "is_selectable_by_creator",
    "is_featured",
    "use_for_seo",
    "use_for_discover",
    "use_for_ranking",
    "use_for_moderation",
    "sort_order"
  ];

  const escape = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines = [
    header.join(","),
    ...result.items.map((term) =>
      [
        term.type,
        term.parent_id ? (parentSlugs.get(term.parent_id) ?? "") : "",
        term.name,
        term.slug,
        term.description ?? "",
        term.display_label ?? "",
        term.aliases.join("; "),
        term.icon ?? "",
        term.color ?? "",
        String(term.is_active),
        String(term.is_public),
        String(term.is_selectable_by_creator),
        String(term.is_featured),
        String(term.use_for_seo),
        String(term.use_for_discover),
        String(term.use_for_ranking),
        String(term.use_for_moderation),
        String(term.sort_order)
      ]
        .map(escape)
        .join(",")
    )
  ];

  return { rows: result.items, csv: lines.join("\n"), error: null };
}

export { TAXONOMY_TYPES };
