import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProfilePage } from "@/components/profile/PublicProfilePage";
import { getPublicProfileByUsername } from "@/lib/profile/get-public-profile";
import { resolvePublicProfileTab } from "@/lib/profile/map-public-profile-tab";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { metadataForProfile } from "@/lib/seo/public-page-metadata";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { buildPersonJsonLd } from "@/lib/seo/structured-data";
import { getPublicAuthorUsernames } from "@/lib/seo/static-params";

export const dynamic = "force-dynamic";

type PublicProfileRouteProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; page?: string; sort?: string }>;
};

function normalizeWorksSort(raw: string | undefined) {
  if (raw === "published" || raw === "popular") {
    return raw;
  }
  return "updated" as const;
}

export async function generateMetadata({
  params
}: PublicProfileRouteProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicProfileByUsername(username);

  if (!data) {
    const { metadataFromSeoEngine } = await import("@/lib/seo/public-page-metadata");
    return metadataFromSeoEngine({
      path: getProfileUrl(username) ?? `/@${username}`,
      pageType: "profile",
      targetType: "profile",
      fallbackTitle: "Không tìm thấy hồ sơ | ChapMee",
      fallbackDescription: "Hồ sơ này không tồn tại hoặc không công khai.",
      indexableOverride: false,
      followOverride: false
    });
  }

  const profilePath = getProfileUrl(data.user.username) ?? `/@${data.user.username}`;

  return metadataForProfile({
    path: profilePath,
    displayName: data.user.displayName,
    username: data.user.username,
    bio: data.user.bio,
    avatarUrl: data.user.avatarUrl
  });
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
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);

  const worksSort = normalizeWorksSort(query.sort);

  const data = await getPublicProfileByUsername(username, {
    tab: query.tab,
    page,
    sort: worksSort
  });

  if (!data) {
    notFound();
  }

  const activeTab = resolvePublicProfileTab(query.tab, data.visibleTabs);
  const profilePath = getProfileUrl(data.user.username) ?? `/@${data.user.username}`;
  const canonicalProfileUrl = buildCanonicalUrl(profilePath) ?? profilePath;

  return (
    <>
      <PublicProfilePage
        activeTab={activeTab}
        data={data}
        page={page}
        worksSort={worksSort}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildPersonJsonLd({
              name: data.user.displayName,
              url: canonicalProfileUrl,
              description: data.user.bio,
              image: data.user.avatarUrl
            })
          )
        }}
      />
    </>
  );
}
