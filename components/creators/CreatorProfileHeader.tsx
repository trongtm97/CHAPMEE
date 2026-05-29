import { CreatorFollowButton } from "@/components/creators/CreatorFollowButton";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import type { PublicCreatorProfile } from "@/lib/creators/getPublicCreatorProfile";

type CreatorProfileHeaderProps = {
  creator: PublicCreatorProfile;
  returnTo: string;
};

export function CreatorProfileHeader({
  creator,
  returnTo
}: CreatorProfileHeaderProps) {
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
      avatarName={creator.penName}
      avatarUrl={creator.avatarUrl}
      badges={creator.badges}
      bio={creator.bio ?? "Tác giả này chưa thêm giới thiệu."}
      eyebrow="Hồ sơ tác giả"
      handle={creator.handle ? `@${creator.handle}` : "Tác giả trên ChapMee"}
      stats={creator.stats}
      title={creator.penName}
    />
  );
}
