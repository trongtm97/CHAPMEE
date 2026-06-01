import Link from "next/link";
import { ChapterFormatBadge } from "@/components/studio/presentation/ChapterFormatBadge";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import type { CreatorEpisode } from "@/lib/creator/getCreatorStoryEpisodes";
import { submitEpisodeForReviewAction } from "@/lib/creator/submitEpisodeForReview";

type StudioEpisodeTableProps = {
  basePath?: string;
  episodes: CreatorEpisode[];
  storyId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function previewReaderHref(storyId: string, episodeId: string) {
  return `/studio/stories/${storyId}/episodes/${episodeId}/preview?mode=reader`;
}

function previewReelsHref(storyId: string, episodeId: string) {
  return `/studio/stories/${storyId}/episodes/${episodeId}/preview?mode=reels`;
}

export function StudioEpisodeTable({
  basePath = "/studio",
  episodes,
  storyId
}: StudioEpisodeTableProps) {
  if (episodes.length === 0) {
    return (
      <EmptyState
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            href={`${basePath}/stories/${storyId}/episodes/new`}
          >
            Viết chap mới
          </Link>
        }
        description="Khi bạn viết chap đầu tiên, danh sách quản lý sẽ hiện ở đây."
        title="Chưa có chap nào"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] lg:block">
        <div className="grid grid-cols-[7rem_minmax(0,1.8fr)_8rem_8rem_10rem_18rem] gap-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
          <span>Episode</span>
          <span>Title</span>
          <span>Word count</span>
          <span>Status</span>
          <span>Updated</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-white/10">
          {episodes.map((episode) => (
            <div
              className="grid grid-cols-[7rem_minmax(0,1.8fr)_8rem_8rem_10rem_18rem] gap-3 px-4 py-4 text-sm"
              key={episode.id}
            >
              <p className="font-semibold text-white">
                {episode.episode_number}
              </p>
              <p className="flex min-w-0 items-center gap-2 truncate text-zinc-100">
                <span className="truncate">{episode.title}</span>
                <ChapterFormatBadge contentFormat={episode.content_format} />
              </p>
              <p className="text-zinc-200">{episode.word_count}</p>
              <Badge className="w-fit">{episode.status}</Badge>
              <p className="text-zinc-400">{formatDate(episode.updated_at)}</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
                  href={`${basePath}/stories/${storyId}/episodes/${episode.id}/edit`}
                >
                  Edit
                </Link>
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
                  href={previewReaderHref(storyId, episode.id)}
                >
                  Preview
                </Link>
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
                  href={previewReelsHref(storyId, episode.id)}
                >
                  Reels
                </Link>
                {episode.status === "draft" ? (
                  <form action={submitEpisodeForReviewAction}>
                    <input name="story_id" type="hidden" value={storyId} />
                    <input name="episode_id" type="hidden" value={episode.id} />
                    <input
                      name="return_base_path"
                      type="hidden"
                      value={basePath}
                    />
                    <Button className="min-h-10 px-3 py-2 text-xs" type="submit">
                      Submit for Review
                    </Button>
                  </form>
                ) : (
                  <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-500">
                    Submitted
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {episodes.map((episode) => (
          <Card className="space-y-4" key={episode.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-sky-300">
                  Episode {episode.episode_number}
                </p>
                <h3 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-white">
                  {episode.title}
                  <ChapterFormatBadge contentFormat={episode.content_format} />
                </h3>
              </div>
              <Badge>{episode.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-zinc-400">
              <p>{episode.word_count} words</p>
              <p className="text-right">{formatDate(episode.updated_at)}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                href={`${basePath}/stories/${storyId}/episodes/${episode.id}/edit`}
              >
                Edit
              </Link>
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
                href={previewReaderHref(storyId, episode.id)}
              >
                Preview
              </Link>
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/10"
                href={previewReelsHref(storyId, episode.id)}
              >
                Reels
              </Link>
              {episode.status === "draft" ? (
                <form action={submitEpisodeForReviewAction}>
                  <input name="story_id" type="hidden" value={storyId} />
                  <input name="episode_id" type="hidden" value={episode.id} />
                  <input
                    name="return_base_path"
                    type="hidden"
                    value={basePath}
                  />
                  <Button className="w-full" type="submit">
                    Submit for Review
                  </Button>
                </form>
              ) : (
                <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-500">
                  Submitted
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
