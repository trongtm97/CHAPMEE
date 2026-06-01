import type { AdPlacementPublic } from "@/types/ads";

export async function fetchPlacementConfig(
  placementKey: string,
  route: string
): Promise<AdPlacementPublic | null> {
  const params = new URLSearchParams({ route });
  const res = await fetch(`/api/ads/placements/${encodeURIComponent(placementKey)}?${params}`);
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as { placement?: AdPlacementPublic | null };
  return json.placement ?? null;
}
