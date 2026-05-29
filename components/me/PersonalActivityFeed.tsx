import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import type { PersonalActivityItem } from "@/types/me-page";

type PersonalActivityFeedProps = {
  items: PersonalActivityItem[];
  maxItems?: number;
  title?: string;
  showEmpty?: boolean;
};

const iconByType: Record<PersonalActivityItem["type"], string> = {
  comment: "💬",
  save: "🔖",
  follow: "👤",
  badge: "🏅",
  milestone: "🎯",
  top_fan: "⭐",
  thank_you: "💌"
};

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(value).toLocaleDateString("vi-VN");
}

export function PersonalActivityFeed({
  items,
  maxItems = 5,
  showEmpty = true,
  title = "Hoạt động gần đây"
}: PersonalActivityFeedProps) {
  const visibleItems = items.slice(0, maxItems);

  if (visibleItems.length === 0) {
    if (!showEmpty) {
      return null;
    }
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        <EmptyState
          className="py-5"
          description="Bình luận, lưu truyện và theo dõi sẽ hiện ở đây."
          title="Chưa có hoạt động gần đây"
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="space-y-2.5">
        {visibleItems.map((item) => {
          const body = (
            <Card className="flex items-start gap-3 p-3.5 transition hover:border-cyan-300/20 hover:bg-white/[0.04]">
              <span aria-hidden="true" className="text-lg">
                {iconByType[item.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-zinc-200">{item.message}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatRelativeTime(item.createdAt)}</p>
              </div>
            </Card>
          );

          if (item.href) {
            return (
              <Link href={item.href} key={item.id}>
                {body}
              </Link>
            );
          }

          return <div key={item.id}>{body}</div>;
        })}
      </div>
    </section>
  );
}
