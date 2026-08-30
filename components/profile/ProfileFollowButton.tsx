import Link from "next/link";
import { CreatorFollowButton } from "@/components/creators/CreatorFollowButton";
import { UserFollowButton } from "@/components/profile/UserFollowButton";
import type { PublicProfilePageData } from "@/types/public-profile";

type ProfileFollowButtonProps = {
  data: PublicProfilePageData;
  returnTo: string;
  actionClassName?: string;
};

export function ProfileFollowButton({
  actionClassName,
  data,
  returnTo
}: ProfileFollowButtonProps) {
  if (data.viewer.isOwner) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          className={
            actionClassName ??
            "inline-flex h-9 flex-1 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm font-semibold text-zinc-100 transition hover:border-white/20"
          }
          href="/me/settings"
        >
          Sửa hồ sơ
        </Link>
        {data.user.isCreator ? (
          <Link
            className={
              actionClassName
                ? `${actionClassName} bg-cyan-300 text-zinc-950 hover:bg-cyan-200`
                : "inline-flex h-9 flex-1 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            }
            href="/studio"
          >
            Vào Studio
          </Link>
        ) : null}
      </div>
    );
  }

  const target = data.viewer.followTarget;
  if (target?.type === "creator") {
    return (
      <CreatorFollowButton
        buttonClassName={actionClassName}
        creatorId={target.creatorId}
        isFollowing={data.viewer.isFollowing}
        isLoggedIn={Boolean(data.viewer.userId)}
        returnTo={returnTo}
      />
    );
  }

  if (target?.type === "user") {
    return (
      <UserFollowButton
        allowFollow={data.privacy.allowFollow}
        buttonClassName={actionClassName}
        followingId={target.userId}
        isFollowing={data.viewer.isFollowing}
        isLoggedIn={Boolean(data.viewer.userId)}
        isOwner={data.viewer.isOwner}
        returnTo={returnTo}
        username={data.user.username}
      />
    );
  }

  return null;
}
