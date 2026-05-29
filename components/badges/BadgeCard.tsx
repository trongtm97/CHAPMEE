import { Badge, Card } from "@/components/ui";
import type { BadgeViewItem } from "@/types/badge";

type BadgeCardProps = {
  badge: BadgeViewItem;
};

const rarityLabel: Record<BadgeViewItem["definition"]["rarity"], string> = {
  common: "Phổ thông",
  rare: "Hiếm",
  epic: "Sử thi",
  legendary: "Huyền thoại"
};

const rarityVariant: Record<BadgeViewItem["definition"]["rarity"], "default" | "success" | "warning" | "danger"> = {
  common: "default",
  rare: "success",
  epic: "warning",
  legendary: "danger"
};

export function BadgeCard({ badge }: BadgeCardProps) {
  const typeLabel: Record<BadgeViewItem["definition"]["type"], string> = {
    reader: "Đọc",
    author: "Tác giả",
    general: "Chung"
  };

  return (
    <Card className="space-y-4 border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/15 text-xl">
          {badge.definition.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-black tracking-normal text-white">
                {badge.definition.name}
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                {badge.definition.description}
              </p>
            </div>
            <Badge variant={rarityVariant[badge.definition.rarity]}>
              {rarityLabel[badge.definition.rarity]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="default">{typeLabel[badge.definition.type]}</Badge>
        <Badge variant="success">{badge.unlockLabel}</Badge>
        {badge.relatedStoryId ? <Badge variant="warning">Theo truyện</Badge> : null}
      </div>
    </Card>
  );
}
