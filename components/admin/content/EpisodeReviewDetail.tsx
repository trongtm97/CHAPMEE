import { EpisodePreview } from "@/components/creator/episodes/EpisodePreview";
import { ApproveButton } from "@/components/admin/content/ApproveButton";
import { RejectWithNoteForm } from "@/components/admin/content/RejectWithNoteForm";
import { Badge, Card, SectionHeader } from "@/components/ui";
import {
  approveEpisodeAction,
  rejectEpisodeAction
} from "@/lib/admin/contentActions";
import type { EpisodeForReview } from "@/lib/admin/getEpisodeForReview";
import { createExcerpt } from "@/lib/text/createExcerpt";

type EpisodeReviewDetailProps = {
  episode: EpisodeForReview;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function EpisodeReviewDetail({ episode }: EpisodeReviewDetailProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          subtitle={`${episode.storyTitle} · ${episode.creatorName ?? "Tác giả"}`}
          title={`Chap ${episode.episodeNumber}: ${episode.title}`}
        />
        <Badge variant={episode.status === "pending" ? "warning" : "default"}>
          {episode.status}
        </Badge>
      </div>

      <Card className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Word count</dt>
            <dd className="mt-1 text-zinc-200">{episode.wordCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Created</dt>
            <dd className="mt-1 text-zinc-200">
              {formatDate(episode.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Updated</dt>
            <dd className="mt-1 text-zinc-200">
              {formatDate(episode.updatedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Published</dt>
            <dd className="mt-1 text-zinc-200">
              {formatDate(episode.publishedAt)}
            </dd>
          </div>
        </dl>
        <div>
          <p className="text-sm font-medium text-zinc-500">Excerpt</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            {episode.excerpt || createExcerpt(episode.content)}
          </p>
        </div>
      </Card>

      <EpisodePreview
        content={episode.content}
        creatorName={episode.creatorName ?? "Tác giả"}
        episodeNumber={episode.episodeNumber}
        episodeTitle={episode.title}
        excerpt={episode.excerpt || createExcerpt(episode.content)}
        storyTitle={episode.storyTitle}
      />

      {episode.status === "pending" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form action={approveEpisodeAction}>
            <input name="episode_id" type="hidden" value={episode.id} />
            <ApproveButton />
          </form>
          <RejectWithNoteForm
            action={rejectEpisodeAction}
            idFieldName="episode_id"
            idValue={episode.id}
          />
        </div>
      ) : null}
    </section>
  );
}
