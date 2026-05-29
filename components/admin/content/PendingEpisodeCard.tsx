import Link from "next/link";
import { ApproveButton } from "@/components/admin/content/ApproveButton";
import { RejectButton } from "@/components/admin/content/RejectButton";
import { Badge, Card } from "@/components/ui";
import {
  approveEpisodeAction,
  rejectEpisodeAction
} from "@/lib/admin/contentActions";
import type { PendingEpisode } from "@/lib/admin/getPendingContent";

type PendingEpisodeCardProps = {
  episode: PendingEpisode;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function PendingEpisodeCard({ episode }: PendingEpisodeCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-zinc-400">
            {episode.creatorName ?? "Tác giả"} · {episode.storyTitle}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Chap {episode.episodeNumber}: {episode.title}
          </h2>
        </div>
        <Badge variant="warning">{episode.status}</Badge>
      </div>

      {episode.excerpt ? (
        <p className="line-clamp-3 text-sm leading-6 text-zinc-300">
          {episode.excerpt}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 text-sm text-zinc-400">
        <p>{episode.wordCount} từ</p>
        <p className="text-right">Tạo ngày {formatDate(episode.createdAt)}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
          href={`/admin/content/episodes/${episode.id}`}
        >
          Review
        </Link>
        <form action={approveEpisodeAction}>
          <input name="episode_id" type="hidden" value={episode.id} />
          <ApproveButton />
        </form>
        <form action={rejectEpisodeAction}>
          <input name="episode_id" type="hidden" value={episode.id} />
          <RejectButton />
        </form>
      </div>
    </Card>
  );
}
