import Link from "next/link";
import { Card, Badge, AvatarFallback } from "@/components/ui";
import type { SupporterRankingItem } from "@/types/ranking";

type SupporterRankingCardProps = {
  item: SupporterRankingItem;
};

export function SupporterRankingCard({ item }: SupporterRankingCardProps) {
  const rankColor =
    item.rank === 1
      ? "text-amber-300"
      : item.rank === 2
        ? "text-zinc-200"
        : item.rank === 3
          ? "text-orange-400"
          : "text-zinc-400";

  const rankBg =
    item.rank <= 3
      ? "bg-white/10 border-white/15"
      : "bg-white/[0.04] border-white/8";

  return (
    <Link className="tap-highlight block" href={`/me`}>
      <Card className="space-y-3 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[var(--surface-soft)]">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-center ${rankBg}`}
          >
            <span className={`text-sm font-black leading-none ${rankColor}`}>
              {item.rank}
            </span>
          </div>
          <AvatarFallback
            className="ring-1 ring-white/10"
            name={item.isAnonymous ? "Người ủng hộ ẩn danh" : item.displayName}
            size="md"
            src={item.isAnonymous ? null : item.avatarUrl}
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-black tracking-normal text-white">
              {item.isAnonymous
                ? "Người ủng hộ ẩn danh"
                : item.displayName}
            </h3>
            {!item.isAnonymous && item.username && (
              <p className="mt-1 truncate text-xs font-medium text-zinc-400">
                @{item.username}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="warning">Fan Vàng</Badge>
          {item.supportCount > 0 && (
            <Badge variant="default">
              {item.supportCount} lần ủng hộ
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}
