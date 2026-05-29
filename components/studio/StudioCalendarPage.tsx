import { ScheduledPublicationRow } from "@/components/studio/ScheduledPublicationRow";
import { StudioManagerTabs } from "@/components/studio/StudioManagerTabs";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { EmptyState } from "@/components/ui";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import type { CalendarListTab } from "@/types/scheduling";
import type { ScheduledPublicationListItem } from "@/types/scheduling";

const TABS: Array<{ label: string; value: CalendarListTab }> = [
  { label: "Sắp tới", value: "upcoming" },
  { label: "Đã đăng", value: "published" },
  { label: "Lỗi", value: "failed" },
  { label: "Đã hủy", value: "canceled" }
];

type StudioCalendarPageProps = {
  items: ScheduledPublicationListItem[];
  counts: Record<CalendarListTab, number>;
  activeTab: CalendarListTab;
  page: number;
  totalPages: number;
  query: Record<string, string | undefined>;
};

export function StudioCalendarPage({
  activeTab,
  counts,
  items,
  page,
  query,
  totalPages
}: StudioCalendarPageProps) {
  const basePath = studioPath("/calendar");

  return (
    <div className="space-y-6">
      <StudioManagerTabs
        active={activeTab}
        basePath={basePath}
        counts={counts}
        filterParam="tab"
        query={query}
        tabs={TABS}
      />

      {items.length === 0 ? (
        <EmptyState
          description="Lên lịch từ editor truyện hoặc chương để thấy mục tại đây."
          title="Chưa có lịch đăng trong mục này"
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ScheduledPublicationRow item={item} key={item.id} />
          ))}
        </div>
      )}

      <StudioPagination
        buildHref={(nextPage) =>
          buildStudioManagerHref(basePath, { ...query, page: String(nextPage) })
        }
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
