import { TAXONOMY_INDEX_CONFIG } from "@/lib/discovery/taxonomy-index-config";
import { KHAM_PHA_HUB_SECTIONS } from "@/lib/discovery/kham-pha-hub";
import { getPublicMainGenresWithStoryCounts } from "@/lib/taxonomy/public-genres";
import { createPublicClient } from "@/lib/supabase/public-client";

export type KhamPhaHubSectionStats = {
  termCount: number;
  /** Sum of `usage_count` on discoverable terms (approximate engagement). */
  usageTotal: number;
};

export async function getKhamPhaHubSectionStats(): Promise<
  Record<string, KhamPhaHubSectionStats>
> {
  const supabase = createPublicClient();
  const stats: Record<string, KhamPhaHubSectionStats> = {};

  const mainGenres = await getPublicMainGenresWithStoryCounts(supabase);
  const activeMain = mainGenres.filter((genre) => genre.story_count > 0);
  stats["/the-loai"] = {
    termCount: activeMain.length,
    usageTotal: activeMain.reduce((sum, genre) => sum + genre.story_count, 0)
  };

  for (const config of Object.values(TAXONOMY_INDEX_CONFIG)) {
    const { data } = await supabase
      .from("taxonomy_terms")
      .select("usage_count")
      .eq("type", config.type)
      .eq("is_active", true)
      .eq("is_public", true)
      .eq("use_for_discover", true)
      .gt("usage_count", 0);

    const rows = data ?? [];
    stats[config.pathname] = {
      termCount: rows.length,
      usageTotal: rows.reduce((sum, row) => sum + Number(row.usage_count ?? 0), 0)
    };
  }

  for (const section of KHAM_PHA_HUB_SECTIONS) {
    if (!stats[section.href]) {
      stats[section.href] = { termCount: 0, usageTotal: 0 };
    }
  }

  return stats;
}
