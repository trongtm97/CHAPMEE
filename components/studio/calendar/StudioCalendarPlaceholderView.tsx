import type { CalendarViewMode } from "@/types/scheduling";

type StudioCalendarPlaceholderViewProps = {
  mode: Exclude<CalendarViewMode, "list">;
};

const COPY: Record<Exclude<CalendarViewMode, "list">, { title: string; description: string }> =
  {
    month: {
      description:
        "Lịch tháng sẽ hiển thị các mốc đăng theo từng ngày. Hiện bạn có thể dùng chế độ Danh sách để quản lý đầy đủ.",
      title: "Chế độ xem tháng"
    },
    week: {
      description:
        "Lịch tuần sẽ hiển thị các mốc đăng theo từng ngày trong tuần. Hiện bạn có thể dùng chế độ Danh sách.",
      title: "Chế độ xem tuần"
    }
  };

export function StudioCalendarPlaceholderView({ mode }: StudioCalendarPlaceholderViewProps) {
  const content = COPY[mode];

  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-10 text-center">
      <p className="text-base font-semibold text-white">{content.title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">{content.description}</p>
      <div className="mx-auto mt-6 grid max-w-lg grid-cols-7 gap-1 opacity-40">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            className="h-8 rounded border border-white/10 bg-white/5"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}
