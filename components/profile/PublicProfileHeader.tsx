import { AvatarFallback, Badge, Card } from "@/components/ui";
import { StatCard } from "@/components/profile/StatCard";
import { ProfileShareButton } from "@/components/me/ProfileShareButton";
import { ProfileActionMenu } from "@/components/profile/ProfileActionMenu";
import { UserFollowButton } from "@/components/profile/UserFollowButton";
import { StartMessageButton } from "@/components/messages/StartMessageButton";
import { VerifiedName } from "@/components/profile/VerifiedBadge";
import type { PublicProfilePageData } from "@/types/public-profile";
import { getShareUrl } from "@/lib/share/getShareUrl";

type PublicProfileHeaderProps = {
  data: PublicProfilePageData;
};

export function PublicProfileHeader({ data }: PublicProfileHeaderProps) {
  const shareUrl = getShareUrl(`/profile/${data.user.username}`);

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative px-4 pb-4 pt-5 sm:px-5">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.12),transparent_28%)]"
        />
        <div className="relative flex items-start gap-3">
          <AvatarFallback
            className="ring-2 ring-white/10"
            name={data.user.displayName}
            size="lg"
            src={data.user.avatarUrl}
          />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-black leading-tight text-white sm:text-2xl">
              <VerifiedName
                badge={data.user.verification}
                name={data.user.displayName}
                nameClassName="break-words"
              />
            </h1>
            <p className="mt-1 truncate text-sm text-zinc-400">{data.user.handle}</p>
            {data.badges.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.badges.slice(0, 6).map((badge) => (
                  <Badge key={badge.label} variant={badge.tone ?? "default"}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ProfileShareButton
              shareText={data.user.bio ?? data.user.displayName}
              shareUrl={shareUrl}
              title={data.user.displayName}
            />
            <ProfileActionMenu
              isOwner={data.viewer.isOwner}
              returnTo={`/profile/${data.user.username}`}
              targetUserId={data.user.id}
            />
          </div>
        </div>

        {data.user.bio ? (
          <p className="relative mt-3 line-clamp-4 text-sm leading-6 text-zinc-300">
            {data.user.bio}
          </p>
        ) : null}

        {data.stats.length ? (
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {data.stats.slice(0, 5).map((stat) => (
              <StatCard hint={stat.hint} key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        ) : null}

        <div className="relative mt-4 flex flex-wrap gap-2">
          <UserFollowButton
            allowFollow={data.privacy.allowFollow}
            followingId={data.user.id}
            isFollowing={data.viewer.isFollowing}
            isLoggedIn={Boolean(data.viewer.userId)}
            isOwner={data.viewer.isOwner}
            returnTo={getShareUrl(`/profile/${data.user.username}`)}
            username={data.user.username}
          />
          {!data.viewer.isOwner ? (
            <StartMessageButton
              canMessage={data.messaging.canMessage}
              canShowButton={data.messaging.canShowButton}
              loginRequired={data.messaging.loginRequired}
              mode={data.messaging.mode}
              reason={data.messaging.reason}
              recipientId={data.user.id}
              returnTo={getShareUrl(`/profile/${data.user.username}`)}
            />
          ) : null}
        </div>
      </div>
    </Card>
  );
}
