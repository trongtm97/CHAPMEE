import Link from "next/link";
import { studioPath } from "@/lib/studio/constants";
import {
  calendarBtnPrimary,
  calendarBtnSecondary
} from "@/components/studio/calendar/shared/styles";

type StudioCalendarEmptyStateProps = {
  writeChapterHref: string;
};

export function StudioCalendarEmptyState({
  writeChapterHref
}: StudioCalendarEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center sm:px-6">
      <div
        aria-hidden
        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl"
      >
        📅
      </div>
      <p className="text-base font-semibold text-white">Chưa có lịch đăng</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
        Lên lịch chương hoặc Reels để ChapMee tự nhắc bạn quản lý lịch xuất bản.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:mx-auto sm:max-w-md sm:grid-cols-2">
        <Link className={calendarBtnPrimary} href={studioPath("/stories")}>
          Lên lịch mới
        </Link>
        <Link className={calendarBtnSecondary} href={writeChapterHref}>
          Viết chương mới
        </Link>
      </div>
    </div>
  );
}
