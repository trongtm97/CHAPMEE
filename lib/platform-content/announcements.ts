import { createClient } from "@/lib/data/server";
import { hasAnnouncementSeoIssues } from "@/lib/announcements/labels";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { getAnnouncementUrl } from "@/lib/urls/paths";
import type { AnnouncementListFilters } from "@/lib/platform-content/parse-announcement-filters";
import type {
  AnnouncementStatus,
  CreateAnnouncementInput,
  ListAnnouncementsOptions,
  PlatformAnnouncement,
  UpdateAnnouncementInput
} from "@/types/platform-content";

function mapAnnouncement(row: Record<string, unknown>): PlatformAnnouncement {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    public_code: row.public_code ? String(row.public_code) : null,
    excerpt: row.excerpt ? String(row.excerpt) : null,
    body: row.body ? String(row.body) : null,
    announcement_type: row.announcement_type as PlatformAnnouncement["announcement_type"],
    visibility: row.visibility as PlatformAnnouncement["visibility"],
    status: row.status as PlatformAnnouncement["status"],
    priority: row.priority as PlatformAnnouncement["priority"],
    audience_type: (row.audience_type as PlatformAnnouncement["audience_type"]) ?? "all",
    indexable: Boolean(row.indexable),
    follow_links: row.follow_links !== false,
    seo_title: row.seo_title ? String(row.seo_title) : null,
    seo_description: row.seo_description ? String(row.seo_description) : null,
    canonical_path: row.canonical_path ? String(row.canonical_path) : null,
    og_title: row.og_title ? String(row.og_title) : null,
    og_description: row.og_description ? String(row.og_description) : null,
    og_image_url: row.og_image_url ? String(row.og_image_url) : null,
    og_image_media_asset_id: row.og_image_media_asset_id
      ? String(row.og_image_media_asset_id)
      : null,
    published_at: row.published_at ? String(row.published_at) : null,
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : null,
    expires_at: row.expires_at ? String(row.expires_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    created_by: row.created_by ? String(row.created_by) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null
  };
}

export type AnnouncementStats = {
  total: number;
  published: number;
  scheduled: number;
  draft: number;
  hidden: number;
  archived: number;
  seoIssues: number;
};

type ListInput = ListAnnouncementsOptions | AnnouncementListFilters;

function applyPublicVisibilityFilters(query: any) {
  const now = new Date().toISOString();
  return query
    .eq("visibility", "public")
    .eq("status", "published")
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`);
}

function applySort(query: any, sort: AnnouncementListFilters["sort"] | undefined) {
  if (sort === "published") {
    return query
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
  }

  if (sort === "oldest") {
    return query.order("created_at", { ascending: true });
  }

  if (sort === "title_asc") {
    return query.order("title", { ascending: true });
  }

  if (sort === "status") {
    return query.order("status", { ascending: true }).order("updated_at", { ascending: false });
  }

  if (sort === "priority") {
    return query.order("priority", { ascending: true }).order("updated_at", { ascending: false });
  }

  return query.order("updated_at", { ascending: false });
}

function applySeoFilter(items: PlatformAnnouncement[], seo: AnnouncementListFilters["seo"]) {
  if (seo === "all") return items;

  return items.filter((item) => {
    if (seo === "index") return item.indexable;
    if (seo === "noindex") return !item.indexable;
    if (seo === "missing_seo_title") return item.indexable && !item.seo_title?.trim();
    if (seo === "missing_seo_description") return item.indexable && !item.seo_description?.trim();
    if (seo === "seo_issue") return hasAnnouncementSeoIssues(item);
    return true;
  });
}

function applyAdminFilters(query: any, options: AnnouncementListFilters) {
  if (options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options.announcementType !== "all") {
    query = query.eq("announcement_type", options.announcementType);
  }
  if (options.audience !== "all") {
    query = query.eq("audience_type", options.audience);
  }
  if (options.visibility !== "all") {
    query = query.eq("visibility", options.visibility);
  }

  const search = options.search?.trim();
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,slug.ilike.%${search}%,excerpt.ilike.%${search}%,body.ilike.%${search}%`
    );
  }

  return query;
}

