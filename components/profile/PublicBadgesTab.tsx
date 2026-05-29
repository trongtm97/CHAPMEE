import { EmptyState } from "@/components/ui";
import { PublicBadgeItemCard } from "@/components/profile/PublicBadgeItemCard";
import type { BadgeViewItem } from "@/types/badge";

type PublicBadgesTabProps = {
  badgeItems: BadgeViewItem[];
  showBadges: boolean;
};

export function PublicBadgesTab({ badgeItems, showBadges }: PublicBadgesTabProps) {
  if (!showBadges) {
    return (
      <EmptyState
        description="Người dùng này chưa công khai thành tích."
        title="Thành tích riêng tư"
      />
    );
  }

  if (!badgeItems.length) {
    return (
      <EmptyState
        description="Hãy quay lại sau khi người dùng mở khóa thêm thành tích."
        title="Chưa có thành tích"
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {badgeItems.map((badge) => (
        <PublicBadgeItemCard badge={badge} key={badge.id} />
      ))}
    </div>
  );
}
