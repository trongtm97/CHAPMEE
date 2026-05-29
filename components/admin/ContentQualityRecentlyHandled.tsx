import type { AdminContentQualityRecentlyHandled } from "@/types/admin";

type ContentQualityRecentlyHandledProps = {
  items: AdminContentQualityRecentlyHandled[];
};

export function ContentQualityRecentlyHandled({ items }: ContentQualityRecentlyHandledProps) {
  if (!items.length) {
    return <p className="text-sm text-zinc-500">Chưa có lịch sử xử lý gần đây.</p>;
  }

  return (
    <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
      {items.map((item) => (
        <li className="px-4 py-3" key={item.id}>
          <p className="truncate text-sm font-medium text-white">{item.title}</p>
          <p className="text-xs text-zinc-500">
            {item.actionLabel}
            {item.moderatorName ? ` · ${item.moderatorName}` : ""}
            {" · "}
            {new Date(item.createdAt).toLocaleString("vi-VN")}
          </p>
        </li>
      ))}
    </ul>
  );
}
