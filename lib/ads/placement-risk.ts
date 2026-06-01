import { placementWarnings } from "@/lib/ads/admin-placement-warnings";
import type { AdPlacementRow, AdPlacementRiskLevel } from "@/types/ads";

export function getPlacementRiskLevel(
  item: AdPlacementRow,
  allItems: AdPlacementRow[]
): AdPlacementRiskLevel {
  const warnings = placementWarnings(item, allItems);

  if (
    item.is_enabled &&
    !item.is_test_mode &&
    (!item.adsense_client_id?.trim() || !item.adsense_slot_id?.trim())
  ) {
    return "blocked";
  }

  if (warnings.length > 0 || item.sticky_allowed) {
    return "warning";
  }

  return "ok";
}
