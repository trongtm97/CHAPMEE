import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import type { PublicActivityItem } from "@/types/public-profile";

const icons: Record<PublicActivityItem["type"], string> = {
  comment: "💬",
  review: "⭐",
  collection: "📚",
  badge: "🏅",
  story: "✍️",
  discussion: "🗣️"
};

function formatTime(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

type PublicActivitiesTabProps = {
  activities: PublicActivityItem[];
  username: string;
  total: number;
  page: number;
};

export function PublicActivitiesTab({
  activities,
  page,
  total,
  username
}: PublicActivitiesTabProps) {
  if (!activities.length) {
    return (
      <EmptyState
        description="Người dùng này chưa công khai hoạt động nào."
        title="Chưa có hoạt động"
      />
    );
  }

  const hasMore = page * 20 < total;

  return (
    <div className="space-y-2">
      {activities.map((item) => {
        const content = (
          <Card className="flex gap-3 p-3">
            <span aria-hidden="true" className="text-lg">
              {icons[item.type]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-6 text-zinc-200">{item.message}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatTime(item.createdAt)}</p>
            </div>
          </Card>
        );

        return item.href ? (
          <Link href={item.href} key={item.id}>
            {content}
          </Link>
        ) : (
          <div key={item.id}>{content}</div>
        );
      })}
      {hasMore ? (
        <a
          className="block text-center text-sm font-semibold text-cyan-200"
          href={`/profile/${username}?tab=activity&page=${page + 1}`}
        >
          Trang sau
        </a>
      ) : null}
    </div>
  );
}
