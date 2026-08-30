import type { AdPlacementRow } from "@/types/ads";

/** Normalize DB row when optional columns are missing (pre-migration). */
export function mapPlacementRow(row: Record<string, unknown>): AdPlacementRow {
  const minContentGap = Number(row.min_content_gap ?? 0);
  return {
    id: String(row.id),
    placement_key: String(row.placement_key),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    surface: String(row.surface),
    page_pattern: (row.page_pattern as string | null) ?? null,
    device: row.device as AdPlacementRow["device"],
    position: (row.position as AdPlacementRow["position"]) ?? inferPosition(String(row.placement_key)),
    ad_format: row.ad_format as AdPlacementRow["ad_format"],
    size_mode: row.size_mode as AdPlacementRow["size_mode"],
    width: row.width != null ? Number(row.width) : null,
    height: row.height != null ? Number(row.height) : null,
    max_width: row.max_width != null ? Number(row.max_width) : null,
    min_height: row.min_height != null ? Number(row.min_height) : null,
    adsense_slot_id: (row.adsense_slot_id as string | null) ?? null,
    adsense_client_id: (row.adsense_client_id as string | null) ?? null,
    is_enabled: Boolean(row.is_enabled),
    is_test_mode: Boolean(row.is_test_mode ?? true),
    priority: Number(row.priority ?? 100),
    max_per_page: Number(row.max_per_page ?? 1),
    min_content_gap: minContentGap,
    max_ads_per_chapter: Number(row.max_ads_per_chapter ?? 2),
    min_paragraphs_before: Number(row.min_paragraphs_before ?? minContentGap),
    min_paragraphs_after: Number(row.min_paragraphs_after ?? 0),
    min_distance_px: Number(row.min_distance_px ?? 800),
    feed_cooldown_items: row.feed_cooldown_items != null ? Number(row.feed_cooldown_items) : null,
    show_label: row.show_label !== false,
    lazy_load: row.lazy_load !== false,
    reserve_space: row.reserve_space !== false,
    sticky_allowed: Boolean(row.sticky_allowed),
    hide_for_vip: Boolean(row.hide_for_vip),
    hide_for_owner: row.hide_for_owner !== false,
    hide_on_sensitive_content: row.hide_on_sensitive_content !== false,
    no_ads_respect: row.no_ads_respect !== false,
    full_width_responsive: row.full_width_responsive !== false,
    fallback_text: (row.fallback_text as string | null) ?? null,
    revenue_eligible: Boolean(row.revenue_eligible),
    attribution_mode: (row.attribution_mode as AdPlacementRow["attribution_mode"]) ?? "platform_only",
    revenue_bucket: (row.revenue_bucket as AdPlacementRow["revenue_bucket"]) ?? "platform_ads",
    frequency_rule: (row.frequency_rule as Record<string, unknown>) ?? {},
    excluded_routes: (row.excluded_routes as string[]) ?? [],
    allowed_roles: (row.allowed_roles as string[]) ?? [],
    notes: (row.notes as string | null) ?? null,
    internal_note: (row.internal_note as string | null) ?? null,
    archived_at: (row.archived_at as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    updated_by: (row.updated_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function inferPosition(key: string): AdPlacementRow["position"] {
  if (key.includes("top")) return "top";
  if (key.includes("mid")) return "mid_content";
  if (key.includes("sidebar") || key.includes("_rail")) return "sidebar";
  if (key.includes("between")) return "between_items";
  if (key.includes("discover") || key.includes("ranking")) return "after_section";
  return "bottom";
}

export function toPlacementPublic(row: AdPlacementRow) {
  return {
    id: row.id,
    placement_key: row.placement_key,
    device: row.device,
    ad_format: row.ad_format,
    size_mode: row.size_mode,
    width: row.width,
    height: row.height,
    max_width: row.max_width,
    min_height: row.min_height,
    adsense_slot_id: row.adsense_slot_id,
    adsense_client_id: row.adsense_client_id,
    is_enabled: row.is_enabled,
    is_test_mode: row.is_test_mode,
    max_per_page: row.max_per_page,
    min_content_gap: row.min_content_gap,
    min_paragraphs_before: row.min_paragraphs_before,
    min_paragraphs_after: row.min_paragraphs_after,
    max_ads_per_chapter: row.max_ads_per_chapter,
    min_distance_px: row.min_distance_px,
    show_label: row.show_label,
    lazy_load: row.lazy_load,
    reserve_space: row.reserve_space,
    hide_for_vip: row.hide_for_vip,
    hide_for_owner: row.hide_for_owner,
    hide_on_sensitive_content: row.hide_on_sensitive_content,
    no_ads_respect: row.no_ads_respect,
    full_width_responsive: row.full_width_responsive,
    fallback_text: row.fallback_text,
    frequency_rule: row.frequency_rule,
    excluded_routes: row.excluded_routes,
    allowed_roles: row.allowed_roles
  };
}
