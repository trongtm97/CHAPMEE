import type { SupabaseClient } from "@supabase/supabase-js";

let extendedSchemaCache: boolean | null = null;

const EXTENDED_COLUMNS = [
  "deleted_at",
  "scheduled_at",
  "robots",
  "og_title",
  "og_description",
  "og_image_url",
  "updated_by",
  "archived_at",
  "view_count"
] as const;

export function isMissingColumnError(message: string | undefined) {
  if (!message) return false;
  return message.includes("does not exist");
}

/** Probe once whether migration 139 columns exist on admin_content_posts. */
export async function hasExtendedContentPostSchema(
  supabase: SupabaseClient
): Promise<boolean> {
  if (extendedSchemaCache !== null) {
    return extendedSchemaCache;
  }

  const { error } = await supabase.from("admin_content_posts").select("deleted_at").limit(1);

  if (error && isMissingColumnError(error.message)) {
    extendedSchemaCache = false;
    return false;
  }

  extendedSchemaCache = true;
  return true;
}

/** Reset cache — useful in tests. */
export function resetContentPostSchemaCache() {
  extendedSchemaCache = null;
}

export function applyActiveContentPostFilter(query: any, extended: boolean) {
  if (extended) {
    return query.is("deleted_at", null);
  }
  return query;
}

/** Sitemap / SEO indexable posts only. */
export function applyPublicContentPostFilters(query: any, extended: boolean) {
  query = query.eq("status", "published").eq("indexable", true);

  if (extended) {
    const now = new Date().toISOString();
    query = query.is("deleted_at", null).or(`scheduled_at.is.null,scheduled_at.lte.${now}`);
  }

  return query;
}

/** In-app public listing — published posts visible in app regardless of indexable. */
export function applyPublicAppContentPostFilters(query: any, extended: boolean) {
  query = query.eq("status", "published").neq("post_type", "policy");

  if (extended) {
    const now = new Date().toISOString();
    query = query
      .is("deleted_at", null)
      .or(`scheduled_at.is.null,scheduled_at.lte.${now}`);
  }

  return query;
}

export function applyContentPostSort(query: any, sort: string | undefined, extended: boolean) {
  if (sort === "published") {
    return query
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
  }
  if (sort === "created") {
    return query.order("created_at", { ascending: false });
  }
  if (sort === "views" && extended) {
    return query.order("view_count", { ascending: false }).order("updated_at", { ascending: false });
  }
  if (sort === "title") {
    return query.order("title", { ascending: true });
  }
  if (sort === "updated") {
    return query.order("updated_at", { ascending: false });
  }
  return query.order("updated_at", { ascending: false });
}

export function buildContentPostInsertPayload(
  input: Record<string, unknown>,
  extended: boolean
) {
  const base = {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt ?? null,
    content: input.content ?? null,
    cover_image_url: input.cover_image_url ?? null,
    category: input.category ?? null,
    tags: input.tags ?? [],
    post_type: input.post_type ?? "article",
    status: input.status ?? "draft",
    seo_title: input.seo_title ?? null,
    seo_description: input.seo_description ?? null,
    canonical_url: input.canonical_url ?? null,
    indexable: input.indexable ?? true,
    author_admin_id: input.author_admin_id ?? null,
    published_at: input.published_at ?? null
  };

  if (!extended) {
    const status = base.status === "scheduled" ? "draft" : base.status;
    return { ...base, status };
  }

  return {
    ...base,
    robots: input.robots ?? "index,follow",
    og_title: input.og_title ?? null,
    og_description: input.og_description ?? null,
    og_image_url: input.og_image_url ?? null,
    updated_by: input.updated_by ?? null,
    scheduled_at: input.scheduled_at ?? null,
    archived_at: input.archived_at ?? null
  };
}

export function buildContentPostUpdatePayload(
  input: Record<string, unknown>,
  extended: boolean
) {
  const patch = { ...input };

  if (!extended) {
    for (const key of EXTENDED_COLUMNS) {
      delete patch[key];
    }
    if (patch.status === "scheduled") {
      patch.status = "draft";
    }
  }

  return patch;
}

export function buildSoftDeletePayload(extended: boolean) {
  if (extended) {
    const now = new Date().toISOString();
    return { deleted_at: now, status: "archived", archived_at: now };
  }
  return { status: "archived" };
}
