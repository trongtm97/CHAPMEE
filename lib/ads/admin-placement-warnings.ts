import type { AdPlacementRow } from "@/types/ads";

const SURFACE_DENSITY_THRESHOLD = 2;

export function placementWarnings(
  item: AdPlacementRow,
  allItems: AdPlacementRow[]
): string[] {
  const warnings: string[] = [];

  if (
    item.is_enabled &&
    !item.is_test_mode &&
    (!item.adsense_client_id?.trim() || !item.adsense_slot_id?.trim())
  ) {
    warnings.push("Live nhưng thiếu AdSense client ID hoặc slot ID.");
  }

  if (item.sticky_allowed && item.is_enabled) {
    warnings.push("Sticky được bật — có thể che nội dung đọc.");
  }

  if (item.placement_key.includes("mid_content") && item.min_content_gap < 6) {
    warnings.push("min_content_gap quá thấp — dễ nhồi quảng cáo giữa nội dung đọc.");
  }

  if (
    item.placement_key.includes("mid_content") &&
    item.is_enabled &&
    (item.max_per_page ?? 1) > 2
  ) {
    warnings.push("max_per_page > 2 trên mid-content — có thể ảnh hưởng trải nghiệm đọc.");
  }

  const enabledOnSurface = allItems.filter(
    (row) => row.surface === item.surface && row.is_enabled && row.id !== item.id
  ).length;

  if (item.is_enabled && enabledOnSurface >= SURFACE_DENSITY_THRESHOLD) {
    warnings.push(
      `Surface "${item.surface}" đã có ${enabledOnSurface + 1} placement bật — có thể ảnh hưởng trải nghiệm đọc.`
    );
  }

  return warnings;
}
