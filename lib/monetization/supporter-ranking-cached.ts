import { unstable_cache } from "next/cache";
import { getSupporterRankingForApp } from "@/lib/monetization/supporter-ranking";

export function getSupporterRankingForAppCached(limit = 10) {
  return unstable_cache(
    () => getSupporterRankingForApp(limit),
    ["supporter-ranking-app", String(limit)],
    { revalidate: 120, tags: ["supporter-ranking"] }
  )();
}
