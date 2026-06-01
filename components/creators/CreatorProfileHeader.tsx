import Link from "next/link";
import { CreatorFollowButton } from "@/components/creators/CreatorFollowButton";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import type { PublicCreatorProfile } from "@/lib/creators/getPublicCreatorProfile";
import { getProfileUrl } from "@/lib/profile/profile-url";

type CreatorProfileHeaderProps = {
  creator: PublicCreatorProfile;
  returnTo: string;
};

export function CreatorProfileHeader({
  creator,
  returnTo
}: CreatorProfileHeaderProps) {
  const profileHref = getProfileUrl(creator.handle);

  return (
    <ProfileHeader
      action={
        <CreatorFollowButton
          creatorId={creator.id}
          isFollowing={creator.isFollowing}
          isLoggedIn={creator.isLoggedIn}
          returnTo={returnTo}
        />
      }
      avatarName={creator.displayName}
      avatarUrl={creator.avatarUrl}
      badges={creator.badges}
      bio={creator.bio ?? "Tác giả này chưa thêm giới thiệu."}
      eyebrow="Hồ sơ tác giả"
      handle={creator.handle ? `@${creator.handle}` : "Tác giả trên ChapMee"}
      stats={creator.stats}
      title={
        profileHref ? (
          <Link className="hover:text-cyan-100" href={profileHref}>
            {creator.displayName}
          </Link>
        ) : (
          creator.displayName
        )
      }
    />
  );
}
