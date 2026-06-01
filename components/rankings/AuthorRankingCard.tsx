import Link from "next/link";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import { Card, Badge, AvatarFallback } from "@/components/ui";
import type { AuthorRankingItem } from "@/types/ranking";

type AuthorRankingCardProps = {
  item: AuthorRankingItem;
};

export function AuthorRankingCard({ item }: AuthorRankingCardProps) {
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
    <Link
      className="tap-highlight block"
      href={getProfileUrlOrFallback(item.username)}
    >
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
            name={item.displayName}
            size="md"
            src={item.avatarUrl}
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-black tracking-normal text-white">
              {item.displayName}
            </h3>
            <p className="mt-1 truncate text-xs font-medium text-zinc-400">
              {item.storyCount} truyện · {formatCount(item.followerCount)} người theo dõi
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">
            {formatCount(item.totalReads)} lượt đọc
          </Badge>
          <Badge variant="success">{item.score} điểm</Badge>
        </div>
        <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950">
          Xem tác giả
        </span>
      </Card>
    </Link>
  );
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}
