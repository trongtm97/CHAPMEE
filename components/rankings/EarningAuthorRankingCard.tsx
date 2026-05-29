import Link from "next/link";
import { Card, Badge, AvatarFallback } from "@/components/ui";
import type { EarningAuthorRankingItem } from "@/types/ranking";

type EarningAuthorRankingCardProps = {
  item: EarningAuthorRankingItem;
};

export function EarningAuthorRankingCard({
  item
}: EarningAuthorRankingCardProps) {
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
    <Link className="tap-highlight block" href={`/creators/${item.userId}`}>
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
            name={item.penName}
            size="md"
            src={item.avatarUrl}
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-black tracking-normal text-white">
              {item.penName}
            </h3>
            <p className="mt-1 truncate text-xs font-medium text-zinc-400">
              {item.supporterCount} người ủng hộ
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Doanh thu nổi bật</Badge>
          {item.supporterCount > 0 && (
            <Badge variant="default">{item.supporterCount} supporter</Badge>
          )}
          {item.paidReaderCount > 0 && (
            <Badge variant="default">
              {item.paidReaderCount} độc giả
            </Badge>
          )}
        </div>
        <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950">
          Xem tác giả
        </span>
      </Card>
    </Link>
  );
}
