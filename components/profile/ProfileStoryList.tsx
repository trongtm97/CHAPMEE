import Link from "next/link";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import { ProfileStoryCard } from "@/components/profile/ProfileStoryCard";
import { PUBLIC_WORKS_PAGE_SIZE } from "@/lib/profile/get-public-works";
import { getProfileTabUrl } from "@/lib/profile/profile-url";
import type { PublicWorkItem, PublicWorksSort } from "@/types/public-profile";

type ProfileStoryListProps = {
  works: PublicWorkItem[];
  username: string;
  total: number;
  page: number;
  isOwner: boolean;
  sort: PublicWorksSort;
};

export function ProfileStoryList({
  isOwner,
  page,
  sort,
  total,
  username,
  works
}: ProfileStoryListProps) {
  if (!works.length) {
    return (
      <ProfileEmptyState
        actionHref={isOwner ? "/studio/stories/new" : undefined}
        actionLabel={isOwner ? "Đăng truyện đầu tiên" : undefined}
        compact
        description={
          isOwner
            ? "Đăng truyện đầu tiên để người đọc khám phá tác phẩm của bạn."
            : "Tác giả chưa đăng truyện công khai nào."
        }
        title="Chưa có truyện"
      />
    );
  }

  const hasPrev = page > 1;
  const hasNext = page * PUBLIC_WORKS_PAGE_SIZE < total;
  const tabExtra = { sort: sort !== "updated" ? sort : undefined };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        {works.map((work) => (
          <ProfileStoryCard key={work.id} work={work} />
        ))}
      </div>

      {(hasPrev || hasNext) && (
        <nav
          aria-label="Phân trang truyện"
          className="flex items-center justify-between gap-3 pt-2"
        >
          {hasPrev ? (
            <Link
              className="min-h-10 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-white/20"
              href={getProfileTabUrl(username, "stories", page - 1, tabExtra) ?? "#"}
            >
              Trang trước
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-zinc-500">
            Trang {page} / {Math.max(1, Math.ceil(total / PUBLIC_WORKS_PAGE_SIZE))}
          </span>
          {hasNext ? (
            <Link
              className="min-h-10 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100"
              href={getProfileTabUrl(username, "stories", page + 1, tabExtra) ?? "#"}
            >
              Trang sau
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
