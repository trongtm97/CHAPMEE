import type { AdPlacementListFilters, AdDevice, AdFormat } from "@/types/ads";

export function parseAdPlacementListFilters(
  query: Record<string, string | string[] | undefined>
): AdPlacementListFilters {
  const pick = (key: string) => {
    const v = query[key];
    return typeof v === "string" ? v : undefined;
  };

  return {
    surface: pick("surface"),
    device: pick("device") as AdDevice | undefined,
    enabled: pick("enabled") as AdPlacementListFilters["enabled"],
    testMode: pick("testMode") as AdPlacementListFilters["testMode"],
    mode: pick("mode") as AdPlacementListFilters["mode"],
    adFormat: pick("adFormat") as AdFormat | undefined,
    risk: pick("risk") as AdPlacementListFilters["risk"],
    search: pick("q"),
    page: Number(pick("page") ?? 1) || 1,
    pageSize: 20
  };
}
