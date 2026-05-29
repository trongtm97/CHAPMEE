import Link from "next/link";
import { VerifiedName } from "@/components/profile/VerifiedBadge";
import { AvatarFallback } from "@/components/ui/AvatarFallback";
import type { SwipeItem } from "@/lib/swipe/getSwipeItems";

type SwipeAuthorPanelProps = {
  item: SwipeItem;
  isFollowBusy?: boolean;
  onToggleFollow: () => void;
};

export function SwipeAuthorPanel({
  item,
  isFollowBusy = false,
  onToggleFollow
}: SwipeAuthorPanelProps) {
  const creatorName = item.creatorName ?? "Tác giả ChapMee";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/90">Tác giả</p>
      <div className="mt-3 flex items-center gap-3">
        <AvatarFallback name={creatorName} size="md" src={item.creatorAvatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">
            <VerifiedName badge={item.creatorVerification} name={creatorName} />
          </p>
          <p className="truncate text-xs text-zinc-400">
            {item.creatorHandle ? `@${item.creatorHandle}` : "Người sáng tác"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-full bg-white px-3 py-2 text-xs font-bold text-zinc-950 disabled:opacity-60"
          disabled={!item.creatorId || isFollowBusy}
          onClick={onToggleFollow}
          type="button"
        >
          {item.isFollowingCreator ? "Đang theo dõi" : "Theo dõi"}
        </button>
        {item.creatorId ? (
          <Link
            className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-100"
            href={`/creators/${item.creatorId}`}
          >
            Hồ sơ tác giả
          </Link>
        ) : null}
      </div>
    </section>
  );
}
