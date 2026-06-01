import { createClient } from "@/lib/supabase/server";
import { mapPlacementRow, toPlacementPublic } from "@/lib/ads/map-placement-row";
import type { AdPlacementPublic } from "@/types/ads";

export async function getAdPlacementByKey(
  placementKey: string
): Promise<{ placement: AdPlacementPublic | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ad_placements")
      .select("*")
      .eq("placement_key", placementKey)
      .is("archived_at", null)
      .maybeSingle();

    if (error) {
      return { placement: null, error: error.message };
    }
    if (!data) {
      return { placement: null, error: null };
    }

    return { placement: toPlacementPublic(mapPlacementRow(data as Record<string, unknown>)), error: null };
  } catch {
    return { placement: null, error: "Không tải được cấu hình quảng cáo." };
  }
}

export async function listEnabledAdPlacements(): Promise<{
  placements: AdPlacementPublic[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ad_placements")
      .select("*")
      .eq("is_enabled", true)
      .is("archived_at", null);

    if (error) {
      return { placements: [], error: error.message };
    }

    return {
      placements: (data ?? []).map((row) =>
        toPlacementPublic(mapPlacementRow(row as Record<string, unknown>))
      ),
      error: null
    };
  } catch {
    return { placements: [], error: "Không tải được danh sách quảng cáo." };
  }
}
