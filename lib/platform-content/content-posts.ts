import { createClient } from "@/lib/supabase/server";
import { generateNumericPublicCode } from "@/lib/urls/public-code";
import { getContentPostUrl } from "@/lib/urls/paths";
import {
  applyActiveContentPostFilter,
  applyContentPostSort,
  applyPublicAppContentPostFilters,
  buildContentPostInsertPayload,
  buildContentPostUpdatePayload,
  buildSoftDeletePayload,
  hasExtendedContentPostSchema
} from "@/lib/content-posts/schema-capabilities";
import {
  getContentPostSeoIssues,
  getContentPostSeoScore
} from "@/lib/content-posts/seo-validation";
import type { ContentPostListFilters } from "@/lib/platform-content/parse-post-filters";
import type {
  AdminContentPost,
  ContentPostRobots,
  ContentPostStatus,
  CreateContentPostInput,
  ListContentPostsOptions,
  UpdateContentPostInput
} from "@/types/platform-content";

export type ContentPostStats = {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
  seoIssues: number;
  noindex: number;
  views30d: number;
};

function mapContentPost(row: Record<string, unknown>): AdminContentPost {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    public_code: row.public_code ? String(row.public_code) : null,
    excerpt: row.excerpt ? String(row.excerpt) : null,
    content: row.content ? String(row.content) : null,
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    category: row.category ? String(row.category) : null,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    post_type: row.post_type as AdminContentPost["post_type"],
    status: row.status as AdminContentPost["status"],
    seo_title: row.seo_title ? String(row.seo_title) : null,
    seo_description: row.seo_description ? String(row.seo_description) : null,
    canonical_url: row.canonical_url ? String(row.canonical_url) : null,
    indexable: Boolean(row.indexable),
    robots: (row.robots as ContentPostRobots) ?? "index,follow",
    og_title: row.og_title ? String(row.og_title) : null,
    og_description: row.og_description ? String(row.og_description) : null,
    og_image_url: row.og_image_url ? String(row.og_image_url) : null,
    author_admin_id: row.author_admin_id ? String(row.author_admin_id) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null,
    published_at: row.published_at ? String(row.published_at) : null,
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : null,
    archived_at: row.archived_at ? String(row.archived_at) : null,
    deleted_at: row.deleted_at ? String(row.deleted_at) : null,
    view_count: Number(row.view_count ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function toSeoCheckInput(item: AdminContentPost) {
  return {
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt ?? "",
    content: item.content ?? "",
    postType: item.post_type,
    coverImageUrl: item.cover_image_url ?? "",
    seoTitle: item.seo_title ?? "",
    seoDescription: item.seo_description ?? "",
    canonicalUrl: item.canonical_url ?? "",
    indexable: item.indexable
  };
}

type ListInput = ListContentPostsOptions | ContentPostListFilters;

function applyDateRange(query: any, range: ContentPostListFilters["dateRange"]) {
  if (range === "all") return query;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  return query.gte("updated_at", since);
}

function applyAdminFilters(query: any, options: ContentPostListFilters, extended: boolean) {
  query = applyActiveContentPostFilter(query, extended);

  if (options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options.postType !== "all") {
    query = query.eq("post_type", options.postType);
  }
  if (options.indexFilter === "index") {
    query = query.eq("indexable", true);
  } else if (options.indexFilter === "noindex") {
    query = query.eq("indexable", false);
  }

  query = applyDateRange(query, options.dateRange);

  const search = options.search?.trim();
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,slug.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`
    );
  }

  return query;
}

function applySeoClientFilter(items: AdminContentPost[], seo: ContentPostListFilters["seoFilter"]) {
  if (seo === "all") return items;

  return items.filter((item) => {
    const issues = getContentPostSeoIssues(toSeoCheckInput(item));
    const score = getContentPostSeoScore(toSeoCheckInput(item));

    if (seo === "good") return score >= 85;
    if (seo === "missing_title") return issues.includes("missing_seo_title");
    if (seo === "missing_description") return issues.includes("missing_seo_description");
    if (seo === "invalid_slug") return issues.includes("invalid_slug");
    if (seo === "heading_error") return issues.includes("content_has_h1");
    if (seo === "canonical_error") return issues.includes("invalid_canonical");
    if (seo === "has_issue") return issues.length > 0;
    return true;
  });
}

function sortBySeoScore(items: AdminContentPost[]) {
  return [...items].sort(
    (a, b) => getContentPostSeoScore(toSeoCheckInput(b)) - getContentPostSeoScore(toSeoCheckInput(a))
  );
}

export async function listContentPosts(
  options: ListInput = {}
): Promise<{ items: AdminContentPost[]; total: number; error: string | null }> {
  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);
  const isAdminFilters = "indexFilter" in options && "page" in options;
  const adminFilters = isAdminFilters ? (options as ContentPostListFilters) : null;
  const isPublicPaginated = "publicOnly" in options && options.publicOnly && "page" in options;
  const legacyOptions = options as ListContentPostsOptions;
  const limit =
    isAdminFilters && adminFilters
      ? adminFilters.pageSize
      : isPublicPaginated
        ? ((options as ListContentPostsOptions & { page?: number; pageSize?: number }).pageSize ?? 25)
        : (legacyOptions.limit ?? 50);
  const offset =
    isAdminFilters && adminFilters
      ? (adminFilters.page - 1) * adminFilters.pageSize
      : isPublicPaginated
        ? (((options as ListContentPostsOptions & { page?: number; pageSize?: number }).page ?? 1) - 1) * limit
        : (legacyOptions.offset ?? 0);

  const seoFilter = adminFilters && adminFilters.seoFilter !== "all" ? adminFilters.seoFilter : null;
  const needsClientSeo = Boolean(seoFilter) || adminFilters?.sort === "seo_score";

  let query = supabase.from("admin_content_posts").select("*", { count: "exact" });

  if ("publicOnly" in options && options.publicOnly) {
    query = applyPublicAppContentPostFilters(query, extended);
    if (options.postType) {
      query = query.eq("post_type", options.postType);
    }
    if (options.category) {
      query = query.eq("category", options.category);
    }
  } else if (isAdminFilters && adminFilters) {
    query = applyAdminFilters(query, adminFilters, extended);
  } else {
    query = applyActiveContentPostFilter(query, extended);
    if ("status" in options && options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      query = query.in("status", statuses);
    }
  }

  if (!isAdminFilters && options.search?.trim()) {
    const term = options.search.trim();
    query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,excerpt.ilike.%${term}%`);
  }

  query = applyContentPostSort(
    query,
    isAdminFilters && adminFilters
      ? adminFilters.sort === "seo_score"
        ? "updated"
        : adminFilters.sort
      : isPublicPaginated
        ? (legacyOptions as ListContentPostsOptions & { sort?: string }).sort ?? "published"
        : undefined,
    extended
  );

  if (needsClientSeo && isAdminFilters) {
    const { data, error } = await query.range(0, 4999);
    if (error) return { items: [], total: 0, error: error.message };

    let items = (data ?? []).map((row) => mapContentPost(row as Record<string, unknown>));
    if (seoFilter) items = applySeoClientFilter(items, seoFilter);
    if (adminFilters?.sort === "seo_score") items = sortBySeoScore(items);

    return {
      items: items.slice(offset, offset + limit),
      total: items.length,
      error: null
    };
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) return { items: [], total: 0, error: error.message };

  return {
    items: (data ?? []).map((row) => mapContentPost(row as Record<string, unknown>)),
    total: count ?? 0,
    error: null
  };
}

