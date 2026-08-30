import Link from "next/link";
import { ChapMeeStoryCover } from "@/components/common/ChapMeeCover";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { getStoryGroupHref } from "@/lib/community/story-group-routes";

type StoryGroupHeaderProps = {
  story: {
    id: string;
    title: string;
    slug: string;
    publicCode: string;
    coverUrl: string | null;
    authorName: string | null;
  };
  memberCount: number;
  activityCount: number;
};

export function StoryGroupHeader({
  activityCount,
  memberCount,
  story
}: StoryGroupHeaderProps) {
  return (
    <header className="chap-card overflow-hidden p-0">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="relative mx-auto aspect-[3/4] w-[6.75rem] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 sm:mx-0 sm:w-[7.5rem]">
          <ChapMeeStoryCover
            className="size-full border-0 shadow-none"
            rounded={false}
            showFallbackTitle={false}
            size="full"
            sizes="(max-width: 640px) 108px, 120px"
            story={{ title: story.title, coverUrl: story.coverUrl }}
            usage="communityCard"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2 sm:pt-0.5">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
            Nhóm truyện
          </p>
          <h1 className="text-xl font-black text-white">{story.title}</h1>
          {story.authorName ? (
            <p className="text-sm text-zinc-400">Tác giả: {story.authorName}</p>
          ) : null}
          <p className="text-xs text-zinc-500">
            {memberCount.toLocaleString("vi-VN")} thành viên ·{" "}
            {activityCount.toLocaleString("vi-VN")} hoạt động
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
            <Link
              className="inline-flex min-h-10 items-center rounded-full border border-cyan-300/25 px-4 text-xs font-bold text-cyan-100"
              href={`/community/new?story=${story.id}`}
            >
              Tạo thảo luận
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function getStoryGroupPageHref(story: { slug: string }) {
  return getStoryGroupHref(story);
}
