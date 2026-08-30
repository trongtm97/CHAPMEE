import Link from "next/link";
import {
  RANKING_EMPTY_SUGGESTIONS,
  rankingTabHref
} from "@/lib/ranking/ranking-ui-utils";
import type { RankingUiTab } from "@/types/ranking-board";
import { RANKING_UI_TABS } from "@/types/ranking-board";

type RankingEmptyStateProps = {
  boardLabel?: string;
  title?: string;
  description?: string;
};

export function RankingEmptyState({
  boardLabel,
  title,
  description
}: RankingEmptyStateProps) {
  const suggestions = RANKING_EMPTY_SUGGESTIONS.map((id) =>
    RANKING_UI_TABS.find((tab) => tab.id === id)
  ).filter((tab): tab is RankingUiTab => Boolean(tab));

  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 sm:py-5">
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
        <div
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400"
        >
          <svg className="size-4" viewBox="0 0 24 24">
            <path
              d="M6 18.25V16.5h2.75l4.1-5.47 3.15 2.62L18.5 6.5H16V4.75h5.25V10h-1.75V7.35l-5.9 7.02-3.2-2.66-4.35 5.79H4Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div className="mt-2 min-w-0 flex-1 sm:mt-0">
          <h2 className="text-sm font-bold text-white">
            {title ?? (boardLabel ? `${boardLabel} chưa đủ dữ liệu` : "Bảng này chưa đủ dữ liệu")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-zinc-400 sm:text-sm">
            {description ??
              "Hãy thử bảng khác — danh sách được cập nhật thường xuyên khi có truyện public."}
          </p>

          <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {suggestions.map((tab) => (
              <Link
                className="tap-highlight rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.7rem] font-bold text-zinc-200 transition hover:border-yellow-400/30 hover:text-yellow-100 sm:text-xs"
                href={rankingTabHref(tab)}
                key={tab.id}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
