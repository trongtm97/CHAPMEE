/** Canonical export/import column order for admin taxonomy catalog. */
export const TAXONOMY_EXPORT_COLUMNS = [
  "type",
  "parent_type",
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
  "sort_order",
  "seo_title",
  "seo_description",
  "seo_h1",
  "seo_intro",
  "seo_indexable",
  "sitemap_priority",
  "sitemap_changefreq",
  "canonical_path",
  "internal_note"
] as const;

export type TaxonomyExportColumn = (typeof TAXONOMY_EXPORT_COLUMNS)[number];

export function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowToCsvLine(values: string[]): string {
  return values.map(escapeCsvCell).join(",");
}