export async function getContentPostStats(): Promise<{
  stats: ContentPostStats;
  error: string | null;
}> {
  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);

  let query = supabase.from("admin_content_posts").select("*");
  query = applyActiveContentPostFilter(query, extended);

  const { data, error } = await query;

  if (error) {
    return {
      stats: {
        total: 0,
        published: 0,
        draft: 0,
        scheduled: 0,
        seoIssues: 0,
        noindex: 0,
        views30d: 0
      },
      error: error.message
    };
  }

  const items = (data ?? []).map((row) => mapContentPost(row as Record<string, unknown>));
  const since30d = Date.now() - 30 * 86_400_000;

  return {
    stats: {
      total: items.length,
      published: items.filter((i) => i.status === "published").length,
      draft: items.filter((i) => i.status === "draft").length,
      scheduled: items.filter((i) => i.status === "scheduled").length,
      seoIssues: items.filter((i) => getContentPostSeoIssues(toSeoCheckInput(i)).length > 0).length,
      noindex: items.filter((i) => !i.indexable).length,
      views30d: items.reduce((sum, i) => {
        const updated = new Date(i.updated_at).getTime();
        return updated >= since30d ? sum + i.view_count : sum;
      }, 0)
    },
    error: null
  };
}

export async function listContentPostIdsByFilters(
  filters: ContentPostListFilters
): Promise<{ ids: string[]; error: string | null }> {
  const result = await listContentPosts({ ...filters, page: 1, pageSize: 5000 });
  if (result.error) return { ids: [], error: result.error };
  return { ids: result.items.map((item) => item.id), error: null };
}

