import Link from "next/link";
import { RankingBoardCard } from "@/components/rankings/RankingBoardCard";
import { getRankingBoard } from "@/lib/ranking/get-board";
import { createClient } from "@/lib/data/server";

export async function BoostedStoriesSection() {
  const db = await createClient();
  const board = await getRankingBoard(db, {
    boardType: "boosted_stories",
    timeWindow: "week",
    page: 1,
    pageSize: 6
  });

  if (board.items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-amber-300/90">
            Được đề cử
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Truyện được cộng đồng ủng hộ tuần này — bảng riêng, không thay BXH organic.
          </p>
        </div>
        <Link
          className="shrink-0 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href="/bang-xep-hang/duoc-de-cu"
        >
          Xem tất cả
        </Link>
      </div>
      <ul className="space-y-3">
        {board.items.map((item) => (
          <li key={item.id}>
            <RankingBoardCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
