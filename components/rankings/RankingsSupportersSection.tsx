import { SupporterRanking } from "@/components/supporters/SupporterRanking";
import { getSupporterRankingForAppCached } from "@/lib/monetization/supporter-ranking-cached";

export async function RankingsSupportersSection() {
  const supporters = await getSupporterRankingForAppCached(10);

  return (
    <SupporterRanking
      items={supporters.data}
      subtitle="Hiển thị khi supporter_ranking.enabled được admin bật."
      title="Top Người Ủng Hộ Toàn App"
    />
  );
}
