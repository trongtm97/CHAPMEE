import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import { formatRelativeTime } from "@/lib/notifications/format-relative-time";
import type { CreatorDashboardContinueItem } from "@/types/creator";

const primaryLinkClass =
  "tap-highlight inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-cyan-200 sm:w-auto";
const secondaryLinkClass =
  "tap-highlight inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.08] sm:w-auto";

type ContinueWritingListProps = {
  items: CreatorDashboardContinueItem[];
  writeChapterHref: string;
};

export function ContinueWritingList({
  items,
  writeChapterHref
}: ContinueWritingListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        action={
          <Link className={primaryLinkClass} href={writeChapterHref}>
            Tạo chương đầu tiên
          </Link>
        }
        description="Bạn chưa có bản nháp nào."
        title="Chưa có bản nháp"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.episodeId}>
          <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-semibold text-white">
                {item.storyTitle}
              </p>
              <p className="truncate text-sm text-zinc-300">
                Ch.{item.episodeNumber} · {item.episodeTitle}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-medium text-zinc-300">
                  {item.statusLabel}
                </span>
                <span>Sửa {formatRelativeTime(item.updatedAt)}</span>
              </div>
            </div>
            <Link className={secondaryLinkClass} href={item.editHref}>
              Viết tiếp
            </Link>
          </Card>
        </li>
      ))}
    </ul>
  );
}
