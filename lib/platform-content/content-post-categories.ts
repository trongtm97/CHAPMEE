import { createClient } from "@/lib/data/server";
import { applyPublicAppContentPostFilters, hasExtendedContentPostSchema } from "@/lib/content-posts/schema-capabilities";
import { enrichContentPostsCoverDisplay } from "@/lib/platform-content/enrich-content-post-media";
import type {
  AdminContentPost,
  ContentPostCategory,
  ContentPostCategoryStatus,
  CreateContentPostCategoryInput,
  UpdateContentPostCategoryInput
} from "@/types/platform-content";

function mapCategory(row: Record<string, unknown>): ContentPostCategory {
  return {
    id: String(row.id),
    parent_id: row.parent_id ? String(row.parent_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    description: row.description ? String(row.description) : null,
    sort_order: Number(row.sort_order ?? 0),
    status: (row.status as ContentPostCategoryStatus) ?? "active",
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    cover_media_asset_id: row.cover_media_asset_id ? String(row.cover_media_asset_id) : null,
    seo_title: row.seo_title ? String(row.seo_title) : null,
    seo_description: row.seo_description ? String(row.seo_description) : null,
    canonical_url: row.canonical_url ? String(row.canonical_url) : null,
    indexable: row.indexable === undefined ? true : Boolean(row.indexable),
    robots: (row.robots as ContentPostCategory["robots"]) ?? "index,follow",
    og_title: row.og_title ? String(row.og_title) : null,
    og_description: row.og_description ? String(row.og_description) : null,
    og_image_url: row.og_image_url ? String(row.og_image_url) : null,
    og_image_media_asset_id: row.og_image_media_asset_id ? String(row.og_image_media_asset_id) : null,
    public_code: String(row.public_code),
    created_by: row.created_by ? String(row.created_by) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    deleted_at: row.deleted_at ? String(row.deleted_at) : null
  };
}

export async function listContentPostCategories(options: {
  includeHidden?: boolean;
  includeDeleted?: boolean;
} = {}): Promise<{ items: ContentPostCategory[]; error: string | null }> {
  const db = await createClient();
  let query = db.from("content_post_categories").select("*");

  if (!options.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (!options.includeHidden) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return { items: [], error: error.message };
  return { items: (data ?? []).map((row) => mapCategory(row as Record<string, unknown>)), error: null };
}

export async function getContentPostCategoryById(
  id: string
): Promise<{ item: ContentPostCategory | null; error: string | null }> {
  const db = await createClient();
  const { data, error } = await db
    .from("content_post_categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { item: null, error: error.message };
  return { item: data ? mapCategory(data as Record<string, unknown>) : null, error: null };
}

export async function getContentPostCategoryBySlug(
  slug: string,
  options: { publicOnly?: boolean } = {}
): Promise<{ item: ContentPostCategory | null; error: string | null }> {
  const db = await createClient();
  let query = db.from("content_post_categories").select("*").eq("slug", slug);

  if (options.publicOnly) {
    query = query.is("deleted_at", null).eq("status", "active");
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { item: null, error: error.message };
  return { item: data ? mapCategory(data as Record<string, unknown>) : null, error: null };
}

export async function createContentPostCategory(
  input: CreateContentPostCategoryInput
): Promise<{ item: ContentPostCategory | null; error: string | null }> {
  const db = await createClient();
  const payload: Record<string, unknown> = {
    parent_id: input.parent_id ?? null,
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    sort_order: input.sort_order ?? 0,
    status: input.status ?? "active",
    cover_image_url: input.cover_image_url ?? null,
    cover_media_asset_id: input.cover_media_asset_id ?? null,
    seo_title: input.seo_title ?? null,
    seo_description: input.seo_description ?? null,
    canonical_url: input.canonical_url ?? null,
    indexable: input.indexable ?? true,
    robots: input.robots ?? ((input.indexable ?? true) ? "index,follow" : "noindex,follow"),
    og_title: input.og_title ?? null,
    og_description: input.og_description ?? null,
    og_image_url: input.og_image_url ?? null,
    og_image_media_asset_id: input.og_image_media_asset_id ?? null,
    created_by: input.created_by ?? null,
    updated_by: input.updated_by ?? null
  };

  const { data, error } = await db.from("content_post_categories").insert(payload).select("*").single();
  if (error) return { item: null, error: error.message };
  return { item: mapCategory(data as Record<string, unknown>), error: null };
}

export async function updateContentPostCategory(
  id: string,
  input: UpdateContentPostCategoryInput
): Promise<{ item: ContentPostCategory | null; error: string | null }> {
  const db = await createClient();
  const patch: Record<string, unknown> = { ...input };
  if (patch.name !== undefined) patch.name = String(patch.name).trim();
  if (patch.slug !== undefined) patch.slug = String(patch.slug).trim();

  const { data, error } = await db.from("content_post_categories").update(patch).eq("id", id).select("*").single();
  if (error) return { item: null, error: error.message };
  return { item: mapCategory(data as Record<string, unknown>), error: null };
}

export async function softDeleteContentPostCategory(
  id: string,
  updatedBy?: string | null
): Promise<{ ok: boolean; error: string | null }> {
  const db = await createClient();
  const now = new Date().toISOString();
  const { error } = await db
    .from("content_post_categories")
    .update({ deleted_at: now, status: "hidden", updated_by: updatedBy ?? null })
    .eq("id", id);
  return { ok: !error, error: error?.message ?? null };
}

export async function getCategoryIdsForPost(postId: string): Promise<{ ids: string[]; error: string | null }> {
  const db = await createClient();
  const { data, error } = await db
    .from("content_post_category_links")
    .select("category_id")
    .eq("post_id", postId);
  if (error) return { ids: [], error: error.message };
  return {
    ids: (data ?? []).map((row) => String((row as any).category_id)),
    error: null
  };
}

export async function setCategoriesForPost(
  postId: string,
  categoryIds: string[]
): Promise<{ ok: boolean; error: string | null }> {
  const db = await createClient();

  const { error: deleteError } = await db.from("content_post_category_links").delete().eq("post_id", postId);
  if (deleteError) return { ok: false, error: deleteError.message };

  const ids = categoryIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return { ok: true, error: null };

  const { error: insertError } = await db.from("content_post_category_links").insert(
    ids.map((category_id) => ({
      post_id: postId,
      category_id
    }))
  );
  if (insertError) return { ok: false, error: insertError.message };

  return { ok: true, error: null };
}

export async function listContentPostCategoriesByIds(
  ids: string[],
  options: { publicOnly?: boolean } = {}
): Promise<{ items: ContentPostCategory[]; error: string | null }> {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) return { items: [], error: null };
  const db = await createClient();
  let query = db.from("content_post_categories").select("*").in("id", unique);
  if (options.publicOnly) {
    query = query.is("deleted_at", null).eq("status", "active");
  }
  const { data, error } = await query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return { items: [], error: error.message };
  return { items: (data ?? []).map((row) => mapCategory(row as Record<string, unknown>)), error: null };
}

export async function listCategoriesForPost(
  postId: string,
  options: { publicOnly?: boolean } = {}
): Promise<{ items: ContentPostCategory[]; error: string | null }> {
  const idsResult = await getCategoryIdsForPost(postId);
  if (idsResult.error) return { items: [], error: idsResult.error };
  return listContentPostCategoriesByIds(idsResult.ids, options);
}

export async function listPublicPostsByCategorySlug(input: {
  slug: string;
  page: number;
  pageSize: number;
  sort?: "published" | "views" | "updated";
  q?: string;
}): Promise<{ category: ContentPostCategory | null; items: AdminContentPost[]; total: number; error: string | null }> {
  const { item: category, error: catError } = await getContentPostCategoryBySlug(input.slug, { publicOnly: true });
  if (catError) return { category: null, items: [], total: 0, error: catError };
  if (!category) return { category: null, items: [], total: 0, error: null };

  const db = await createClient();
  const offset = (Math.max(1, input.page) - 1) * input.pageSize;

  const { data: linkRows, error: linksError } = await db
    .from("content_post_category_links")
    .select("post_id")
    .eq("category_id", category.id);
  if (linksError) return { category, items: [], total: 0, error: linksError.message };

  const postIds = (linkRows ?? []).map((row) => String((row as any).post_id));
  if (postIds.length === 0) return { category, items: [], total: 0, error: null };

  const extended = await hasExtendedContentPostSchema(db);
  let query = db.from("admin_content_posts").select("*", { count: "exact" }).in("id", postIds);
  query = applyPublicAppContentPostFilters(query, extended);

  const q = input.q?.trim();
  if (q) {
    query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%,excerpt.ilike.%${q}%`);
  }

  const sort = input.sort ?? "published";
  if (sort === "published") {
    query = query.order("published_at", { ascending: false, nullsFirst: false }).order("updated_at", { ascending: false });
  } else if (sort === "views" && extended) {
    query = query.order("view_count", { ascending: false }).order("updated_at", { ascending: false });
  } else if (sort === "updated") {
    query = query.order("updated_at", { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + input.pageSize - 1);
  if (error) return { category, items: [], total: 0, error: error.message };

  return {
    category,
    items: await enrichContentPostsCoverDisplay((data ?? []) as any),
    total: count ?? 0,
    error: null
  };
}

