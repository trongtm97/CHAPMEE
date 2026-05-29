import Link from "next/link";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import type { CreatorStoryAnalytics } from "@/lib/creator/getCreatorAnalytics";

type CreatorStoryAnalyticsTableProps = {
  stories: CreatorStoryAnalytics[];
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function CreatorStoryAnalyticsTable({
  stories
}: CreatorStoryAnalyticsTableProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Theo tung story" />
      {stories.length ? (
        <div className="space-y-3">
          {stories.map((story) => (
            <Card className="space-y-3" key={story.id}>
              <div>
                <Link
                  className="text-base font-semibold text-white hover:text-cyan-200"
                  href={`/stories/${story.slug}`}
                >
                  {story.title}
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Metric label="Mo" value={story.opens} />
                <Metric label="Bat dau" value={story.episodeStarts} />
                <Metric label="Xong" value={story.completions} />
                <Metric label="Luu" value={story.saves} />
                <Metric label="Binh luan" value={story.comments} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Khi story co luot doc, luot luu hoac binh luan, du lieu se xuat hien tai day."
          title="Chua co du lieu story"
        />
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
      <p className="text-base font-semibold text-white">
        {formatNumber(value)}
      </p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
