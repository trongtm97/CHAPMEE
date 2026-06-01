import Link from "next/link";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { notFound } from "next/navigation";
import { getStoryImageForUsage } from "@/lib/images/get-story-image";
import { COMMUNITY_PAGE_SHELL_CLASS } from "@/components/community/community-page-shell";
import { StoryGroupFeed } from "@/components/community/StoryGroupFeed";
import { ErrorState } from "@/components/ui";
import { getCommunityFeed } from "@/lib/community/getCommunityFeed";
import { getStoryGroupBySlug } from "@/lib/community/get-story-group-by-slug";

export const dynamic = "force-dynamic";

type StoryGroupPageProps = {
  params: Promise<{ storyId: string }>;
};

export default async function StoryGroupPage({ params }: StoryGroupPageProps) {
  const { storyId } = await params;
  const [{ group, story, error }, feed] = await Promise.all([
    getStoryGroupBySlug(storyId),
    getCommunityFeed()
  ]);

  if (error) {
    return (
      <section className="page-stack">
        <ErrorState message={error} title="Không thể tải nhóm truyện" />
      </section>
    );
  }

  if (!group || !story) {
    notFound();
  }

  const storyPosts = feed.posts.filter(
    (post) => post.storyId === story.id || post.relatedStorySlug === story.slug
  );
  const heroCover = getStoryImageForUsage(
    { title: story.title, coverUrl: story.coverUrl },
    "communityCard"
  );

  return (
    <section className={`page-stack space-y-4 ${COMMUNITY_PAGE_SHELL_CLASS}`}>
      <Link
        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href="/community"
      >
        ← Cộng đồng
      </Link>

      <header className="chap-card overflow-hidden p-0">
        <div className="relative aspect-video max-h-28 overflow-hidden bg-gradient-to-br from-cyan-500/25 via-indigo-600/20 to-fuchsia-600/25">
          {heroCover.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="h-full w-full object-cover opacity-90"
              src={heroCover.src}
              style={{ objectPosition: heroCover.objectPosition }}
            />
          ) : null}
        </div>
        <div className="space-y-2 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
            Nhóm truyện
          </p>
          <h1 className="text-xl font-black text-white">{story.title}</h1>
          {story.authorName ? (
            <p className="text-sm text-zinc-400">Tác giả: {story.authorName}</p>
          ) : null}
          <p className="text-xs text-zinc-500">
            {group.memberCount} thành viên · {group.statusLine}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              className="tap-highlight inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-4 text-xs font-black uppercase text-zinc-950"
              type="button"
            >
              Theo dõi nhóm
            </button>
            <Link
              className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-4 text-xs font-bold text-zinc-200"
              href={getStoryDetailHref({ slug: story.slug, public_code: story.publicCode })}
            >
              Đọc truyện
            </Link>
          </div>
        </div>
      </header>

      <StoryGroupFeed posts={storyPosts} storyGroup={group} />
    </section>
  );
}
