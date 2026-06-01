import Link from "next/link";
import { StudioCalendarItemCard } from "@/components/studio/calendar/StudioCalendarItemCard";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import type { ScheduledPublicationListItem } from "@/types/scheduling";

type StudioCalendarErrorsPanelProps = {
  basePath: string;
  failedCount: number;
  items: ScheduledPublicationListItem[];
};

export function StudioCalendarErrorsPanel({
  basePath,
  failedCount,
  items
}: StudioCalendarErrorsPanelProps) {
  if (failedCount === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-zinc-500 sm:text-sm">
        Không có lỗi đăng nào.
      </p>
    );
  }

  return (
    <section className="space-y-2 rounded-xl border border-rose-400/25 bg-rose-400/5 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-rose-100">Lỗi cần xử lý</h2>
        <Link
          className="text-xs font-semibold text-rose-200 hover:underline"
          href={buildStudioManagerHref(basePath, { tab: "failed" })}
        >
          Xem tất cả
        </Link>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <StudioCalendarItemCard compact item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}
