import type {
  StoryFormatTemplateRow,
  StoryPresentationSettingsRow,
  TaxonomyRequestRow,
  TaxonomyTerm,
  TaxonomyTermRow,
  TaxonomyType
} from "@/types/taxonomy";
import { TAXONOMY_TYPES } from "@/types/taxonomy";

function parseAliases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function mapTaxonomyTermRow(
  row: Record<string, unknown>,
  options?: { includeInternalNote?: boolean }
): TaxonomyTerm | TaxonomyTermRow {
  const base = {
    id: String(row.id),
    type: String(row.type) as TaxonomyType,
    parent_id: (row.parent_id as string | null) ?? null,
    name: String(row.name),
    slug: String(row.slug),
    description: (row.description as string | null) ?? null,
    icon: (row.icon as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    display_label: (row.display_label as string | null) ?? null,
    aliases: parseAliases(row.aliases),
    is_active: Boolean(row.is_active),
    is_public: Boolean(row.is_public),
    is_selectable_by_creator: Boolean(row.is_selectable_by_creator),
    is_featured: Boolean(row.is_featured),
    use_for_seo: Boolean(row.use_for_seo),
    use_for_discover: Boolean(row.use_for_discover),
    use_for_ranking: Boolean(row.use_for_ranking),
    use_for_moderation: Boolean(row.use_for_moderation),
    seo_title: (row.seo_title as string | null) ?? null,
    seo_description: (row.seo_description as string | null) ?? null,
    seo_h1: (row.seo_h1 as string | null) ?? null,
    seo_intro: (row.seo_intro as string | null) ?? null,
    canonical_path: (row.canonical_path as string | null) ?? null,
    seo_indexable: row.seo_indexable !== undefined ? Boolean(row.seo_indexable) : true,
    sitemap_priority:
      row.sitemap_priority != null && row.sitemap_priority !== ""
        ? Number(row.sitemap_priority)
        : null,
    sitemap_changefreq: (row.sitemap_changefreq as string | null) ?? null,
    og_image_url: (row.og_image_url as string | null) ?? null,
    use_for_pinterest_feed: Boolean(row.use_for_pinterest_feed ?? false),
    min_stories_override:
      row.min_stories_override != null && row.min_stories_override !== ""
        ? Number(row.min_stories_override)
        : null,
    sort_order: Number(row.sort_order ?? 0),
    usage_count: Number(row.usage_count ?? 0),
    created_by: (row.created_by as string | null) ?? null,
    updated_by: (row.updated_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };

  if (options?.includeInternalNote) {
    return {
      ...base,
      internal_note: (row.internal_note as string | null) ?? null
    };
  }

  return base;
}

export function mapTaxonomyRequestRow(
  row: Record<string, unknown>
): TaxonomyRequestRow {
  return {
    id: String(row.id),
    requested_by: String(row.requested_by),
    type: String(row.type) as TaxonomyType,
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    example_usage: (row.example_usage as string | null) ?? null,
    related_existing_term_id:
      (row.related_existing_term_id as string | null) ?? null,
    status: row.status as TaxonomyRequestRow["status"],
    admin_note: (row.admin_note as string | null) ?? null,
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export function mapPresentationSettingsRow(
  row: Record<string, unknown>
): StoryPresentationSettingsRow {
  return {
    id: String(row.id),
    story_id: String(row.story_id),
    mode: String(row.mode),
    template_id: (row.template_id as string | null) ?? null,
    settings_json:
      row.settings_json && typeof row.settings_json === "object"
        ? (row.settings_json as Record<string, unknown>)
        : {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export function mapFormatTemplateRow(
  row: Record<string, unknown>
): StoryFormatTemplateRow {
  return {
    id: String(row.id),
    mode: String(row.mode),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    schema_json:
      row.schema_json && typeof row.schema_json === "object"
        ? (row.schema_json as Record<string, unknown>)
        : {},
    example_json:
      row.example_json && typeof row.example_json === "object"
        ? (row.example_json as Record<string, unknown>)
        : {},
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export function groupTermsByType(
  terms: TaxonomyTerm[]
): Partial<Record<TaxonomyType, TaxonomyTerm[]>> {
  const grouped: Partial<Record<TaxonomyType, TaxonomyTerm[]>> = {};
  for (const type of TAXONOMY_TYPES) {
    const list = terms.filter((term) => term.type === type);
    if (list.length > 0) grouped[type] = list;
  }
  return grouped;
}
