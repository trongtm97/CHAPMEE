import Link from "next/link";
import { StudioCalendarItemCard } from "@/components/studio/calendar/StudioCalendarItemCard";
import {
  calendarBtnPrimary
} from "@/components/studio/calendar/shared/styles";
import type { ScheduledPublicationListItem } from "@/types/scheduling";

type StudioCalendarTodayPanelProps = {
  items: ScheduledPublicationListItem[];
  writeChapterHref: string;
};

export function StudioCalendarTodayPanel({
  items,
  writeChapterHref
}: StudioCalendarTodayPanelProps) {
  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <h2 className="text-sm font-bold text-white sm:text-base">Hôm nay cần đăng</h2>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center">
          <p className="text-sm text-zinc-400">Hôm nay chưa có lịch đăng.</p>
          <Link
            className={`${calendarBtnPrimary} mt-3 inline-flex max-w-xs`}
            href={writeChapterHref}
          >
            Lên lịch chương
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <StudioCalendarItemCard compact item={item} key={item.id} />
          ))}
        </div>
      )}
    </section>
  );
}
