import Link from "next/link";
import { studioPath } from "@/lib/studio/constants";
import {
  calendarBtnPrimary,
  calendarBtnSecondary
} from "@/components/studio/calendar/shared/styles";
import type { CalendarStats } from "@/types/scheduling";

type StudioCalendarHeaderProps = {
  stats: CalendarStats;
  writeChapterHref: string;
};

export function StudioCalendarHeader({
  stats,
  writeChapterHref
}: StudioCalendarHeaderProps) {
  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb" className="text-xs text-zinc-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link className="transition hover:text-zinc-300" href={studioPath()}>
              Studio
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-zinc-400">Lịch đăng</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-black text-white sm:text-2xl">Lịch đăng</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            Quản lý lịch đăng truyện, chương và Reels của bạn.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-100">
              {stats.upcoming} lịch sắp tới
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                stats.failed > 0
                  ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {stats.failed} lỗi cần xử lý
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Link className={calendarBtnSecondary} href={writeChapterHref}>
            Viết chương mới
          </Link>
          <Link className={calendarBtnPrimary} href={studioPath("/stories")}>
            Lên lịch mới
          </Link>
        </div>
      </div>
    </div>
  );
}
