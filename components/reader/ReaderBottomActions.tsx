import { TrackedNextChapterLink } from "@/components/reader/TrackedNextChapterLink";
import { ReportButton } from "@/components/report/ReportButton";
import { Button } from "@/components/ui";
import { followCreatorAction } from "@/lib/actions/followCreator";
import { saveStoryAction } from "@/lib/actions/saveStory";
import type { ReaderAnalyticsContext } from "@/lib/analytics/trackReaderEvents";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import { markReadingCompleteAction } from "@/lib/reading/updateReadingProgress";
import type { StoryUserState } from "@/lib/stories/getStoryUserState";

type ReaderBottomActionsProps = {
  analyticsContext: ReaderAnalyticsContext;
  data: EpisodeReaderData;
  userState: StoryUserState;
};

export function ReaderBottomActions({
  analyticsContext,
  data,
  userState
}: ReaderBottomActionsProps) {
  const returnTo = data.chapterHref;

  return (
    <section className="space-y-4 chap-card p-4 sm:p-5">
      <div className="grid gap-3">
        <form action={markReadingCompleteAction}>
          <input name="storyId" type="hidden" value={data.story.id} />
          <input name="episodeId" type="hidden" value={data.episode.id} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <Button className="w-full min-h-12" type="submit" variant="secondary">
            Mark as read
          </Button>
        </form>
        {data.nextEpisodeNumber ? (
          <TrackedNextChapterLink
            className="tap-highlight inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_14px_30px_rgba(103,232,249,0.18)]"
            context={analyticsContext}
            href={data.nextChapterHref ?? data.storyHref}
            nextEpisodeNumber={data.nextEpisodeNumber}
          >
            Read next chap
          </TrackedNextChapterLink>
        ) : (
          <Button className="min-h-12 w-full" disabled>
            No more public chapters
          </Button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <form
            action={async () => {
              "use server";
              await saveStoryAction({
                creatorId: data.story.creatorId,
                returnTo,
                saved: !userState.isSaved,
                sourceSurface: "catalog",
                trackingSurface: "chapter_detail",
                storyId: data.story.id,
                storySlug: data.story.slug
              });
            }}
          >
            <Button className="w-full min-h-12" type="submit" variant="secondary">
              {userState.isSaved ? "Saved" : "Save"}
            </Button>
          </form>
          <form
            action={async () => {
              "use server";
              if (!data.story.creatorId) {
                return;
              }

              await followCreatorAction({
                creatorId: data.story.creatorId,
                following: !userState.isFollowingCreator,
                returnTo,
                storySlug: data.story.slug
              });
            }}
          >
            <Button
              className="w-full min-h-12"
              disabled={!data.story.creatorId}
              type="submit"
              variant="ghost"
            >
              {userState.isFollowingCreator ? "Following" : "Follow"}
            </Button>
          </form>
        </div>
        {!userState.isLoggedIn ? (
          <p className="text-center text-xs leading-5 text-zinc-500">
            Login is required for save, follow, and report actions.
          </p>
        ) : null}
        <ReportButton
          returnTo={returnTo}
          targetId={data.episode.id}
          targetType="chapter"
        />
      </div>
    </section>
  );
}
