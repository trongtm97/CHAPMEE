import Link from "next/link";
import { StudioActionCard } from "@/components/studio/dashboard/shared/StudioActionCard";
import { StudioEmptyState } from "@/components/studio/dashboard/shared/StudioEmptyState";
import {
  studioGhostPillBtn,
  studioPillBtn
} from "@/components/studio/dashboard/shared/styles";
import { formatRelativeTime } from "@/lib/notifications/format-relative-time";
import { studioPath } from "@/lib/studio/constants";
import type { CreatorDashboardContinueItem } from "@/types/creator";

type StudioContinueWritingProps = {
  items: CreatorDashboardContinueItem[];
  writeChapterHref: string;
};

export function StudioContinueWriting({
  items,
  writeChapterHref
}: StudioContinueWritingProps) {
  if (items.length === 0) {
    return (
      <StudioEmptyState
        bare
        centered
        action={
          <>
            <Link className={studioPillBtn} href={writeChapterHref}>
              Tạo chương
            </Link>
            <Link className={studioGhostPillBtn} href={studioPath("/stories/new")}>
              Tạo truyện
            </Link>
          </>
        }
        title="Chưa có bản nháp"
      />
    );
  }

  return (
    <ul className="space-y-1.5">
      {items.slice(0, 3).map((item) => (
        <li key={item.episodeId}>
          <StudioActionCard
            action={
              <Link className={studioPillBtn} href={item.editHref}>
                Viết tiếp
              </Link>
            }
            className="!p-2.5 sm:!p-3"
            description={`Ch.${item.episodeNumber} · ${item.episodeTitle}`}
            meta={
              <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[0.6rem] text-zinc-400">
                {item.statusLabel}
              </span>
            }
            title={item.storyTitle}
          />
          <p className="mt-0.5 hidden px-1 text-[0.65rem] text-zinc-600 sm:block">
            Cập nhật {formatRelativeTime(item.updatedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
