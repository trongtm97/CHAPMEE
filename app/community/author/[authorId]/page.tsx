import { notFound, permanentRedirect } from "next/navigation";
import { getUsernameByCreatorProfileId } from "@/lib/profile/get-username-by-creator-id";
import { getProfileTabUrl } from "@/lib/profile/profile-url";

export const dynamic = "force-dynamic";

type CommunityAuthorLegacyRouteProps = {
  params: Promise<{ authorId: string }>;
};

/** Legacy `/community/author/:creatorProfileId` → `/@username?tab=community`. */
export default async function CommunityAuthorLegacyRedirectPage({
  params
}: CommunityAuthorLegacyRouteProps) {
  const { authorId } = await params;
  const username = await getUsernameByCreatorProfileId(authorId);
  const target = getProfileTabUrl(username, "community") ?? null;

  if (target) {
    permanentRedirect(target);
  }

  notFound();
}
