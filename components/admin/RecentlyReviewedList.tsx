import { contentReviewReasonLabel } from "@/lib/admin/content-review-reasons";
import type { RecentlyReviewedItem } from "@/types/admin-content-review";

type RecentlyReviewedListProps = {
  items: RecentlyReviewedItem[];
};

export function RecentlyReviewedList({ items }: RecentlyReviewedListProps) {
  if (!items.length) {
    return (
      <p className="text-sm text-zinc-500">Chưa có lịch sử xử lý gần đây.</p>
    );
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
            {item.reasonCode || item.note ? (
              <p className="mt-1 text-xs text-zinc-600">
                {item.reasonCode ? contentReviewReasonLabel(item.reasonCode) : ""}
                {item.note ? ` — ${item.note}` : ""}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
