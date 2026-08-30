import { unstable_cache } from "next/cache";
import { getDiscoverHomeData } from "@/lib/discover/getDiscoverHomeData";

export function getDiscoverDataCached(
  query: string,
  genre: string,
  tab = "",
  page = 1,
  userId?: string | null
) {
  const normalizedQuery = query.trim();
  const normalizedGenre = genre.trim();

  return getDiscoverHomeData(
    { query: normalizedQuery, genre: normalizedGenre, tab, page },
    { userId: userId ?? null, skipCache: Boolean(userId) }
  );
}
