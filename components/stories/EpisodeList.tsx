import Link from "next/link";
import { EmptyState, SectionHeader } from "@/components/ui";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

type EpisodeListProps = {
  story: StoryDetail;
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function EpisodeList({ story }: EpisodeListProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Episodes" />
      {story.episodes.length === 0 ? (
        <EmptyState
          description="This story does not have a public episode yet."
          title="No episodes yet"
        />
      ) : (
        <div className="space-y-3">
          {story.episodes.map((episode) => (
            <Link
              className="tap-highlight block rounded-[1.25rem] border border-white/10 bg-[var(--surface)] p-4 shadow-[0_16px_32px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[var(--surface-soft)]"
              href={`/stories/${story.slug}/episodes/${episode.episodeNumber}`}
              key={episode.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="page-kicker">Chap {episode.episodeNumber}</p>
                  <h3 className="mt-1 line-clamp-2 text-base font-black text-white">
                    {episode.title}
                  </h3>
                </div>
                {formatDate(episode.publishedAt) ? (
                  <span className="shrink-0 text-xs font-medium text-zinc-500">
                    {formatDate(episode.publishedAt)}
                  </span>
                ) : null}
              </div>
              {episode.excerpt ? (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">
                  {episode.excerpt}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
