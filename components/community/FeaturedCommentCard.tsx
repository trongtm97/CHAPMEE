import Link from "next/link";
import type { FeaturedComment } from "@/types/community";

type FeaturedCommentCardProps = {
  featured: FeaturedComment | null;
};

export function FeaturedCommentCard({ featured }: FeaturedCommentCardProps) {
  if (!featured) {
    return null;
  }

  return (
    <article className="chap-card space-y-2.5 p-3.5">
      <p className="text-xs font-bold text-amber-200">🔥 Bình luận đang nổi</p>
      <blockquote className="line-clamp-2 text-sm leading-6 text-zinc-100">
        &ldquo;{featured.quote}&rdquo;
      </blockquote>
      <p className="text-xs text-zinc-400">
        {featured.authorName}
        {featured.storyTitle ? (
          <>
            {" "}
            ·{" "}
            {featured.storySlug ? (
              <Link
                className="text-cyan-300 hover:text-cyan-200"
                href={`/stories/${featured.storySlug}`}
              >
                {featured.storyTitle}
              </Link>
            ) : (
              featured.storyTitle
            )}
          </>
        ) : null}
        {featured.chapterLabel ? ` · ${featured.chapterLabel}` : null}
      </p>
      <Link
        className="inline-flex text-sm font-bold text-cyan-300 hover:text-cyan-200"
        href={`/community/${featured.postId}`}
      >
        Xem thảo luận →
      </Link>
    </article>
  );
}
