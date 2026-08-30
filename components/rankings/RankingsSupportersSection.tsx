import { SupporterRanking } from "@/components/supporters/SupporterRanking";
import { getSupporterRankingForAppCached } from "@/lib/monetization/supporter-ranking-cached";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function RankingsSupportersSection() {
  const [{ user }, supporters] = await Promise.all([
    getCurrentUser(),
    getSupporterRankingForAppCached(5).catch(() => ({ data: [], error: null }))
  ]);

  return (
    <SupporterRanking
      currentUserId={user?.id ?? null}
      items={supporters.data}
      subtitle="Những độc giả ủng hộ tác giả nhiều nhất trên ChapMee."
      title="Top fan ủng hộ"
    />
  );
}
