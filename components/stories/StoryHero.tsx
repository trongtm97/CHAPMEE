import { ChapMeeCover } from "@/components/common/ChapMeeCover";
import { Card } from "@/components/ui";
import { EarlyFanBadge } from "@/components/stories/EarlyFanBadge";
import { StoryActions } from "@/components/stories/StoryActions";
import { StoryMeta } from "@/components/stories/StoryMeta";
import { OriginalsBadge } from "@/components/story/OriginalsBadge";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import type { StoryUserState } from "@/lib/stories/getStoryUserState";

type StoryHeroProps = {
  story: StoryDetail;
  userState: StoryUserState;
  showOriginalsBadge: boolean;
};

export function StoryHero({ story, userState, showOriginalsBadge }: StoryHeroProps) {
  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--surface)] shadow-[0_20px_40px_rgba(0,0,0,0.28)]">
        <div className="grid items-start gap-0 sm:grid-cols-[11rem_1fr] md:grid-cols-[12rem_1fr]">
          <ChapMeeCover
            alt={story.title}
            className="mx-auto w-full max-w-[12rem] self-start sm:max-w-[11rem] md:max-w-[12rem]"
            imgClassName="absolute inset-0 h-full w-full object-cover"
            size="full"
            src={story.coverUrl}
            title={story.title}
          />

          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <p className="page-kicker">
                {story.creatorName ?? "Tác giả ChapMee"}
              </p>
              <div className="mt-2">
                <OriginalsBadge show={showOriginalsBadge && story.originalsStatus === "original"} />
              </div>
              <h1 className="mt-2 text-2xl font-black leading-tight tracking-normal text-white sm:text-3xl">
                {story.title}
              </h1>
            </div>
            <StoryMeta story={story} />
            <EarlyFanBadge
              earlyFanCount={story.earlyFanCount}
              isEarlyFan={userState.isEarlyFan}
              storyTitle={story.title}
            />
            {story.hook ? (
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                <p className="text-lg font-bold leading-8 text-white sm:text-xl">
                  {story.hook}
                </p>
              </div>
            ) : null}
            {story.shortDescription ? (
              <p className="text-[0.98rem] leading-7 text-zinc-300">
                {story.shortDescription}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <Card className="space-y-5">
        {showOriginalsBadge && story.originalsStatus === "original" ? (
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            Tác phẩm được chọn vào ChapMee Originals.
          </p>
        ) : null}
        {story.longDescription ? (
          <p className="text-[0.98rem] leading-7 text-zinc-300">
            {story.longDescription}
          </p>
        ) : null}
        <StoryActions
          returnTo={getStoryDetailHref({ slug: story.slug, public_code: story.publicCode })}
          story={story}
          userState={userState}
        />
      </Card>
    </section>
  );
}
