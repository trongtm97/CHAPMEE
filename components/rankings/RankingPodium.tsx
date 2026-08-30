import { RankingPodiumCard } from "@/components/rankings/RankingPodiumCard";
import type { RankingBoardShareProps } from "@/lib/ranking/ranking-ui-utils";
import type { RankingBoardItem } from "@/types/ranking-board";

type RankingPodiumProps = RankingBoardShareProps & {
  items: RankingBoardItem[];
};

export function RankingPodium({
  items,
  boardLabel,
  boardType,
  timeWindow,
  periodLabel
}: RankingPodiumProps) {
  if (items.length === 0) return null;

  const byRank = new Map(items.map((item) => [item.rank, item]));
  const first = byRank.get(1);
  const second = byRank.get(2);
  const third = byRank.get(3);

  if (items.length >= 3 && first && second && third) {
    return (
      <section aria-labelledby="ranking-podium-heading" className="space-y-3">
        <h2 className="sr-only" id="ranking-podium-heading">
          Top 3 {boardLabel}
        </h2>

        <div className="hidden items-end gap-3 sm:grid sm:grid-cols-3">
          <RankingPodiumCard
            boardLabel={boardLabel}
            boardType={boardType}
            item={second}
            periodLabel={periodLabel}
            timeWindow={timeWindow}
          />
          <RankingPodiumCard
            boardLabel={boardLabel}
            boardType={boardType}
            elevated
            item={first}
            periodLabel={periodLabel}
            timeWindow={timeWindow}
          />
          <RankingPodiumCard
            boardLabel={boardLabel}
            boardType={boardType}
            item={third}
            periodLabel={periodLabel}
            timeWindow={timeWindow}
          />
        </div>

        <div className="space-y-3 sm:hidden">
          <RankingPodiumCard
            boardLabel={boardLabel}
            boardType={boardType}
            elevated
            item={first}
            periodLabel={periodLabel}
            timeWindow={timeWindow}
          />
          <div className="grid grid-cols-2 gap-3">
            <RankingPodiumCard
              boardLabel={boardLabel}
              boardType={boardType}
              item={second}
              periodLabel={periodLabel}
              timeWindow={timeWindow}
            />
            <RankingPodiumCard
              boardLabel={boardLabel}
              boardType={boardType}
              item={third}
              periodLabel={periodLabel}
              timeWindow={timeWindow}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="ranking-podium-heading" className="space-y-3">
      <h2 className="sr-only" id="ranking-podium-heading">
        Top {items.length} {boardLabel}
      </h2>
      <div className={`grid gap-3 ${items.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
        {items.map((item) => (
          <RankingPodiumCard
            boardLabel={boardLabel}
            boardType={boardType}
            elevated={item.rank === 1}
            item={item}
            key={`${item.itemType}-${item.id}`}
            periodLabel={periodLabel}
            timeWindow={timeWindow}
          />
        ))}
      </div>
    </section>
  );
}