export async function getContentPostById(
  id: string
): Promise<{ item: AdminContentPost | null; error: string | null }> {
  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);

  let query = supabase.from("admin_content_posts").select("*").eq("id", id);
  query = applyActiveContentPostFilter(query, extended);

  const { data, error } = await query.maybeSingle();
  if (error) return { item: null, error: error.message };
  return { item: data ? mapContentPost(data as Record<string, unknown>) : null, error: null };
}

export async function isContentPostSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);

  let query = supabase.from("admin_content_posts").select("id").eq("slug", slug);
  query = applyActiveContentPostFilter(query, extended);

  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.maybeSingle();
  if (error) return false;
  return Boolean(data);
}

export async function getContentPostBySlug(
  slug: string,
  options: { publicOnly?: boolean } = {}
): Promise<{ item: AdminContentPost | null; error: string | null }> {
  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);

  let query = supabase.from("admin_content_posts").select("*").eq("slug", slug);
  if (!options.publicOnly) {
    query = applyActiveContentPostFilter(query, extended);
  } else {
    query = applyPublicAppContentPostFilters(query, extended);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { item: null, error: error.message };
  return { item: data ? mapContentPost(data as Record<string, unknown>) : null, error: null };
}

export async function getContentPostByPublicCode(
  publicCode: string,
  options: { publicOnly?: boolean } = {}
): Promise<{ item: AdminContentPost | null; error: string | null }> {
  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);

  let query = supabase
    .from("admin_content_posts")
    .select("*")
    .eq("public_code", publicCode);
  if (!options.publicOnly) {
    query = applyActiveContentPostFilter(query, extended);
  } else {
    query = applyPublicAppContentPostFilters(query, extended);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { item: null, error: error.message };
  return { item: data ? mapContentPost(data as Record<string, unknown>) : null, error: null };
}

export async function createContentPost(
  input: CreateContentPostInput
): Promise<{ item: AdminContentPost | null; error: string | null }> {
  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);
  const now = new Date().toISOString();
  const status = input.status ?? "draft";
  const publishedAt = input.published_at ?? (status === "published" ? now : null);

  const publicCode = await generateNumericPublicCode(supabase, "content_post");
  const payload = {
    ...buildContentPostInsertPayload({ ...input, published_at: publishedAt }, extended),
    public_code: publicCode,
    canonical_path: getContentPostUrl({
      slug: input.slug,
      public_code: publicCode
    })
  } as Record<string, unknown>;

  const { data, error } = await supabase
    .from("admin_content_posts")
    .insert(payload)
    .select("*")
    .single();

  if (error) return { item: null, error: error.message };
  return { item: mapContentPost(data as Record<string, unknown>), error: null };
}

