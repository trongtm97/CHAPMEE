import { unstable_cache } from "next/cache";
import { getDiscoverHomeData } from "@/lib/discover/getDiscoverHomeData";

export function getDiscoverDataCached(
  query: string,
  genre: string,
  userId?: string | null
) {
  const normalizedQuery = query.trim();
  const normalizedGenre = genre.trim();

  return getDiscoverHomeData(
    { query: normalizedQuery, genre: normalizedGenre },
    { userId: userId ?? null, skipCache: Boolean(userId) }
  );
}
