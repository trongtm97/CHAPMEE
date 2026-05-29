import { EmptyState, SectionHeader } from "@/components/ui";
import { PendingEpisodeCard } from "@/components/admin/content/PendingEpisodeCard";
import type { PendingEpisode } from "@/lib/admin/getPendingContent";

type PendingEpisodesQueueProps = {
  episodes: PendingEpisode[];
};

export function PendingEpisodesQueue({ episodes }: PendingEpisodesQueueProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Chap cần được duyệt trước khi độc giả đọc công khai."
        title="Chương chờ duyệt"
      />
      {episodes.length ? (
        <div className="space-y-3">
          {episodes.map((episode) => (
            <PendingEpisodeCard episode={episode} key={episode.id} />
          ))}
        </div>
      ) : (
        <EmptyState
          description="Không có chap nào đang chờ duyệt."
          title="Hàng đợi trống"
        />
      )}
    </section>
  );
}
