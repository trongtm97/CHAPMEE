import { revalidateTag } from "next/cache";
import type { DiscoverData } from "@/lib/discover/getDiscoverData";

type DiscoverHomeParams = {
  query?: string;
  genre?: string;
  tab?: string;
  page?: number;
};

/**
 * Single entry point for Discover home payload.
 * Batches featured genres, reader experiences, settings, presentation modes, and story sections.
 */
export async function getDiscoverHomeData(
  params: DiscoverHomeParams = {},
  options?: { userId?: string | null; skipCache?: boolean }
): Promise<DiscoverData> {
  const { getDiscoverData } = await import("@/lib/discover/getDiscoverData");
  return getDiscoverData(params, options);
}

export function invalidateDiscoverHomeCache() {
  revalidateTag("discover-home", "max");
}
