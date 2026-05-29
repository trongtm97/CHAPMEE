import { Card, EmptyState } from "@/components/ui";
import { formatRelativeTime } from "@/lib/notifications/format-relative-time";
import type { CreatorScheduledChapter } from "@/types/creator";

type ScheduledChaptersCardProps = {
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

export function ScheduledChaptersCard({ items }: ScheduledChaptersCardProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        className="py-6"
        description="Chưa có chương hẹn giờ. Lên lịch từ editor chương hoặc mở Lịch đăng trong Studio."
        title="Lịch đăng trống"
      />
    );
  }

  return (
    <ul className="space-y-2" id="lich-dang">
      {items.map((item) => (
        <li key={item.episodeId}>
          <Card className="space-y-1 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-white">
                {item.storyTitle}
              </p>
              <span className="shrink-0 rounded-full border border-sky-300/30 bg-sky-300/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-sky-200">
                {item.statusLabel}
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              Ch.{item.episodeNumber} · {item.episodeTitle}
            </p>
            <p className="text-xs text-zinc-500">
              Đăng {formatPublishAt(item.publishAt)} (
              {formatRelativeTime(item.publishAt)})
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
