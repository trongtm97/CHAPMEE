import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { COMMUNITY_PAGE_SHELL_CLASS } from "@/components/community/community-page-shell";
import { StoryGroupHeader } from "@/components/community/story-group/StoryGroupHeader";
import {
  StoryGroupTabsPanel,
  type StoryGroupTabId
} from "@/components/community/story-group/StoryGroupTabsPanel";
import { StoryGroupActivitySkeleton } from "@/components/community/story-group/StoryGroupActivitySkeleton";
import { ErrorState } from "@/components/ui";
import { getStoryGroupPageData } from "@/lib/community/get-story-group-page-data";
import { getStoryDetailHref } from "@/lib/stories/story-routes";

export const dynamic = "force-dynamic";

type StoryGroupPageProps = {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function parseInitialTab(value?: string): StoryGroupTabId {
  if (value === "discussion") {
    return "discussion";
  }
  return "activity";
}

function StoryGroupTabsFallback() {
  return <StoryGroupActivitySkeleton count={4} />;
}

export default async function StoryGroupPage({ params, searchParams }: StoryGroupPageProps) {
  const { storyId } = await params;
  const { tab } = await searchParams;
  const { data, error } = await getStoryGroupPageData(storyId);

  if (error) {
    return (
      <section className={`page-stack ${COMMUNITY_PAGE_SHELL_CLASS}`}>
        <ErrorState message={error} title="Không thể tải nhóm truyện" />
      </section>
    );
  }

  if (!data) {
    notFound();
  }

  const readerChapterNumber = data.readingProgress?.episodeNumber ?? null;
  const initialTab = parseInitialTab(tab);

  return (
    <section className={`page-stack space-y-4 ${COMMUNITY_PAGE_SHELL_CLASS}`}>
      <Link
        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href="/community"
      >
        ← Cộng đồng
      </Link>

      <StoryGroupHeader
        activityCount={data.activityCount}
        memberCount={data.memberCount}
        story={data.story}
      />

      {data.initialActivity.items.length === 0 &&
      initialTab === "activity" &&
      data.storyPosts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
          <p className="text-base font-bold text-white">Chưa có hoạt động trong nhóm</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Hãy đọc truyện, bình luận chương hoặc mở một bài thảo luận để khởi động cộng đồng.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              className="inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-4 text-xs font-black uppercase text-zinc-950"
              href={getStoryDetailHref({
                slug: data.story.slug,
                public_code: data.story.publicCode
              })}
            >
              Đọc truyện
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-4 text-xs font-bold text-zinc-200"
              href={`/community/new?story=${data.story.id}`}
            >
              Tạo thảo luận
            </Link>
          </div>
        </div>
      ) : null}

      <Suspense fallback={<StoryGroupTabsFallback />}>
        <StoryGroupTabsPanel
          filterPresence={data.filterPresence}
          initialActivity={data.initialActivity}
          initialTab={initialTab}
          readerChapterNumber={readerChapterNumber}
          storyGroup={data.group}
          storyId={data.story.id}
          storyPosts={data.storyPosts}
          storySlug={data.story.slug}
        />
      </Suspense>
    </section>
  );
}
