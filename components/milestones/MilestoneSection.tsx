import { EmptyState, SectionHeader } from "@/components/ui";
import { MilestoneCard } from "@/components/milestones/MilestoneCard";
import type { MilestoneViewItem } from "@/types/milestone";

type MilestoneSectionProps = {
  title: string;
  subtitle: string;
  items: MilestoneViewItem[];
  emptyTitle: string;
  emptyDescription: string;
  maxVisible?: number;
  id?: string;
  action?: React.ReactNode;
};

export function MilestoneSection({
  action,
  emptyDescription,
  emptyTitle,
  id,
  items,
  maxVisible = 5,
  subtitle,
  title
}: MilestoneSectionProps) {
  const visibleItems = items.slice(0, maxVisible);

  return (
    <section className="space-y-3" id={id}>
      <SectionHeader action={action} subtitle={subtitle} title={title} />

      {visibleItems.length ? (
        <div className="grid gap-3">
          {visibleItems.map((milestone) => (
            <MilestoneCard key={milestone.id} milestone={milestone} />
          ))}
        </div>
      ) : (
        <EmptyState description={emptyDescription} title={emptyTitle} />
      )}
    </section>
  );
}
