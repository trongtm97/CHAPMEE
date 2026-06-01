import type { RankingBoardItem } from "@/types/ranking-board";

const DEFAULT_MAX = 2;

export function applyRankingAuthorDiversity(
  items: Array<{
    item_id: string;
    author_user_id: string | null;
    rank_position: number;
    score: number;
  }>,
  maxSameAuthor = DEFAULT_MAX,
  topLimit = 20
) {
  const authorCounts = new Map<string, number>();
  const picked: typeof items = [];
  const deferred: typeof items = [];

  const sorted = [...items].sort((a, b) => b.score - a.score);

  for (const item of sorted) {
    const authorKey = item.author_user_id ?? item.item_id;
    const inTop = picked.length < topLimit;
    const count = authorCounts.get(authorKey) ?? 0;

    if (inTop && count >= maxSameAuthor) {
      deferred.push(item);
      continue;
    }

    picked.push(item);
    if (picked.length <= topLimit) {
      authorCounts.set(authorKey, count + 1);
    }
  }

  return [...picked, ...deferred].map((item, index) => ({
    ...item,
    rank_position: index + 1
  }));
}

export function topAuthorConcentration(items: RankingBoardItem[], topN = 10) {
  if (items.length === 0) return 0;
  const slice = items.slice(0, topN);
  const counts = new Map<string, number>();
  for (const item of slice) {
    const key = item.authorUsername ?? item.authorDisplayName ?? item.id;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const max = Math.max(...counts.values(), 0);
  return (max / Math.min(topN, slice.length)) * 100;
}
