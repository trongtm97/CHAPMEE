import { EmptyState, SectionHeader } from "@/components/ui";
import { TopFanBadge } from "@/components/fans/TopFanBadge";
import type { TopFanHighlight, TopFanPerson } from "@/types/fan";

type TopFanItem = TopFanPerson | TopFanHighlight;

type TopFansSectionProps = {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDescription: string;
  items: TopFanItem[];
  currentUserTip?: string;
  challengeTip?: string;
  maxVisible?: number;
};

function isPersonItem(item: TopFanItem): item is TopFanPerson {
  return "displayName" in item;
}

export function TopFansSection({
  challengeTip = "Đọc, bình luận, save và share để leo vào top.",
  currentUserTip = "Bạn đang có mặt trong danh sách Top Fan.",
  emptyDescription,
  emptyTitle,
  items,
  maxVisible = 5,
  subtitle,
  title
}: TopFansSectionProps) {
  const visibleItems = items.slice(0, maxVisible);
  const currentUserItem = visibleItems.find((item) =>
    isPersonItem(item) ? item.isCurrentUser : false
  );

  return (
    <section className="space-y-3">
      <SectionHeader subtitle={subtitle} title={title} />

      {items.length ? (
        <div className="space-y-3">
          {currentUserItem ? (
            <div className="rounded-[1.35rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-medium text-cyan-50">
              {currentUserTip.replace("{rank}", String(currentUserItem.rank))}
            </div>
          ) : challengeTip ? (
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-zinc-300">
              {challengeTip}
            </div>
          ) : null}

          <div className="grid gap-3">
            {visibleItems.map((item) => (
              <TopFanBadge item={item} key={item.id} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState description={emptyDescription} title={emptyTitle} />
      )}
    </section>
  );
}
