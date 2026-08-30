import Link from "next/link";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import { getProfileTabUrl } from "@/lib/profile/profile-url";
import type { PublicCommunityPostItem } from "@/types/public-profile";

const PAGE_SIZE = 15;

type ProfileCommunityTabProps = {
  posts: PublicCommunityPostItem[];
  username: string;
  total: number;
  page: number;
};

export function ProfileCommunityTab({
  page,
  posts,
  total,
  username
}: ProfileCommunityTabProps) {
  if (!posts.length) {
    return (
      <ProfileEmptyState
        compact
        description="Chưa có bài đăng cộng đồng công khai."
        title="Chưa có bài cộng đồng"
      />
    );
  }

  const hasPrev = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Link
          className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/25"
          href={post.href}
          key={post.id}
        >
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-cyan-200">
            {post.type}
          </p>
          <h3 className="mt-1 text-base font-bold text-white">{post.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{post.excerpt}</p>
          {post.storySlug && post.storyPublicCode ? (
            <p className="mt-2 text-xs text-zinc-500">
              Truyện:{" "}
              <span className="text-zinc-300">
                {post.storyTitle ?? "Xem truyện"}
              </span>
            </p>
          ) : null}
        </Link>
      ))}

      {(hasPrev || hasNext) && (
        <nav className="flex items-center justify-between pt-2">
          {hasPrev ? (
            <Link
              className="text-sm font-semibold text-zinc-300"
              href={getProfileTabUrl(username, "community", page - 1) ?? "#"}
            >
              Trang trước
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              className="text-sm font-semibold text-cyan-200"
              href={getProfileTabUrl(username, "community", page + 1) ?? "#"}
            >
              Trang sau
            </Link>
          ) : null}
        </nav>
      )}
    </div>
  );
}
