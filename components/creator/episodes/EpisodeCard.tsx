import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { getStoryChapterHref } from "@/lib/stories/story-routes";
import type { CreatorEpisode } from "@/lib/creator/getCreatorStoryEpisodes";
import { submitEpisodeForReviewAction } from "@/lib/creator/submitEpisodeForReview";

type EpisodeCardProps = {
  episode: CreatorEpisode;
  storyId: string;
  storySlug: string;
  storyPublicCode: string;
  basePath?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function EpisodeCard({
  basePath = "/studio",
  episode,
  storyId,
  storySlug,
  storyPublicCode
}: EpisodeCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-cyan-300">
            Chap {episode.episode_number}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {episode.title}
          </h2>
        </div>
        <Badge>{episode.status}</Badge>
      </div>

      {episode.excerpt ? (
        <p className="line-clamp-3 text-sm leading-6 text-zinc-300">
          {episode.excerpt}
        </p>
      ) : (
        <p className="text-sm leading-6 text-zinc-500">
          Chap này chưa có excerpt.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm text-zinc-400">
        <p>{episode.word_count} từ</p>
        <p className="text-right">Cập nhật {formatDate(episode.updated_at)}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          href={`${basePath}/stories/${storyId}/episodes/${episode.id}/edit`}
        >
          Edit
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          href={getStoryChapterHref(
            { slug: storySlug, public_code: storyPublicCode },
            { slug: episode.slug, public_code: episode.publicCode }
          )}
        >
          Preview reader
        </Link>
        {episode.status === "draft" ? (
          <form action={submitEpisodeForReviewAction}>
            <input name="story_id" type="hidden" value={storyId} />
            <input name="episode_id" type="hidden" value={episode.id} />
            <Button className="w-full" type="submit">
              Submit for Review
            </Button>
          </form>
        ) : (
          <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-500">
            Đã gửi duyệt
          </span>
        )}
      </div>
    </Card>
  );
}
