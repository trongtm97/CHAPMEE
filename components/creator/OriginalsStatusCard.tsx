import { Card, SectionHeader } from "@/components/ui";
import type { StoryOriginalsStatusRow } from "@/types/originals";

type OriginalsStatusCardProps = {
  statuses: StoryOriginalsStatusRow[];
};

export function OriginalsStatusCard({ statuses }: OriginalsStatusCardProps) {
  if (statuses.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Originals Status"
        subtitle="Trạng thái Originals của các truyện thuộc creator của bạn."
      />
      <Card className="space-y-2">
        {statuses.map((item) => (
          <div
            className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
            key={item.id}
          >
            <span className="text-zinc-300">{item.story_id.slice(0, 8)}</span>
            <span className="font-semibold text-zinc-100">{item.status}</span>
          </div>
        ))}
      </Card>
    </section>
  );
}
