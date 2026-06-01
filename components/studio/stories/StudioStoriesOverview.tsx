import Link from "next/link";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import type { StudioStoriesOverview } from "@/types/studio-stories";
import type { StudioStoryListFilter } from "@/types/studio";

type StudioStoriesOverviewProps = {
  basePath: string;
  overview: StudioStoriesOverview;
  query: Record<string, string | undefined>;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: value >= 10_000 ? "compact" : "standard"
  }).format(value);

const cards: Array<{
  filter?: StudioStoryListFilter;
  hint: string;
  key: keyof StudioStoriesOverview;
  label: string;
  sort?: string;
}> = [
  { hint: "Tất cả truyện", key: "total", label: "Tổng truyện" },
  { filter: "live", hint: "Đang công khai", key: "live", label: "Đang đăng" },
  { filter: "draft", hint: "Chưa xuất bản", key: "draft", label: "Nháp" },
  { filter: "scheduled", hint: "Chờ duyệt / lên lịch", key: "scheduled", label: "Đã lên lịch" },
  { filter: "rejected", hint: "Cần chỉnh sửa", key: "rejected", label: "Cần sửa" },
  { filter: "completed", hint: "Đã đánh dấu xong", key: "completed", label: "Hoàn thành" },
  {
    filter: "missing_cover",
    hint: "Chưa có ảnh bìa",
    key: "missingCover",
    label: "Thiếu ảnh bìa"
  },
  { hint: "7 ngày qua", key: "reads7d", label: "Lượt đọc 7 ngày", sort: "reads_7d" }
];

export function StudioStoriesOverview({
  basePath,
  overview,
  query
}: StudioStoriesOverviewProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
      {cards.map((card) => {
        const href = card.filter
          ? buildStudioManagerHref(basePath, {
              ...query,
              page: undefined,
              sort: card.sort ?? query.sort,
              status: card.filter
            })
          : card.sort
            ? buildStudioManagerHref(basePath, {
                ...query,
                page: undefined,
                sort: card.sort
              })
            : buildStudioManagerHref(basePath, {
                ...query,
                page: undefined,
                status: undefined
              });

        const clickable = card.key !== "total";

        const inner = (
          <>
            <p className="text-lg font-black tabular-nums text-white sm:text-xl">
              {formatNumber(overview[card.key])}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-zinc-200">{card.label}</p>
            <p className="mt-0.5 hidden text-[0.65rem] text-zinc-500 sm:block">{card.hint}</p>
          </>
        );

        if (!clickable) {
          return (
            <div
              className="min-h-[4.75rem] rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2 sm:min-h-[5.25rem] sm:px-3 sm:py-2.5"
              key={card.key}
            >
              {inner}
            </div>
          );
        }

        return (
          <Link
            className="min-h-[4.75rem] rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2 transition hover:border-cyan-300/30 hover:bg-white/[0.05] sm:min-h-[5.25rem] sm:px-3 sm:py-2.5"
            href={href}
            key={card.key}
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
