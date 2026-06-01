import { createClient } from "@/lib/supabase/server";
import {
  getDefaultSeoRule,
  normalizePathname,
  patternMatchesRoute,
  shouldNoIndexPath
} from "@/lib/seo/noindex";
import type { SeoRule } from "@/types/platform-content";

export async function listSeoRulesFromDb(): Promise<{
  items: SeoRule[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_rules")
      .select("*")
      .order("route_pattern", { ascending: true });

    if (error) {
      return { items: [], error: error.message };
    }

    return {
      items: (data ?? []).map((row) => mapSeoRule(row as Record<string, unknown>)),
      error: null
    };
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : "Không thể tải SEO rules."
    };
  }
}

export async function getSeoRuleForRoute(pathname: string): Promise<SeoRule | null> {
  const normalized = normalizePathname(pathname);

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("seo_rules").select("*");

    if (data?.length) {
      const rules = data.map((row) => mapSeoRule(row as Record<string, unknown>));
      const matched = rules
        .filter((rule) => patternMatchesRoute(rule.route_pattern, normalized))
        .sort((a, b) => b.route_pattern.length - a.route_pattern.length);

      if (matched[0]) {
        return matched[0];
      }
    }
  } catch {
    // Fall back to in-memory defaults when DB unavailable (build/SSR).
  }

  const fallback = getDefaultSeoRule(normalized);
  if (!fallback) {
    return null;
  }

  return {
    id: "default",
    route_pattern: fallback.pattern,
    page_type: fallback.pageType,
    indexable: fallback.indexable,
    follow_links: fallback.followLinks,
    include_sitemap: fallback.indexable,
    title_template: null,
    description_template: null,
    canonical_mode: "self",
    custom_canonical_url: null,
    priority: 0.5,
    change_frequency: "weekly",
    is_active: true,
    notes: "Default in-memory SEO rule",
    updated_by: null,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  };
}

export function resolveRouteIndexable(input: {
  pathname: string;
  search?: string | URLSearchParams | null;
  contentStatus?: string | null;
  indexableOverride?: boolean | null;
  rule?: SeoRule | null;
}) {
  const indexable =
    input.indexableOverride ??
    (input.rule
      ? input.rule.indexable
      : !shouldNoIndexPath({
          pathname: input.pathname,
          search: input.search,
          contentStatus: input.contentStatus
        }));

  const follow = input.rule ? input.rule.follow_links : indexable;
  return { indexable, follow };
}

export function computeSeoRuleStats(rules: SeoRule[]) {
  const active = rules.filter((rule) => rule.is_active !== false);
  const indexableRules = active.filter((rule) => rule.indexable).length;
  const followRules = active.filter((rule) => rule.follow_links).length;
  const sitemapIncluded = active.filter((rule) => rule.indexable && rule.include_sitemap !== false).length;

  return {
    totalRules: active.length,
    indexableRules,
    noindexRules: active.length - indexableRules,
    followRules,
    nofollowRules: active.length - followRules,
    sitemapIncluded,
    sitemapExcluded: active.length - sitemapIncluded
  };
}

export async function bulkUpdateSeoRulesInDb(
  ids: string[],
  patch: Partial<
    Pick<
      SeoRule,
      | "indexable"
      | "follow_links"
      | "include_sitemap"
      | "is_active"
    >
  >
): Promise<{ updated: number; error: string | null }> {
  if (ids.length === 0) return { updated: 0, error: null };

  try {
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("seo_rules")
      .update(patch)
      .in("id", ids);

    if (error) return { updated: 0, error: error.message };
    return { updated: count ?? ids.length, error: null };
  } catch (error) {
    return {
      updated: 0,
      error: error instanceof Error ? error.message : "Bulk update thất bại."
    };
  }
}

export async function getSeoRuleById(id: string): Promise<{
  item: SeoRule | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_rules")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { item: null, error: error.message };
    }

    return {
      item: data ? mapSeoRule(data as Record<string, unknown>) : null,
      error: null
    };
  } catch (error) {
    return {
      item: null,
      error: error instanceof Error ? error.message : "Không thể tải SEO rule."
    };
  }
}

export async function updateSeoRuleInDb(
  id: string,
  input: Partial<
    Pick<
      SeoRule,
      | "route_pattern"
      | "page_type"
      | "indexable"
      | "follow_links"
      | "include_sitemap"
      | "title_template"
      | "description_template"
      | "canonical_mode"
      | "custom_canonical_url"
      | "priority"
      | "change_frequency"
      | "is_active"
      | "notes"
      | "updated_by"
    >
  >
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("seo_rules").update(input).eq("id", id);
    return { error: error?.message ?? null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể cập nhật SEO rule."
    };
  }
}

export { getDefaultSeoRule, normalizePathname, patternMatchesRoute };

function mapSeoRule(row: Record<string, unknown>): SeoRule {
  return {
    id: String(row.id),
    route_pattern: String(row.route_pattern),
    page_type: String(row.page_type),
    indexable: Boolean(row.indexable),
    follow_links: Boolean(row.follow_links),
    include_sitemap: row.include_sitemap === undefined ? Boolean(row.indexable) : Boolean(row.include_sitemap),
    title_template: row.title_template ? String(row.title_template) : null,
    description_template: row.description_template
      ? String(row.description_template)
      : null,
    canonical_mode: row.canonical_mode as SeoRule["canonical_mode"],
    custom_canonical_url: row.custom_canonical_url
      ? String(row.custom_canonical_url)
      : null,
    priority: Number(row.priority ?? 0.5),
    change_frequency: row.change_frequency ? String(row.change_frequency) : "weekly",
    is_active: row.is_active === undefined ? true : Boolean(row.is_active),
    notes: row.notes ? String(row.notes) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}
