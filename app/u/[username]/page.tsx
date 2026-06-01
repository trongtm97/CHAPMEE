import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generateMetadata as generateCreatorMetadata } from "@/app/creators/[creatorId]/page";
import { CreatorPublicProfileView } from "@/components/creators/CreatorPublicProfileView";
import { getPublicCreatorProfile } from "@/lib/creators/getPublicCreatorProfile";
import { PublicProfilePage } from "@/components/profile/PublicProfilePage";
import { getPublicCreatorIdByUsername } from "@/lib/creators/getPublicCreatorIdByUsername";
import { getPublicProfileByUsername } from "@/lib/profile/get-public-profile";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { getPublicAuthorUsernames } from "@/lib/seo/static-params";
import type { PublicProfileTab } from "@/types/public-profile";

type PublicProfileRouteProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
};

const validTabs = new Set<PublicProfileTab>([
  "collections",
  "activity",
  "comments",
  "badges",
  "works"
]);

export async function generateMetadata({
  params
}: PublicProfileRouteProps): Promise<Metadata> {
  const { username } = await params;
  const creatorId = await getPublicCreatorIdByUsername(username);

  if (creatorId) {
    return generateCreatorMetadata({ params: Promise.resolve({ creatorId }) });
  }

  const data = await getPublicProfileByUsername(username);
  if (!data) {
    return {
      title: "Không tìm thấy hồ sơ",
      description: "Hồ sơ này không tồn tại hoặc không công khai.",
      robots: { index: false, follow: false }
    };
  }

  const canonical = buildCanonicalUrl(getProfileUrl(data.user.username) ?? `/u/${username}`);
  const title = `${data.user.displayName} | ChapMee`;

  return {
    title,
    description: data.user.bio ?? `Hồ sơ công khai của ${data.user.displayName} trên ChapMee.`,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description: data.user.bio ?? undefined,
      type: "profile",
      ...(canonical ? { url: canonical } : {})
    }
  };
}

export async function generateStaticParams() {
  const usernames = await getPublicAuthorUsernames();
  return usernames.map((username) => ({ username }));
}

export default async function PublicProfileRoute({
  params,
  searchParams
}: PublicProfileRouteProps) {
  const { username } = await params;
  const query = await searchParams;
  const creatorId = await getPublicCreatorIdByUsername(username);

  if (creatorId) {
    const result = await getPublicCreatorProfile(creatorId);
    if (!result.creator) {
      notFound();
    }
    return <CreatorPublicProfileView creator={result.creator} />;
  }

  const tab =
    query.tab && validTabs.has(query.tab as PublicProfileTab)
      ? (query.tab as PublicProfileTab)
      : "collections";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const data = await getPublicProfileByUsername(username, { tab, page });

  if (!data) {
    notFound();
  }

  return <PublicProfilePage activeTab={tab} data={data} page={page} />;
}
