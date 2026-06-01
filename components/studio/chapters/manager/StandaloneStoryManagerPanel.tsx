import Link from "next/link";
import { StoryStructureBadge } from "@/components/studio/stories/StoryStructureSelector";
import { StudioStatusBadge } from "@/components/studio/StudioStatusBadge";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { studioPath } from "@/lib/studio/constants";
import type { StudioStoryHeader } from "@/lib/studio/get-studio-chapters";

type StandaloneStoryManagerPanelProps = {
  story: StudioStoryHeader;
  storyId: string;
};

function canViewPublicStory(story: StudioStoryHeader) {
  return (
    (story.status === "published" || story.status === "approved") &&
    story.visibility === "public"
  );
}

export function StandaloneStoryManagerPanel({
  story,
  storyId
}: StandaloneStoryManagerPanelProps) {
  const publicHref = getStoryDetailHref({
    public_code: story.publicCode,
    slug: story.slug
  });

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-b from-violet-500/10 to-transparent p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StoryStructureBadge structureType="standalone" />
          <StudioStatusBadge kind="story" status={story.displayStatus} />
        </div>
        <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">{story.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Truyện một phần không dùng danh sách chương. Toàn bộ nội dung nằm trên một trang — bạn
          soạn và xuất bản tại khu vực nội dung truyện.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300"
            href={studioPath(`/stories/${storyId}/content`)}
          >
            Sửa nội dung truyện
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            href={studioPath(`/stories/${storyId}/edit`)}
          >
            Cài đặt truyện
          </Link>
          {canViewPublicStory(story) ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
              href={publicHref}
            >
              Xem trang truyện
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
