import { RankingListItem } from "@/components/rankings/RankingListItem";
import type { RankingBoardShareProps } from "@/lib/ranking/ranking-ui-utils";
import type { RankingBoardItem } from "@/types/ranking-board";

type RankingListProps = RankingBoardShareProps & {
  items: RankingBoardItem[];
};

export function RankingList({
  items,
  boardLabel,
  boardType,
  timeWindow,
  periodLabel
}: RankingListProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="ranking-list-heading" className="space-y-2">
      <h2 className="text-sm font-bold text-zinc-400" id="ranking-list-heading">
        Bảng chi tiết
      </h2>
      <ol className="space-y-2">
        {items.map((item) => (
          <li key={`${item.itemType}-${item.id}`}>
            <RankingListItem
              boardLabel={boardLabel}
              boardType={boardType}
              item={item}
              periodLabel={periodLabel}
              timeWindow={timeWindow}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
