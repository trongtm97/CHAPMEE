import { Card, EmptyState, SectionHeader } from "@/components/ui";
import type { CreatorEpisodeAnalytics } from "@/lib/creator/getCreatorAnalytics";

type CreatorEpisodeAnalyticsTableProps = {
  episodes: CreatorEpisodeAnalytics[];
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function CreatorEpisodeAnalyticsTable({
  episodes
}: CreatorEpisodeAnalyticsTableProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Theo tung chap" />
      {episodes.length ? (
        <div className="space-y-3">
          {episodes.map((episode) => (
            <Card className="space-y-3" key={episode.id}>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-cyan-300">
                  {episode.storyTitle}
                </p>
                <h2 className="mt-1 text-base font-semibold text-white">
                  Chap {episode.episodeNumber}: {episode.title}
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Metric label="Bat dau" value={episode.starts} />
                <Metric label="Xong" value={episode.completions} />
                <Metric label="Ti le" value={`${episode.completionRate}%`} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Khi chap co start_reading hoac complete_chap, du lieu se hien thi tai day."
          title="Chua co du lieu chap"
        />
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
      <p className="text-base font-semibold text-white">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