export async function updateContentPost(
  id: string,
  input: UpdateContentPostInput
): Promise<{ item: AdminContentPost | null; error: string | null }> {
  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);
  const patch: Record<string, unknown> = { ...input };

  if (input.status === "published" && input.published_at === undefined) {
    const { data: existing } = await supabase
      .from("admin_content_posts")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();
    if (!existing?.published_at) patch.published_at = new Date().toISOString();
  }

  if (extended && input.status === "archived" && input.archived_at === undefined) {
    patch.archived_at = new Date().toISOString();
  }

  const safePatch = buildContentPostUpdatePayload(patch, extended);

  let query = supabase.from("admin_content_posts").update(safePatch).eq("id", id);
  query = applyActiveContentPostFilter(query, extended);

  const { data, error } = await query.select("*").single();
  if (error) return { item: null, error: error.message };
  return { item: mapContentPost(data as Record<string, unknown>), error: null };
}

export async function updateContentPostStatus(
  id: string,
  status: ContentPostStatus
): Promise<{ item: AdminContentPost | null; error: string | null }> {
  return updateContentPost(id, {
    status,
    ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
    ...(status === "archived" ? { archived_at: new Date().toISOString() } : {})
  });
}

export async function softDeleteContentPost(id: string): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);
  const { error } = await supabase
    .from("admin_content_posts")
    .update(buildSoftDeletePayload(extended))
    .eq("id", id);
  return { ok: !error, error: error?.message ?? null };
}

export async function bulkUpdateContentPosts(
  ids: string[],
  patch: UpdateContentPostInput
): Promise<{ updated: number; error: string | null }> {
  if (ids.length === 0) return { updated: 0, error: null };

  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);
  const safePatch = buildContentPostUpdatePayload({ ...patch }, extended);

  let query = supabase.from("admin_content_posts").update(safePatch).in("id", ids);
  query = applyActiveContentPostFilter(query, extended);

  const { data, error } = await query.select("id");
  if (error) return { updated: 0, error: error.message };
  return { updated: data?.length ?? 0, error: null };
}

export async function bulkSoftDeleteContentPosts(
  ids: string[]
): Promise<{ deleted: number; error: string | null }> {
  if (ids.length === 0) return { deleted: 0, error: null };

  const supabase = await createClient();
  const extended = await hasExtendedContentPostSchema(supabase);

  let query = supabase
    .from("admin_content_posts")
    .update(buildSoftDeletePayload(extended))
    .in("id", ids);
  query = applyActiveContentPostFilter(query, extended);

  const { data, error } = await query.select("id");
  if (error) return { deleted: 0, error: error.message };
  return { deleted: data?.length ?? 0, error: null };
}

export async function duplicateContentPost(
  id: string,
  newSlug: string
): Promise<{ item: AdminContentPost | null; error: string | null }> {
  const existing = await getContentPostById(id);
  if (!existing.item) return { item: null, error: "Không tìm thấy bài viết." };
  const source = existing.item;

  return createContentPost({
    title: `${source.title} (bản sao)`,
    slug: newSlug,
    excerpt: source.excerpt,
    content: source.content,
    cover_image_url: source.cover_image_url,
    category: source.category,
    tags: source.tags,
    post_type: source.post_type,
    status: "draft",
    indexable: false,
    robots: "noindex,follow",
    seo_title: source.seo_title,
    seo_description: source.seo_description,
    og_title: source.og_title,
    og_description: source.og_description
  });
}

export function isContentPostPubliclyVisible(item: AdminContentPost) {
  if (item.deleted_at || item.status !== "published" || item.post_type === "policy") {
    return false;
  }
  if (item.scheduled_at && new Date(item.scheduled_at).getTime() > Date.now()) {
    return false;
  }
  if (item.published_at && new Date(item.published_at).getTime() > Date.now()) {
    return false;
  }
  return true;
}
