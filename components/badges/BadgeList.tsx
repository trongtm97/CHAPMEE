import { EmptyState, SectionHeader } from "@/components/ui";
import { BadgeCard } from "@/components/badges/BadgeCard";
import type { BadgeViewItem } from "@/types/badge";

type BadgeListProps = {
  items: BadgeViewItem[];
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDescription: string;
  maxVisible?: number;
  seeAllLabel?: string;
};

export function BadgeList({
  emptyDescription,
  emptyTitle,
  items,
  maxVisible = 4,
  seeAllLabel = "Xem thêm",
  subtitle,
  title
}: BadgeListProps) {
  const visibleItems = items.slice(0, maxVisible);
  const overflowItems = items.slice(maxVisible);

  return (
    <section className="space-y-3">
      <SectionHeader subtitle={subtitle} title={title} />

      {items.length ? (
        <div className="space-y-3">
          <div className="grid gap-3">
            {visibleItems.map((badge) => (
              <BadgeCard badge={badge} key={badge.id} />
            ))}
          </div>

          {overflowItems.length ? (
            <details className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-cyan-200">
                {seeAllLabel} {overflowItems.length} badge
              </summary>
              <div className="mt-4 grid gap-3">
                {overflowItems.map((badge) => (
                  <BadgeCard badge={badge} key={badge.id} />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <EmptyState description={emptyDescription} title={emptyTitle} />
      )}
    </section>
  );
}
