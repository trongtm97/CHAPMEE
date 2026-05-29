import Link from "next/link";
import { ReportButton } from "@/components/report/ReportButton";
import { CollectionActions } from "@/components/collections";
import { Button } from "@/components/ui";
import { followCreatorAction } from "@/lib/actions/followCreator";
import { followStoryAction } from "@/lib/actions/followStory";
import { saveStoryAction } from "@/lib/actions/saveStory";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import type { StoryUserState } from "@/lib/stories/getStoryUserState";

type StoryActionsProps = {
  story: StoryDetail;
  userState: StoryUserState;
  returnTo: string;
};

export function StoryActions({
  returnTo,
  story,
  userState
}: StoryActionsProps) {
  const firstEpisode = story.episodes[0];

  return (
    <div className="grid gap-3">
      {firstEpisode ? (
        <Link
          className="tap-highlight inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_14px_30px_rgba(103,232,249,0.18)] transition hover:bg-cyan-200"
          href={`/stories/${story.slug}/episodes/${firstEpisode.episodeNumber}`}
        >
          Start reading
        </Link>
      ) : (
        <Button className="min-h-12" disabled>
          Start reading
        </Button>
      )}
      <div className="grid grid-cols-2 gap-3">
        <form
          action={async () => {
            "use server";
            await saveStoryAction({
              creatorId: story.creatorId,
              returnTo,
              saved: !userState.isSaved,
              storyId: story.id,
              storySlug: story.slug
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
            await followStoryAction({
              creatorId: story.creatorId,
              following: !userState.isFollowingStory,
              returnTo,
              storyId: story.id,
              storySlug: story.slug,
              storyTitle: story.title
            });
          }}
        >
          <Button
            className="w-full min-h-12"
            type="submit"
            variant={userState.isFollowingStory ? "secondary" : "primary"}
          >
            {userState.isFollowingStory ? "Đang theo dõi truyện" : "Theo dõi truyện"}
          </Button>
        </form>
      </div>
      <CollectionActions storyId={story.id} storyTitle={story.title} loggedIn={userState.isLoggedIn} />
      <form
        action={async () => {
          "use server";
          if (!story.creatorId) {
            return;
          }

          await followCreatorAction({
            creatorId: story.creatorId,
            following: !userState.isFollowingCreator,
            returnTo,
            storySlug: story.slug
          });
        }}
      >
        <Button
          className="w-full min-h-12"
          disabled={!story.creatorId}
          type="submit"
          variant="ghost"
        >
          {userState.isFollowingCreator ? "Đang theo dõi" : "Theo dõi tác giả"}
        </Button>
      </form>
      {!userState.isLoggedIn ? (
        <p className="text-center text-xs leading-5 text-zinc-500">
          Login is required for save, follow, and report actions.
        </p>
      ) : null}
      <ReportButton
        returnTo={returnTo}
        targetId={story.id}
        targetType="story"
      />
    </div>
  );
}
