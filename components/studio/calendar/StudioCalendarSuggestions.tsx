import Link from "next/link";
import { studioPath } from "@/lib/studio/constants";
import { calendarBtnSecondary } from "@/components/studio/calendar/shared/styles";

export function StudioCalendarSuggestions() {
  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <h2 className="text-sm font-bold text-white sm:text-base">Gợi ý lịch đăng</h2>
      <ul className="space-y-2 text-sm leading-relaxed text-zinc-400">
        <li>Đăng đều 3–5 chương/tuần giúp truyện có nhịp cập nhật tốt hơn.</li>
        <li>Bạn có thể lên lịch trước nhiều chương để không bị gián đoạn.</li>
      </ul>
      <Link className={`${calendarBtnSecondary} inline-flex`} href={studioPath("/stories")}>
        Mở truyện & chương
      </Link>
    </section>
  );
}
