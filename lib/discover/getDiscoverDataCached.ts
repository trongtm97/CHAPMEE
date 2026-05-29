import { unstable_cache } from "next/cache";
import { getDiscoverData } from "@/lib/discover/getDiscoverData";

export function getDiscoverDataCached(query: string, genre: string) {
  const normalizedQuery = query.trim();
  const normalizedGenre = genre.trim();

  return unstable_cache(
    () => getDiscoverData({ query: normalizedQuery, genre: normalizedGenre }),
    ["discover-data", normalizedQuery, normalizedGenre],
    { revalidate: 60, tags: ["discover"] }
  )();
}
