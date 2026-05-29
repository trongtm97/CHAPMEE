import type { Metadata } from "next";
import { CommunityGroupsPage } from "@/components/community/groups/CommunityGroupsPage";
import { ErrorState } from "@/components/ui";
import { getCommunitySession } from "@/lib/community/get-community-feed";
import {
  getCommunityGroupsBundle,
  getMyCommunityGroups
} from "@/lib/community/get-community-groups";
import { normalizeCommunityGroupsParams } from "@/lib/community/community-groups-query";
import { buildCanonicalUrl } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

type CommunityGroupsIndexProps = {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    sort?: string;
    status?: string;
    tab?: string;
    page?: string;
    pageSize?: string;
  }>;
};

const pageDescription = "Tìm fandom từng truyện — thảo luận, review, poll và bình luận hot trên ChapMee.";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl("/community/groups");
  return {
    title: "Nhóm truyện",
    description: pageDescription,
    alternates: canonical ? { canonical } : undefined
  };
}

export default async function CommunityGroupsIndexPage({ searchParams }: CommunityGroupsIndexProps) {
  const raw = await searchParams;
  const params = normalizeCommunityGroupsParams({
    q: raw.q,
    genre: raw.genre,
    sort: raw.sort,
    status: raw.status,
    tab: raw.tab,
    page: raw.page,
    pageSize: raw.pageSize
  });

  const session = await getCommunitySession();
  const [bundle, myGroups] = await Promise.all([
    getCommunityGroupsBundle(params, session.userId),
    getMyCommunityGroups(session.userId)
  ]);
  const { recommended, ...catalog } = bundle;

  const showPersonalSections =
    !params.q && !params.genre && params.status === "all" && !params.tab;

  return (
    <section className="page-stack overflow-x-hidden">
      {catalog.error && catalog.items.length === 0 ? (
        <ErrorState message={catalog.error} title="Không thể tải nhóm" />
      ) : null}
      <CommunityGroupsPage
        catalog={catalog}
        isLoggedIn={session.isLoggedIn}
        myGroups={myGroups.groups}
        recommended={recommended}
        showPersonalSections={showPersonalSections}
      />
    </section>
  );
}
