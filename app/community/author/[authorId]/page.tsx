import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { COMMUNITY_PAGE_SHELL_CLASS } from "@/components/community/community-page-shell";
import { AuthorGroupFeed } from "@/components/community/AuthorGroupFeed";
import { AvatarFallback, ErrorState } from "@/components/ui";
import { getAuthorGroupById } from "@/lib/community/get-author-group-by-id";
import { getCommunityFeed } from "@/lib/community/getCommunityFeed";

export const dynamic = "force-dynamic";

type AuthorGroupPageProps = {
  params: Promise<{ authorId: string }>;
};

export default async function AuthorGroupPage({ params }: AuthorGroupPageProps) {
  const { authorId } = await params;
  const [{ group, error }, feed] = await Promise.all([
    getAuthorGroupById(authorId),
    getCommunityFeed()
  ]);

  if (error) {
    return (
      <section className="page-stack">
        <ErrorState message={error} title="Không thể tải nhóm tác giả" />
      </section>
    );
  }

  if (!group) {
    notFound();
  }

  const authorPosts = feed.posts.filter((post) => post.creatorId === authorId);
  const profileHref = getProfileUrl(group.authorUsername);

  return (
    <section className={`page-stack space-y-4 ${COMMUNITY_PAGE_SHELL_CLASS}`}>
      <Link
        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href="/community"
      >
        ← Cộng đồng
      </Link>

      <header className="chap-card flex items-center gap-4 p-4">
        <AvatarFallback name={group.name} size="md" src={group.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
            Nhóm tác giả
          </p>
          <h1 className="text-xl font-black text-white">{group.name}</h1>
          <p className="text-xs text-zinc-500">
            {group.followerCount} theo dõi · {group.storyCount} truyện
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {profileHref ? (
              <Link
                className="tap-highlight inline-flex min-h-10 items-center rounded-full border border-white/15 bg-white/[0.04] px-4 text-xs font-bold text-zinc-100"
                href={profileHref}
              >
                Xem hồ sơ @{group.authorUsername}
              </Link>
            ) : null}
            <button
              className="tap-highlight inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-4 text-xs font-black uppercase text-zinc-950"
              type="button"
            >
              Theo dõi tác giả
            </button>
          </div>
        </div>
      </header>

      <AuthorGroupFeed authorGroup={group} posts={authorPosts} />
    </section>
  );
}
