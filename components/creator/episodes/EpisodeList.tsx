import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { EpisodeCard } from "@/components/creator/episodes/EpisodeCard";
import type { CreatorEpisode } from "@/lib/creator/getCreatorStoryEpisodes";

type EpisodeListProps = {
  episodes: CreatorEpisode[];
  storyId: string;
  storySlug: string;
  storyPublicCode: string;
  basePath?: string;
};

export function EpisodeList({
  basePath = "/studio",
  episodes,
  storyId,
  storySlug,
  storyPublicCode
}: EpisodeListProps) {
  if (episodes.length === 0) {
    return (
      <EmptyState
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            href={`${basePath}/stories/${storyId}/episodes/new`}
          >
            Viết chap mới
          </Link>
        }
        description="Khi bạn viết chap đầu tiên, danh sách quản lý sẽ xuất hiện ở đây."
        title="Chưa có chap nào"
      />
    );
  }

  return (
    <div className="space-y-3">
      {episodes.map((episode) => (
        <EpisodeCard
          basePath={basePath}
          episode={episode}
          key={episode.id}
          storyId={storyId}
          storyPublicCode={storyPublicCode}
          storySlug={storySlug}
        />
      ))}
    </div>
  );
}
