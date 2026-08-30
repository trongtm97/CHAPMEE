import type { Metadata } from "next";
import { RankingsPageByType } from "@/components/rankings/RankingsPageByType";
import { findRankingTabBySlug } from "@/types/ranking-board";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

type RouteProps = {
  params: Promise<{ type: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { type } = await params;
  const tab = findRankingTabBySlug(type);
  return metadataForStaticRoute({
    path: `/bang-xep-hang/${type}`,
    pageType: "ranking",
    targetType: "ranking",
    fallbackTitle: `${tab.label} · Bảng xếp hạng ChapMee`,
    fallbackDescription: tab.description
  });
}

export default async function RankingsTypeRoute({ params }: RouteProps) {
  const { type } = await params;
  return <RankingsPageByType typeSlug={type} />;
}
