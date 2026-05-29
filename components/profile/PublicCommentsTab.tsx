import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import type { PublicCommentItem } from "@/types/public-profile";

function formatTime(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short"
  });
}

type PublicCommentsTabProps = {
  comments: PublicCommentItem[];
  username: string;
  total: number;
  page: number;
};

export function PublicCommentsTab({
  comments,
  page,
  total,
  username
}: PublicCommentsTabProps) {
  if (!comments.length) {
    return (
      <EmptyState
        description="Người dùng này chưa công khai bình luận nào."
        title="Chưa có bình luận"
      />
    );
  }

  const hasMore = page * 20 < total;

  return (
    <div className="space-y-3">
      {comments.map((item) => (
        <Card className="space-y-2 p-3" key={item.id}>
          <p className="text-xs font-semibold text-cyan-100/90">«{item.storyTitle}»</p>
          <p className="line-clamp-3 text-sm leading-6 text-zinc-300">{item.content}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <span>
              {item.likeCount} thích · {formatTime(item.createdAt)}
            </span>
            <Link
              className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold text-cyan-200 hover:bg-white/5"
              href={`/stories/${item.storySlug}`}
            >
              Xem thảo luận
            </Link>
          </div>
        </Card>
      ))}
      {hasMore ? (
        <a
          className="block text-center text-sm font-semibold text-cyan-200"
          href={`/profile/${username}?tab=comments&page=${page + 1}`}
        >
          Trang sau
        </a>
      ) : null}
    </div>
  );
}
