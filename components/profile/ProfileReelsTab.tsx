import Link from "next/link";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import { getProfileTabUrl } from "@/lib/profile/profile-url";
import { formatCompactCount } from "@/lib/profile/profileIdentity";
import type { PublicReelItem } from "@/types/public-profile";

const PAGE_SIZE = 12;

type ProfileReelsTabProps = {
  reels: PublicReelItem[];
  username: string;
  total: number;
  page: number;
};

export function ProfileReelsTab({ page, reels, total, username }: ProfileReelsTabProps) {
  if (!reels.length) {
    return (
      <ProfileEmptyState
        compact
        description="Chưa có Reels công khai."
        title="Chưa có Reels"
      />
    );
  }

  const hasPrev = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {reels.map((reel) => (
          <Link
            className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-cyan-300/25"
            href={reel.href}
            key={reel.id}
          >
            <div className="relative aspect-[9/16] max-h-48 bg-gradient-to-br from-[#162031] to-[#0b1016]">
              {reel.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  src={reel.coverUrl}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <p className="absolute inset-x-0 bottom-0 line-clamp-3 p-3 text-sm font-semibold text-white">
                {reel.title}
              </p>
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-xs text-zinc-400">{reel.excerpt}</p>
              {reel.viewCount > 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {formatCompactCount(reel.viewCount)} lượt xem
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      {(hasPrev || hasNext) && (
        <nav className="flex items-center justify-between pt-2">
          {hasPrev ? (
            <Link
              className="text-sm font-semibold text-zinc-300"
              href={getProfileTabUrl(username, "reels", page - 1) ?? "#"}
            >
              Trang trước
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              className="text-sm font-semibold text-cyan-200"
              href={getProfileTabUrl(username, "reels", page + 1) ?? "#"}
            >
              Trang sau
            </Link>
          ) : null}
        </nav>
      )}
    </div>
  );
}
