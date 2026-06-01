import { unstable_cache, revalidateTag } from "next/cache";
import type { DiscoverData } from "@/lib/discover/getDiscoverData";

const DISCOVER_HOME_CACHE_SECONDS = 60;

type DiscoverHomeParams = {
  query?: string;
  genre?: string;
};

/**
 * Single entry point for Discover home payload.
 * Batches featured genres, reader experiences, settings, presentation modes, and story sections.
 */
export async function getDiscoverHomeData(
  params: DiscoverHomeParams = {},
  options?: { userId?: string | null; skipCache?: boolean }
): Promise<DiscoverData> {
  const query = params.query?.trim() ?? "";

  if (query || options?.skipCache) {
    const { getDiscoverData } = await import("@/lib/discover/getDiscoverData");
    return getDiscoverData(params, options);
  }

  const cacheKey = `discover-home-${options?.userId ?? "anon"}-${params.genre ?? "all"}`;

  return unstable_cache(
    async () => {
      const { getDiscoverData } = await import("@/lib/discover/getDiscoverData");
      return getDiscoverData(params, options);
    },
    [cacheKey],
    {
      revalidate: DISCOVER_HOME_CACHE_SECONDS,
      tags: ["discover-home"]
    }
  )();
}

export function invalidateDiscoverHomeCache() {
  revalidateTag("discover-home", "max");
}
