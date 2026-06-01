import { createClient } from "@/lib/supabase/server";
import { mapTaxonomyTermRow } from "@/lib/taxonomy/map-row";
import type { TaxonomyTerm, TaxonomyTermTreeNode, TaxonomyType } from "@/types/taxonomy";

export type GetTaxonomyTermsOptions = {
  activeOnly?: boolean;
  publicOnly?: boolean;
  selectableByCreatorOnly?: boolean;
  featuredOnly?: boolean;
  discoverOnly?: boolean;
  seoOnly?: boolean;
  parentId?: string | null;
  includeInternalNote?: boolean;
  orderBy?: "sort_order" | "name" | "usage_count";
  limit?: number;
};

async function buildTermsQuery(
  type: TaxonomyType,
  options?: GetTaxonomyTermsOptions
) {
  const supabase = await createClient();
  let query = supabase
    .from("taxonomy_terms")
    .select("*")
    .eq("type", type);

  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }
  if (options?.publicOnly !== false) {
    query = query.eq("is_public", true);
  }
  if (options?.selectableByCreatorOnly) {
    query = query.eq("is_selectable_by_creator", true);
  }
  if (options?.featuredOnly) {
    query = query.eq("is_featured", true);
  }
  if (options?.discoverOnly) {
    query = query.eq("use_for_discover", true);
  }
  if (options?.seoOnly) {
    query = query.eq("use_for_seo", true);
  }
  if (options?.parentId !== undefined) {
    if (options.parentId === null) {
      query = query.is("parent_id", null);
    } else {
      query = query.eq("parent_id", options.parentId);
    }
  }

  const orderBy = options?.orderBy ?? "sort_order";
  if (orderBy === "usage_count") {
    query = query.order("usage_count", { ascending: false });
  } else if (orderBy === "name") {
    query = query.order("name", { ascending: true });
  } else {
    query = query.order("sort_order", { ascending: true }).order("name", {
      ascending: true
    });
  }

  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  return query;
}

export async function getTaxonomyTerms(
  type: TaxonomyType,
  options?: GetTaxonomyTermsOptions
): Promise<{ data: TaxonomyTerm[]; error: string | null }> {
  const { data, error } = await (await buildTermsQuery(type, options));
  if (error) {
    return { data: [], error: error.message };
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  return {
    data: rows.map((row) =>
      mapTaxonomyTermRow(row, {
        includeInternalNote: options?.includeInternalNote
      })
    ),
    error: null
  };
}

export async function getActiveTaxonomyTerms(type: TaxonomyType) {
  return getTaxonomyTerms(type, { activeOnly: true, publicOnly: true });
}

export async function getSelectableTaxonomyTermsForCreator(type: TaxonomyType) {
  return getTaxonomyTerms(type, {
    activeOnly: true,
    publicOnly: true,
    selectableByCreatorOnly: true
  });
}

export async function getFeaturedTaxonomyTerms(
  type: TaxonomyType,
  options?: { discoverOnly?: boolean; limit?: number }
) {
  return getTaxonomyTerms(type, {
    activeOnly: true,
    publicOnly: true,
    featuredOnly: true,
    discoverOnly: options?.discoverOnly ?? true,
    limit: options?.limit
  });
}

/** Terms ordered by `usage_count` for reader discovery chips and carousels. */
export async function getPopularTaxonomyTerms(
  type: TaxonomyType,
  options?: { discoverOnly?: boolean; limit?: number }
) {
  return getTaxonomyTerms(type, {
    activeOnly: true,
    publicOnly: true,
    discoverOnly: options?.discoverOnly ?? true,
    orderBy: "usage_count",
    limit: options?.limit ?? 20
  });
}

export async function getDiscoverTaxonomyTerms(
  type: TaxonomyType,
  limit = 12
) {
  const featured = await getTaxonomyTerms(type, {
    activeOnly: true,
    publicOnly: true,
    discoverOnly: true,
    featuredOnly: true,
    limit
  });
  if (featured.data.length >= limit) {
    return featured;
  }
  return getTaxonomyTerms(type, {
    activeOnly: true,
    publicOnly: true,
    discoverOnly: true,
    limit
  });
}

export async function getTaxonomyTermBySlug(
  type: TaxonomyType,
  slug: string,
  options?: { publicOnly?: boolean; discoverOnly?: boolean; seoOnly?: boolean }
) {
  const supabase = await createClient();
  let query = supabase
    .from("taxonomy_terms")
    .select("*")
    .eq("type", type)
    .eq("slug", slug.trim())
    .eq("is_active", true);

  if (options?.publicOnly !== false) {
    query = query.eq("is_public", true);
  }
  if (options?.discoverOnly) {
    query = query.eq("use_for_discover", true);
  }
  if (options?.seoOnly) {
    query = query.eq("use_for_seo", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    return { data: null as TaxonomyTerm | null, error: error?.message ?? null };
  }
  return {
    data: mapTaxonomyTermRow(data as Record<string, unknown>),
    error: null
  };
}

export async function getTaxonomyTree(
  type: TaxonomyType,
  options?: Omit<GetTaxonomyTermsOptions, "parentId">
): Promise<{ data: TaxonomyTermTreeNode[]; error: string | null }> {
  const result = await getTaxonomyTerms(type, {
    ...options,
    parentId: undefined
  });
  if (result.error) return { data: [], error: result.error };

  const byId = new Map<string, TaxonomyTermTreeNode>();
  for (const term of result.data) {
    byId.set(term.id, { ...term, children: [] });
  }

  const roots: TaxonomyTermTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return { data: roots, error: null };
}

export async function getTaxonomyTermsByIds(termIds: string[]) {
  if (termIds.length === 0) {
    return { data: [] as TaxonomyTerm[], error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("taxonomy_terms")
    .select("*")
    .in("id", termIds);

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  return {
    data: rows.map((row) => mapTaxonomyTermRow(row)),
    error: null
  };
}
