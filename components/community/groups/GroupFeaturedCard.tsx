import { StoryGroupCard } from "@/components/community/StoryGroupCard";
import { toStoryCommunityGroup } from "@/lib/community/group-mapper";
import type { CommunityGroupItem } from "@/types/community-group";

type GroupFeaturedCardProps = {
  group: CommunityGroupItem;
};

export function GroupFeaturedCard({ group }: GroupFeaturedCardProps) {
  return <StoryGroupCard group={toStoryCommunityGroup(group)} layout="carousel" />;
}
