import Link from "next/link";
import { getCommunityAuthorHref } from "@/lib/community/community-author-url";
import { AvatarFallback } from "@/components/ui";
import { formatCompactCount } from "@/lib/profile/profileIdentity";
import type { AuthorCommunityGroup } from "@/types/community";

type AuthorGroupCardProps = {
  group: AuthorCommunityGroup;
};

export function AuthorGroupCard({ group }: AuthorGroupCardProps) {
  return (
    <Link
      className="tap-highlight flex w-[9.5rem] shrink-0 flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center transition hover:border-cyan-300/30"
      href={getCommunityAuthorHref(group)}
    >
      <AvatarFallback className="mx-auto" name={group.name} size="sm" src={group.avatarUrl} />
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-white">{group.name}</p>
      <p className="mt-1 text-[0.68rem] text-zinc-500">
        {formatCompactCount(group.followerCount)} theo dõi · {formatCompactCount(group.storyCount)} truyện
      </p>
      <p
        className={`mt-1 text-[0.68rem] font-semibold ${
          group.isReplying ? "text-cyan-200" : "text-zinc-400"
        }`}
      >
        {group.statusLine}
      </p>
    </Link>
  );
}
