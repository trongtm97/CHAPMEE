import type { RecentlyHandledReportItem } from "@/types/reports";

type RecentlyHandledReportsProps = {
  items: RecentlyHandledReportItem[];
};

export function RecentlyHandledReports({ items }: RecentlyHandledReportsProps) {
  if (!items.length) {
    return <p className="text-sm text-zinc-500">Chưa có báo cáo xử lý gần đây.</p>;
  }

  return (
    <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
      {items.map((item) => (
        <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" key={item.id}>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{item.title}</p>
            <p className="text-xs text-zinc-500">
              {item.actionLabel}
              {item.moderatorName ? ` · ${item.moderatorName}` : ""}
              {" · "}
              {new Date(item.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
