import { Badge, Card } from "@/components/ui";
import type { BadgeViewItem } from "@/types/badge";

type PublicBadgeItemCardProps = {
  badge: BadgeViewItem;
};

export function PublicBadgeItemCard({ badge }: PublicBadgeItemCardProps) {
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <span aria-hidden="true" className="text-2xl">
          {badge.definition.icon || "🏅"}
        </span>
        <Badge variant="success">Đã mở</Badge>
      </div>
      <h3 className="text-sm font-bold text-white">{badge.definition.name}</h3>
      <p className="text-xs leading-5 text-zinc-400">{badge.definition.description}</p>
      {badge.unlockLabel ? (
        <p className="text-[0.65rem] text-zinc-600">Mở ngày {badge.unlockLabel}</p>
      ) : null}
    </Card>
  );
}