export async function listAnnouncements(
  options: ListInput = {}
): Promise<{ items: PlatformAnnouncement[]; total: number; error: string | null }> {
  const db = await createClient();
  const isAdminFilters = "audience" in options && "page" in options;
  const adminFilters = isAdminFilters ? (options as AnnouncementListFilters) : null;
  const isPublicPaginated = "publicOnly" in options && options.publicOnly && "page" in options;
  const limit =
    isAdminFilters || isPublicPaginated
      ? (options.pageSize ?? 20)
      : (options.limit ?? 50);
  const offset =
    isAdminFilters || isPublicPaginated
      ? ((options.page ?? 1) - 1) * limit
      : (options.offset ?? 0);

  const seoFilter = adminFilters && adminFilters.seo !== "all" ? adminFilters.seo : null;
  const needsClientSeoFilter = Boolean(
    seoFilter && ["missing_seo_title", "missing_seo_description", "seo_issue"].includes(seoFilter)
  );

  let query = db.from("platform_announcements").select("*", { count: "exact" });

  if ("publicOnly" in options && options.publicOnly) {
    query = applyPublicVisibilityFilters(query);

    if (options.announcementType && options.announcementType !== "all") {
      query = query.eq("announcement_type", options.announcementType);
    }
  } else if (isAdminFilters && adminFilters) {
    query = applyAdminFilters(query, adminFilters);

    if (seoFilter === "index") {
      query = query.eq("indexable", true);
    } else if (seoFilter === "noindex") {
      query = query.eq("indexable", false);
    }
  } else {
    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      query = query.in("status", statuses);
    }
    if (options.visibility) {
      query = query.eq("visibility", options.visibility);
    }
  }

  const search = isAdminFilters ? options.search : options.search;
  if (search?.trim() && !isAdminFilters) {
    const term = search.trim();
    query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,body.ilike.%${term}%`);
  }

  query = applySort(
    query,
    isAdminFilters && adminFilters
      ? adminFilters.sort
      : isPublicPaginated
        ? (options.sort ?? "published")
        : options.sort
  );

  if (needsClientSeoFilter) {
    const { data, error } = await query.range(0, 4999);
    if (error) {
      return { items: [], total: 0, error: error.message };
    }

    const filtered = applySeoFilter(
      (data ?? []).map((row) => mapAnnouncement(row as Record<string, unknown>)),
      seoFilter!
    );
    const pageItems = filtered.slice(offset, offset + limit);

    return { items: pageItems, total: filtered.length, error: null };
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return { items: [], total: 0, error: error.message };
  }

  return {
    items: (data ?? []).map((row) => mapAnnouncement(row as Record<string, unknown>)),
    total: count ?? 0,
    error: null
  };
}

export async function getAnnouncementStats(): Promise<{
  stats: AnnouncementStats;
  error: string | null;
}> {
  const db = await createClient();
  const { data, error } = await db.from("platform_announcements").select("*");

  if (error) {
    return {
      stats: {
        total: 0,
        published: 0,
        scheduled: 0,
        draft: 0,
        hidden: 0,
        archived: 0,
        seoIssues: 0
      },
      error: error.message
    };
  }

  const items = (data ?? []).map((row) => mapAnnouncement(row as Record<string, unknown>));

  return {
    stats: {
      total: items.length,
      published: items.filter((i) => i.status === "published").length,
      scheduled: items.filter((i) => i.status === "scheduled").length,
      draft: items.filter((i) => i.status === "draft").length,
      hidden: items.filter((i) => i.status === "hidden").length,
      archived: items.filter((i) => i.status === "archived").length,
      seoIssues: items.filter((i) => hasAnnouncementSeoIssues(i)).length
    },
    error: null
  };
}

export async function listAnnouncementIdsByFilters(
  filters: AnnouncementListFilters
): Promise<{ ids: string[]; error: string | null }> {
  const result = await listAnnouncements({ ...filters, page: 1, pageSize: 5000 });
  if (result.error) {
    return { ids: [], error: result.error };
  }
  return { ids: result.items.map((item) => item.id), error: null };
}

export async function getAnnouncementById(
  id: string
): Promise<{ item: PlatformAnnouncement | null; error: string | null }> {
  const db = await createClient();
  const { data, error } = await db
    .from("platform_announcements")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { item: null, error: error.message };
  }

  return {
    item: data ? mapAnnouncement(data as Record<string, unknown>) : null,
    error: null
  };
}

export async function isAnnouncementSlugTaken(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const db = await createClient();
  let query = db.from("platform_announcements").select("id").eq("slug", slug);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    return false;
  }

  return Boolean(data);
}

export async function getAnnouncementBySlug(
  slug: string,
  options: { publicOnly?: boolean } = {}
): Promise<{ item: PlatformAnnouncement | null; error: string | null }> {
  const db = await createClient();

  let query = db.from("platform_announcements").select("*").eq("slug", slug);

  if (options.publicOnly) {
    query = applyPublicVisibilityFilters(query);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { item: null, error: error.message };
  }

  return {
    item: data ? mapAnnouncement(data as Record<string, unknown>) : null,
    error: null
  };
}

export async function getAnnouncementByPublicCode(
  publicCode: string,
  options: { publicOnly?: boolean } = {}
): Promise<{ item: PlatformAnnouncement | null; error: string | null }> {
  const db = await createClient();

  let query = db
    .from("platform_announcements")
    .select("*")
    .eq("public_code", publicCode);

  if (options.publicOnly) {
    query = applyPublicVisibilityFilters(query);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { item: null, error: error.message };
  }

  return {
    item: data ? mapAnnouncement(data as Record<string, unknown>) : null,
    error: null
  };
}

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<{ item: PlatformAnnouncement | null; error: string | null }> {
  const db = await createClient();
  const now = new Date().toISOString();
  const status = input.status ?? "draft";
  const publishedAt =
    input.published_at ?? (status === "published" ? now : null);

  const visibility = input.visibility ?? "public";
  const publicCode =
    visibility === "public"
      ? await generateNumericPublicCode(db, "announcement")
      : null;
  const canonicalPath =
    publicCode && input.slug
      ? getAnnouncementUrl({ slug: input.slug, public_code: publicCode })
      : input.canonical_path ?? null;

  const { data, error } = await db
    .from("platform_announcements")
    .insert({
      title: input.title,
      slug: input.slug,
      public_code: publicCode,
      excerpt: input.excerpt ?? null,
      body: input.body ?? null,
      announcement_type: input.announcement_type ?? "general",
      visibility,
      status,
      priority: input.priority ?? "normal",
      audience_type: input.audience_type ?? "all",
      indexable: input.indexable ?? false,
      follow_links: input.follow_links ?? true,
      seo_title: input.seo_title ?? null,
      seo_description: input.seo_description ?? null,
      canonical_path: canonicalPath,
      og_title: input.og_title ?? null,
      og_description: input.og_description ?? null,
      og_image_url: input.og_image_url ?? null,
      og_image_media_asset_id: input.og_image_media_asset_id ?? null,
      published_at: publishedAt,
      scheduled_at: input.scheduled_at ?? null,
      expires_at: input.expires_at ?? null,
      created_by: input.created_by ?? null,
      updated_by: input.updated_by ?? null
    })
    .select("*")
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  return { item: mapAnnouncement(data as Record<string, unknown>), error: null };
}

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput
): Promise<{ item: PlatformAnnouncement | null; error: string | null }> {
  const db = await createClient();
  const patch: Record<string, unknown> = { ...input };

  const { data: existingRow } = await db
    .from("platform_announcements")
    .select("published_at, public_code, slug, visibility")
    .eq("id", id)
    .maybeSingle();

  if (input.status === "published" && input.published_at === undefined) {
    if (!existingRow?.published_at) {
      patch.published_at = new Date().toISOString();
    }
  }

  const nextVisibility = input.visibility ?? existingRow?.visibility ?? "public";
  const slug = input.slug ?? existingRow?.slug;
  if (nextVisibility === "public" && !existingRow?.public_code && slug) {
    const publicCode = await generateNumericPublicCode(db, "announcement");
    patch.public_code = publicCode;
    patch.canonical_path = getAnnouncementUrl({ slug, public_code: publicCode });
  }

  const { data, error } = await db
    .from("platform_announcements")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  return { item: mapAnnouncement(data as Record<string, unknown>), error: null };
}

export async function updateAnnouncementStatus(
  id: string,
  status: AnnouncementStatus
): Promise<{ item: PlatformAnnouncement | null; error: string | null }> {
  return updateAnnouncement(id, {
    status,
    ...(status === "published" ? { published_at: new Date().toISOString() } : {})
  });
}

export async function deleteAnnouncement(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  const db = await createClient();
  const { error } = await db.from("platform_announcements").delete().eq("id", id);
  return { ok: !error, error: error?.message ?? null };
}

export async function bulkUpdateAnnouncements(
  ids: string[],
  patch: UpdateAnnouncementInput
): Promise<{ updated: number; error: string | null }> {
  if (ids.length === 0) {
    return { updated: 0, error: null };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("platform_announcements")
    .update(patch)
    .in("id", ids)
    .select("id");

  if (error) {
    return { updated: 0, error: error.message };
  }

  return { updated: data?.length ?? 0, error: null };
}

export async function bulkDeleteAnnouncements(
  ids: string[]
): Promise<{ deleted: number; error: string | null }> {
  if (ids.length === 0) {
    return { deleted: 0, error: null };
  }

  const db = await createClient();
  const { data, error } = await db
    .from("platform_announcements")
    .delete()
    .in("id", ids)
    .select("id");

  if (error) {
    return { deleted: 0, error: error.message };
  }

  return { deleted: data?.length ?? 0, error: null };
}

export async function duplicateAnnouncement(
  id: string,
  newSlug: string
): Promise<{ item: PlatformAnnouncement | null; error: string | null }> {
  const existing = await getAnnouncementById(id);
  if (!existing.item) {
    return { item: null, error: "Không tìm thấy thông báo." };
  }

  const source = existing.item;

  return createAnnouncement({
    title: `${source.title} (bản sao)`,
    slug: newSlug,
    excerpt: source.excerpt,
    body: source.body,
    announcement_type: source.announcement_type,
    visibility: source.visibility,
    status: "draft",
    priority: source.priority,
    audience_type: source.audience_type,
    indexable: false,
    follow_links: source.follow_links,
    seo_title: source.seo_title,
    seo_description: source.seo_description,
    canonical_path: null,
    og_title: source.og_title,
    og_description: source.og_description,
    og_image_url: source.og_image_url,
    og_image_media_asset_id: source.og_image_media_asset_id,
    scheduled_at: null,
    expires_at: null
  });
}

export function isAnnouncementPubliclyVisible(item: PlatformAnnouncement) {
  if (item.visibility !== "public" || item.status !== "published") {
    return false;
  }

  if (item.expires_at && new Date(item.expires_at).getTime() <= Date.now()) {
    return false;
  }

  if (!item.scheduled_at) {
    return true;
  }

  return new Date(item.scheduled_at).getTime() <= Date.now();
}
