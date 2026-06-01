import Link from "next/link";
import { StudioActionCard } from "@/components/studio/dashboard/shared/StudioActionCard";
import { StudioEmptyState } from "@/components/studio/dashboard/shared/StudioEmptyState";
import { studioPillBtn } from "@/components/studio/dashboard/shared/styles";
import { formatRelativeTime } from "@/lib/notifications/format-relative-time";
import { studioPath } from "@/lib/studio/constants";
import type { CreatorScheduledChapter } from "@/types/creator";

type StudioSchedulePreviewProps = {
  items: CreatorScheduledChapter[];
};

function formatPublishAt(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function StudioSchedulePreview({ items }: StudioSchedulePreviewProps) {
  if (items.length === 0) {
    return (
      <StudioEmptyState
        bare
        centered
        action={
          <Link className={studioPillBtn} href={studioPath("/calendar")}>
            Lên lịch chương
          </Link>
        }
        title="Chưa có lịch đăng"
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
                Sửa lịch
              </Link>
            }
            className="!p-2.5 sm:!p-3"
            description={`Ch.${item.episodeNumber} · ${item.episodeTitle}`}
            meta={
              <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2 py-0.5 text-[0.65rem] font-semibold text-sky-200">
                {item.statusLabel}
              </span>
            }
            title={item.storyTitle}
          />
          <p className="mt-0.5 hidden px-1 text-[0.65rem] text-zinc-600 sm:block">
            {formatPublishAt(item.publishAt)} · {formatRelativeTime(item.publishAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
